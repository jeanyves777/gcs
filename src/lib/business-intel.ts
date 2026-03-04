/**
 * GCS Business Intelligence Module
 * Fetches Google Business Profile data, web mentions, domain registry info,
 * IP geolocation, and web search snippets for pitch analysis.
 * Google Places API key required for GBP data (GOOGLE_PLACES_API_KEY in .env).
 * All checks degrade gracefully if keys are missing or requests fail.
 */

import { proxiedFetch } from "./proxy-rotator";

const PLACES_BASE = "https://maps.googleapis.com/maps/api/place";

// ─── Types ────────────────────────────────────────────────────────────────────

export type GoogleReview = {
  rating: number;
  text: string;
  relativeTime: string;
  authorName: string;
};

export type GoogleBusinessProfile = {
  found: boolean;
  placeId: string | null;
  name: string | null;
  rating: number | null;
  reviewCount: number | null;
  ratingBenchmark: number;
  address: string | null;
  phone: string | null;
  website: string | null;
  googleMapsUrl: string | null;
  isOpenNow: boolean | null;
  weekdayHours: string[] | null;
  categories: string[];
  recentReviews: GoogleReview[];
};

export type WebMention = {
  source: string;
  url: string | null;
  rating: number | null;
  reviewCount: number | null;
  found: boolean;
  snippet: string | null;
};

export type DomainRegistry = {
  domain: string;
  registrar: string | null;
  registeredDate: string | null;
  expiryDate: string | null;
  domainAgeYears: number | null;
  registrantCountry: string | null;
  nameservers: string[];
  isPrivacyProtected: boolean;
};

export type IpGeoInfo = {
  ip: string;
  city: string | null;
  region: string | null;
  country: string | null;
  org: string | null;
  hosting: string | null;
};

export type WebSearchMention = {
  title: string;
  snippet: string;
  url: string;
};

export type FacebookDiscoveryResult = {
  found: boolean;
  facebookUrl: string | null;
  pageName: string | null;
  discoveredWebsite: string | null;
  about: string | null;
  likes: string | null;
};

export type BusinessIntelResults = {
  searchedAt: string;
  businessName: string;
  domain: string;
  google: GoogleBusinessProfile | null;
  yelp: WebMention | null;
  bbb: WebMention | null;
  otherMentions: WebMention[];
  domainRegistry: DomainRegistry | null;
  ipGeo: IpGeoInfo | null;
  webSearchMentions: WebSearchMention[];
  facebookDiscovery?: FacebookDiscoveryResult | null;
};

// ─── Benchmark ratings by category ───────────────────────────────────────────

const BENCHMARKS: [string, number][] = [
  ["restaurant", 4.5], ["food", 4.5], ["bar", 4.3], ["cafe", 4.4],
  ["bakery", 4.5], ["pizza", 4.4], ["grocery", 4.3], ["supermarket", 4.2],
  ["health", 4.6], ["doctor", 4.6], ["dental", 4.7], ["hospital", 4.3],
  ["pharmacy", 4.4], ["veterinarian", 4.7],
  ["beauty", 4.6], ["salon", 4.5], ["spa", 4.6], ["gym", 4.4],
  ["hotel", 4.4], ["lodging", 4.4], ["motel", 4.1],
  ["auto", 4.2], ["car", 4.2], ["mechanic", 4.3],
  ["retail", 4.3], ["store", 4.3], ["shop", 4.3],
  ["law", 4.6], ["attorney", 4.6], ["accounting", 4.6],
  ["real_estate", 4.5], ["insurance", 4.3],
  ["school", 4.5], ["church", 4.7],
  ["contractor", 4.4], ["plumber", 4.3], ["electrician", 4.4],
];

function getBenchmark(categories: string[]): number {
  const lower = categories.join(" ").toLowerCase();
  for (const [key, val] of BENCHMARKS) {
    if (lower.includes(key)) return val;
  }
  return 4.4;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, timeoutMs = 12000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GCS-SalesBot/1.0)" },
    });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

// ─── Google Places API ────────────────────────────────────────────────────────

async function searchGooglePlaces(
  businessName: string,
  websiteUrl: string
): Promise<GoogleBusinessProfile> {
  const notFound: GoogleBusinessProfile = {
    found: false, placeId: null, name: null, rating: null, reviewCount: null,
    ratingBenchmark: 4.4, address: null, phone: null, website: null,
    googleMapsUrl: null, isOpenNow: null, weekdayHours: null,
    categories: [], recentReviews: [],
  };

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return notFound;

  try {
    // Include the website domain in the search query to help Google find the
    // correct location when a business has multiple branches.
    let searchInput = businessName;
    let searchDomain = "";
    if (websiteUrl) {
      try {
        searchDomain = new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`).hostname.replace(/^www\./, "");
      } catch { /* ignore */ }
    }

    const findParams = new URLSearchParams({
      input: searchDomain ? `${businessName} ${searchDomain}` : businessName,
      inputtype: "textquery",
      fields: "place_id,name,rating,user_ratings_total,formatted_address",
      key: apiKey,
    });

    const findRes = await fetchWithTimeout(`${PLACES_BASE}/findplacefromtext/json?${findParams}`);
    const findData = await findRes.json() as {
      status: string;
      candidates?: { place_id: string; name: string; formatted_address?: string }[];
    };

    if (findData.status !== "OK" || !findData.candidates?.length) return notFound;

    // If multiple candidates, try to pick the one whose website matches ours
    let placeId = findData.candidates[0].place_id;
    if (findData.candidates.length > 1 && searchDomain) {
      // Quick-check each candidate's details to find matching website
      for (const candidate of findData.candidates.slice(0, 3)) {
        try {
          const checkParams = new URLSearchParams({
            place_id: candidate.place_id,
            fields: "website",
            key: apiKey,
          });
          const checkRes = await fetchWithTimeout(`${PLACES_BASE}/details/json?${checkParams}`);
          const checkData = await checkRes.json() as { result?: { website?: string } };
          const candidateWebsite = checkData.result?.website ?? "";
          if (candidateWebsite && candidateWebsite.includes(searchDomain)) {
            placeId = candidate.place_id;
            break;
          }
        } catch { /* continue to next candidate */ }
      }
    }

    const detailParams = new URLSearchParams({
      place_id: placeId,
      fields: [
        "name", "rating", "user_ratings_total", "formatted_address",
        "formatted_phone_number", "opening_hours", "url", "website",
        "reviews", "types",
      ].join(","),
      key: apiKey,
    });

    const detailRes = await fetchWithTimeout(`${PLACES_BASE}/details/json?${detailParams}`);
    const detailData = await detailRes.json() as {
      status: string;
      result?: {
        name: string; rating?: number; user_ratings_total?: number;
        formatted_address?: string; formatted_phone_number?: string;
        opening_hours?: { open_now?: boolean; weekday_text?: string[] };
        url?: string; website?: string; types?: string[];
        reviews?: {
          rating: number; text: string;
          relative_time_description: string; author_name: string;
        }[];
      };
    };

    if (detailData.status !== "OK" || !detailData.result) return notFound;
    const r = detailData.result;
    const categories = r.types ?? [];

    return {
      found: true,
      placeId,
      name: r.name ?? null,
      rating: r.rating ?? null,
      reviewCount: r.user_ratings_total ?? null,
      ratingBenchmark: getBenchmark(categories),
      address: r.formatted_address ?? null,
      phone: r.formatted_phone_number ?? null,
      website: r.website ?? null,
      googleMapsUrl: r.url ?? null,
      isOpenNow: r.opening_hours?.open_now ?? null,
      weekdayHours: r.opening_hours?.weekday_text ?? null,
      categories,
      recentReviews: (r.reviews ?? []).slice(0, 5).map((rev) => ({
        rating: rev.rating,
        text: (rev.text ?? "").slice(0, 400),
        relativeTime: rev.relative_time_description,
        authorName: rev.author_name,
      })),
    };
  } catch {
    return notFound;
  }
}

// ─── Helper: extract city/state from Google address ──────────────────────────

function extractCityState(address: string | null): string {
  if (!address) return "";
  // "123 Main St, Springfield, OH 45501, USA" → "Springfield, OH"
  const parts = address.split(",").map(s => s.trim());
  if (parts.length >= 3) {
    const city = parts[parts.length - 3];
    const stateZip = parts[parts.length - 2];
    const state = stateZip.replace(/\s*\d{5}(-\d{4})?$/, "").trim();
    if (city && state) return `${city}, ${state}`;
  }
  return "";
}

// ─── Helper: extract core business name for partial matching ─────────────────
// "Integrity Tax & Accounting Services" → "Integrity Tax"
// "Joe's Pizza & Wings LLC" → "Joe's Pizza"
// Catches name discrepancies across Yelp, BBB, Google, etc.

function extractCoreName(businessName: string): string {
  let core = businessName
    .replace(/\b(LLC|Inc\.?|Corp\.?|Corporation|Company|Co\.?|Services|Solutions|Group|Associates|Enterprises|International|Ltd\.?|Accounting|Bookkeeping|Consulting|Management|Professional|Agency|Firm|Partners|Practice)\b/gi, "")
    .replace(/\s*[&,]\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  const words = core.split(/\s+/).filter(w => w.length > 1);
  if (words.length > 3) core = words.slice(0, 3).join(" ");
  return core || businessName;
}

// ─── Yelp probe (DDG search → direct URL slug probing fallback) ──────────────

function extractYelpUrl(html: string): string | null {
  const patterns = [
    /https?:\/\/(?:www\.)?yelp\.com\/biz\/[a-z0-9_-]+/gi,
    /yelp\.com\/biz\/[a-z0-9_-]+/gi,
  ];
  for (const pattern of patterns) {
    const matches = [...html.matchAll(pattern)];
    for (const m of matches) {
      const url = m[0].startsWith("http") ? m[0] : `https://www.${m[0]}`;
      if (/\/(search|writeareview|signup|login)/.test(url)) continue;
      if (!url.includes("duckduckgo")) return url.split(/[?#&;]/)[0];
    }
  }
  return null;
}

function makeYelpSlug(name: string, city: string): string {
  return (
    "https://www.yelp.com/biz/" +
    (name + " " + city)
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
  );
}

export async function probeYelp(businessName: string, location?: string, phone?: string): Promise<WebMention> {
  const base: WebMention = { source: "Yelp", url: null, rating: null, reviewCount: null, found: false, snippet: null };

  try {
    const loc = location || "";

    // 1 — DuckDuckGo site search (most reliable when not rate-limited)
    const html = await duckDuckGoSearch(`site:yelp.com "${businessName}" ${loc}`.trim());
    if (html) {
      const url = extractYelpUrl(html);
      if (url) return { ...base, found: true, url };
    }

    // 2 — DDG with core name (catches name discrepancies)
    const coreName = extractCoreName(businessName);
    if (coreName !== businessName) {
      const html2 = await duckDuckGoSearch(`site:yelp.com "${coreName}" ${loc}`.trim());
      if (html2) {
        const url = extractYelpUrl(html2);
        if (url) return { ...base, found: true, url };
      }
    }

    // 3 — Direct URL slug probing (fallback when DDG is rate-limited)
    // Yelp URLs follow yelp.com/biz/business-name-city — we construct likely
    // slugs and check if the page exists (HTTP 200).
    // NOTE: Must use a browser-like UA — Yelp blocks bot UAs with 403.
    if (location) {
      const city = location.split(",")[0].trim();
      const slugVariants = [
        makeYelpSlug(businessName, city),
        makeYelpSlug(coreName, city),
      ];
      const unique = [...new Set(slugVariants)];
      for (const slugUrl of unique) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 8000);
          const res = await fetch(slugUrl, {
            signal: controller.signal,
            redirect: "follow",
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
          });
          clearTimeout(timer);
          if (res.status === 200) return { ...base, found: true, url: slugUrl };
        } catch { /* try next */ }
      }
    }

    // 4 — DDG with phone number (last resort)
    if (phone) {
      const html3 = await duckDuckGoSearch(`site:yelp.com "${phone}"`);
      if (html3) {
        const url = extractYelpUrl(html3);
        if (url) return { ...base, found: true, url };
      }
    }
  } catch { /* ignore */ }

  return base;
}

// ─── BBB probe (BBB Search API → DDG fallback) ──────────────────────────────

function extractBbbUrl(html: string): string | null {
  const patterns = [
    /https?:\/\/(?:www\.)?bbb\.org\/us\/[a-z]{2}\/[^"'\s<>]+/gi,
    /bbb\.org\/us\/[a-z]{2}\/[^"'\s<>]+/gi,
  ];
  for (const pattern of patterns) {
    const matches = [...html.matchAll(pattern)];
    for (const m of matches) {
      const url = m[0].startsWith("http") ? m[0] : `https://www.${m[0]}`;
      if (/\/search\b/.test(url)) continue;
      if (!url.includes("duckduckgo")) return url.split(/[?#&;]/)[0];
    }
  }
  return null;
}

export async function probeBBB(businessName: string, location?: string): Promise<WebMention> {
  const base: WebMention = { source: "BBB", url: null, rating: null, reviewCount: null, found: false, snippet: null };

  try {
    // 1 — BBB Search API (returns structured JSON — most reliable method)
    const coreName = extractCoreName(businessName);
    const searchNames = [businessName];
    if (coreName !== businessName) searchNames.push(coreName);
    console.log(`[bbb] Searching for "${businessName}" (core: "${coreName}") in "${location || ""}"`);

    for (const searchName of searchNames) {
      try {
        const apiParams = new URLSearchParams({
          find_text: searchName,
          find_loc: location || "",
          find_type: "Category",
          page: "1",
          size: "5",
        });
        console.log(`[bbb] API call: find_text="${searchName}"`);
        const apiRes = await fetchWithTimeout(
          `https://www.bbb.org/api/search?${apiParams}`,
          12000
        );
        console.log(`[bbb] API status: ${apiRes.status}`);
        if (apiRes.ok) {
          type BbbResult = {
            businessName?: string;
            reportUrl?: string;
            rating?: string;
            reviewCount?: number;
          };
          const data = (await apiRes.json()) as { results?: BbbResult[] };
          console.log(`[bbb] API returned ${data.results?.length ?? 0} results`);
          if (data.results && data.results.length > 0) {
            const coreNameLower = coreName.toLowerCase();
            const best = data.results.find((r) => {
              const rName = (r.businessName ?? "").replace(/<[^>]+>/g, "").toLowerCase();
              const rCore = extractCoreName(r.businessName ?? "").toLowerCase();
              return (
                rCore.includes(coreNameLower) ||
                coreNameLower.includes(rCore) ||
                rName.includes(coreNameLower) ||
                coreNameLower.includes(rName)
              );
            });

            if (best) {
              const profileUrl = best.reportUrl
                ? `https://www.bbb.org${best.reportUrl}`
                : null;
              const cleanName = (best.businessName ?? "").replace(/<[^>]+>/g, "");
              console.log(`[bbb] MATCH: "${cleanName}" -> ${profileUrl}`);
              return {
                ...base,
                found: true,
                url: profileUrl,
                snippet: cleanName || null,
              };
            }
            console.log(`[bbb] No name match. Top results: ${data.results.slice(0, 3).map(r => (r.businessName ?? "").replace(/<[^>]+>/g, "")).join(", ")}`);
          }
        }
      } catch (e) { console.log(`[bbb] API error: ${e instanceof Error ? e.message : e}`); }
    }

    // 2 — DDG site search fallback
    const loc = location || "";
    const html = await duckDuckGoSearch(`site:bbb.org "${businessName}" ${loc}`.trim());
    if (html) {
      const url = extractBbbUrl(html);
      if (url) return { ...base, found: true, url };
    }

    // 3 — DDG with core name
    if (coreName !== businessName) {
      const html2 = await duckDuckGoSearch(`site:bbb.org "${coreName}" ${loc}`.trim());
      if (html2) {
        const url = extractBbbUrl(html2);
        if (url) return { ...base, found: true, url };
      }
    }
  } catch { /* ignore */ }

  return base;
}

// ─── DuckDuckGo Search (with free IP rotation) ───────────────────────────────
// DDG rate-limits by source IP (HTTP 202 botnet challenge after 2-3 rapid
// requests from the same IP).  We route each request through a random free
// proxy so every request appears to come from a different IP address.
// If all proxies fail, we fall back to direct fetch with a safety gap.
//
// The serial queue is kept as a safety net — even with proxy rotation,
// hammering DDG from many IPs simultaneously could trigger other defenses.
// The gap is short (500 ms) since each request uses a different IP.

let _ddgQueue: Promise<void> = Promise.resolve();
const DDG_GAP_MS = 2000; // 2s gap between requests (safety net for direct fetch)

// Rotate User-Agent strings to look more natural
const _userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15",
];

async function duckDuckGoSearch(query: string, timeoutMs = 15000): Promise<string> {
  return new Promise<string>((resolve) => {
    _ddgQueue = _ddgQueue
      .then(async () => {
        const html = await _ddgFetch(query, timeoutMs);
        await new Promise((r) => setTimeout(r, DDG_GAP_MS));
        resolve(html);
      })
      .catch(() => {
        resolve("");
      });
  });
}

async function _ddgFetch(query: string, timeoutMs: number): Promise<string> {
  const ua = _userAgents[Math.floor(Math.random() * _userAgents.length)];
  const headers: Record<string, string> = {
    "User-Agent": ua,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  };

  try {
    const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}&kl=us-en`;

    // Route through rotating proxy (falls back to direct if no proxies)
    const res = await proxiedFetch(url, { headers, timeoutMs, maxRetries: 3 });

    // DDG returns 202 + botnet challenge page when it rate-limits
    if (res.status === 202) {
      console.log(`[business-intel] DDG 202 rate-limit for: ${query}`);
      return "";
    }
    if (!res.ok) return "";

    const html = await res.text();

    // Double-check: discard captcha/challenge pages
    if (html.includes("cc=botnet") || html.includes("challenge-form")) {
      console.log(`[business-intel] DDG botnet challenge for: ${query}`);
      return "";
    }

    return html;
  } catch {
    return "";
  }
}

async function probePlatformPresence(businessName: string, websiteHtml?: string, location?: string): Promise<WebMention[]> {
  const platforms = [
    { source: "Facebook",     domains: ["facebook.com"],     exclude: ["sharer", "login", "help", "groups", "watch", "events"], hrefPattern: /href=["'][^"']*facebook\.com\/(?!sharer|login|help|groups|watch|events)[^"']{3,}/i },
    { source: "Instagram",    domains: ["instagram.com"],    exclude: ["accounts/login"], hrefPattern: /href=["'][^"']*instagram\.com\/(?!accounts\/login)[^"']{3,}/i },
    { source: "LinkedIn",     domains: ["linkedin.com"],     exclude: ["login", "signup", "jobs/"], hrefPattern: /href=["'][^"']*linkedin\.com\/(?!login|signup|jobs\/)[^"']{3,}/i },
    { source: "TripAdvisor",  domains: ["tripadvisor.com"],  exclude: [], hrefPattern: /href=["'][^"']*tripadvisor\.com\/[^"']{3,}/i },
    { source: "Nextdoor",     domains: ["nextdoor.com"],     exclude: [], hrefPattern: /href=["'][^"']*nextdoor\.com\/[^"']{3,}/i },
    { source: "Google Maps",  domains: ["google.com/maps", "g.page", "maps.google.com", "goo.gl/maps"], exclude: [], hrefPattern: /(?:g\.page\/|maps\.google\.|goo\.gl\/maps|google\.com\/maps)/i },
    { source: "Yelp",         domains: ["yelp.com"],         exclude: ["search", "writeareview"], hrefPattern: /href=["'][^"']*yelp\.com\/biz\/[^"']{3,}/i },
    { source: "BBB",          domains: ["bbb.org"],          exclude: ["search"], hrefPattern: /href=["'][^"']*bbb\.org\/[^"']{3,}/i },
    { source: "Angi",         domains: ["angi.com"],         exclude: [], hrefPattern: /href=["'][^"']*angi\.com\/[^"']{3,}/i },
    { source: "Thumbtack",    domains: ["thumbtack.com"],    exclude: [], hrefPattern: /href=["'][^"']*thumbtack\.com\/[^"']{3,}/i },
    { source: "Yellow Pages", domains: ["yellowpages.com"],  exclude: ["search"], hrefPattern: /href=["'][^"']*yellowpages\.com\/[^"']{3,}/i },
    { source: "Manta",        domains: ["manta.com"],        exclude: ["search"], hrefPattern: /href=["'][^"']*manta\.com\/[^"']{3,}/i },
    { source: "MapQuest",     domains: ["mapquest.com"],     exclude: ["search"], hrefPattern: /href=["'][^"']*mapquest\.com\/[^"']{3,}/i },
    { source: "Foursquare",   domains: ["foursquare.com"],   exclude: ["login", "signup"], hrefPattern: /href=["'][^"']*foursquare\.com\/[^"']{3,}/i },
  ];

  const results = new Map<string, WebMention>();
  for (const p of platforms) {
    results.set(p.source, { source: p.source, url: null, rating: null, reviewCount: null, found: false, snippet: null });
  }

  // ── PRIMARY SOURCE: Scan website HTML for social/platform links ──
  // This is the most reliable source — the business's own website linking to their profiles.
  if (websiteHtml) {
    for (const p of platforms) {
      if (results.get(p.source)?.found) continue;
      if (p.hrefPattern.test(websiteHtml)) {
        // Extract the actual URL
        const urlMatch = websiteHtml.match(new RegExp(`href=["'](https?://[^"']*(?:${p.domains.map(d => d.replace(/\./g, "\\.")).join("|")})[^"']*)`, "i"));
        results.set(p.source, {
          ...results.get(p.source)!,
          found: true,
          url: urlMatch ? urlMatch[1] : null,
          snippet: "Found on website",
        });
      }
    }
  }

  // Helper to scan DuckDuckGo result HTML for platform URLs
  function scanForPlatforms(html: string) {
    const htmlLower = html.toLowerCase();
    const allLinks = [...html.matchAll(/href="(https?:\/\/[^"]+)"/gi)].map(m => m[1]);
    const textUrls = [...html.matchAll(/(https?:\/\/[^\s<"']+)/gi)].map(m => m[1]);
    const allUrls = [...new Set([...allLinks, ...textUrls])];

    for (const p of platforms) {
      if (results.get(p.source)?.found) continue;
      for (const domain of p.domains) {
        const matchUrl = allUrls.find(u => {
          const lower = u.toLowerCase();
          if (!lower.includes(domain)) return false;
          if (lower.includes("duckduckgo")) return false;
          if (p.exclude.some(ex => lower.includes(ex))) return false;
          return true;
        });
        if (matchUrl) {
          results.set(p.source, { ...results.get(p.source)!, found: true, url: matchUrl });
          break;
        }
        // Fallback: domain mentioned in text near business name
        if (htmlLower.includes(domain) && !results.get(p.source)?.found) {
          const domainIdx = htmlLower.indexOf(domain);
          const nearbyText = htmlLower.slice(Math.max(0, domainIdx - 200), domainIdx + 200);
          if (nearbyText.includes(businessName.toLowerCase().split(" ")[0].toLowerCase())) {
            results.set(p.source, { ...results.get(p.source)!, found: true });
            break;
          }
        }
      }
    }
  }

  // ── SECONDARY SOURCE: Broad DuckDuckGo search (surfaces local listings) ──
  // One well-crafted broad query surfaces Yelp, BBB, Facebook, YP, etc.
  // naturally — just like typing "Business Name City State" in Google.
  // We use 1-2 queries (sequential, rate-limited) instead of 3 parallel ones
  // to avoid tripping DDG's bot detection.
  const stillMissing = platforms.filter(p => !results.get(p.source)?.found).map(p => p.source);
  if (stillMissing.length > 0) {
    const locationPart = location || "";

    // Query 1: Business name + location (surfaces most listings)
    const html1 = await duckDuckGoSearch(`"${businessName}" ${locationPart}`.trim());
    if (html1) scanForPlatforms(html1);

    // Query 2: Only if still missing social platforms — targeted search
    const socialMissing = ["Facebook", "Instagram", "LinkedIn"].filter(p => !results.get(p)?.found);
    if (socialMissing.length > 0) {
      const html2 = await duckDuckGoSearch(`"${businessName}" ${locationPart} ${socialMissing.join(" ").toLowerCase()}`.trim());
      if (html2) scanForPlatforms(html2);
    }
  }

  return [...results.values()];
}

// ─── Domain Registry (RDAP) ───────────────────────────────────────────────────

async function fetchDomainRegistry(domain: string): Promise<DomainRegistry | null> {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 12000);

    const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GCS-SalesBot/1.0)",
        "Accept": "application/rdap+json, application/json",
      },
    });

    if (!res.ok) return null;

    type RdapEntity = {
      roles: string[];
      vcardArray?: [string, [string, Record<string, string>, string, string][]]
    };
    type RdapData = {
      entities?: RdapEntity[];
      events?: { eventAction: string; eventDate: string }[];
      nameservers?: { ldhName: string }[];
    };

    const data = await res.json() as RdapData;

    // Extract registrar name
    const registrarEntity = data.entities?.find((e) => e.roles?.includes("registrar"));
    const fnEntry = registrarEntity?.vcardArray?.[1]?.find((v) => v[0] === "fn");
    const registrar = fnEntry ? fnEntry[3] : null;

    // Extract dates
    const events = data.events ?? [];
    const registeredDate = events.find((e) => e.eventAction === "registration")?.eventDate ?? null;
    const expiryDate = events.find((e) => e.eventAction === "expiration")?.eventDate ?? null;

    // Domain age
    let domainAgeYears: number | null = null;
    if (registeredDate) {
      const regDate = new Date(registeredDate);
      if (!isNaN(regDate.getTime())) {
        domainAgeYears = Math.floor((Date.now() - regDate.getTime()) / (1000 * 60 * 60 * 24 * 365));
      }
    }

    // Nameservers
    const nameservers = (data.nameservers ?? []).map((ns) => (ns.ldhName ?? "").toLowerCase());

    // Privacy protection heuristic
    const registrantEntity = data.entities?.find((e) => e.roles?.includes("registrant"));
    const registrantJson = JSON.stringify(registrantEntity ?? "").toLowerCase();
    const isPrivacyProtected = !registrantEntity ||
      registrantJson.includes("privacy") || registrantJson.includes("redacted") ||
      registrantJson.includes("proxy") || registrantJson.includes("whoisguard");

    return {
      domain,
      registrar: typeof registrar === "string" ? registrar.slice(0, 80) : null,
      registeredDate: registeredDate ? new Date(registeredDate).toISOString().split("T")[0] : null,
      expiryDate: expiryDate ? new Date(expiryDate).toISOString().split("T")[0] : null,
      domainAgeYears,
      registrantCountry: null,
      nameservers,
      isPrivacyProtected,
    };
  } catch {
    return null;
  }
}

// ─── IP Geolocation ───────────────────────────────────────────────────────────

async function fetchIpGeo(ipAddress: string): Promise<IpGeoInfo | null> {
  if (!ipAddress || ipAddress === "0.0.0.0" || ipAddress === "unknown") return null;

  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`https://ipwho.is/${ipAddress}`, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GCS-SalesBot/1.0)" },
    });
    if (!res.ok) return null;

    const data = await res.json() as {
      success: boolean; city?: string; region?: string; country?: string;
      connection?: { org?: string; isp?: string };
    };

    if (!data.success) return null;

    const org = data.connection?.org ?? data.connection?.isp ?? null;
    const orgLower = (org ?? "").toLowerCase();
    let hosting: string | null = null;
    if (orgLower.includes("amazon") || orgLower.includes("aws")) hosting = "Amazon Web Services";
    else if (orgLower.includes("cloudflare")) hosting = "Cloudflare";
    else if (orgLower.includes("google")) hosting = "Google Cloud";
    else if (orgLower.includes("microsoft") || orgLower.includes("azure")) hosting = "Microsoft Azure";
    else if (orgLower.includes("digitalocean")) hosting = "DigitalOcean";
    else if (orgLower.includes("fastly")) hosting = "Fastly CDN";
    else if (orgLower.includes("shopify")) hosting = "Shopify";
    else if (orgLower.includes("wix")) hosting = "Wix";
    else if (orgLower.includes("squarespace")) hosting = "Squarespace";
    else if (orgLower.includes("godaddy")) hosting = "GoDaddy";
    else if (orgLower.includes("bluehost")) hosting = "Bluehost";
    else if (orgLower.includes("hostgator")) hosting = "HostGator";
    else if (orgLower.includes("siteground")) hosting = "SiteGround";
    else if (orgLower.includes("vercel")) hosting = "Vercel";
    else if (orgLower.includes("netlify")) hosting = "Netlify";
    else hosting = org;

    return {
      ip: ipAddress,
      city: data.city ?? null,
      region: data.region ?? null,
      country: data.country ?? null,
      org,
      hosting,
    };
  } catch {
    return null;
  }
}

// ─── Web Search Mentions (DuckDuckGo Lite) ────────────────────────────────────

async function fetchWebSearchMentions(businessName: string, domain: string): Promise<WebSearchMention[]> {
  const results: WebSearchMention[] = [];

  const queries = [
    `"${businessName}" reviews`,
    `"${businessName}" news`,
  ];

  for (const query of queries) {
    try {
      // Use the rate-limited DDG search (avoids 202 botnet blocks)
      const html = await duckDuckGoSearch(query);
      if (!html) continue;

      // Extract snippets from result-snippet cells
      const snippetMatches = [...html.matchAll(/<td[^>]*class="[^"]*result-snippet[^"]*"[^>]*>([\s\S]*?)<\/td>/gi)];
      const linkMatches = [...html.matchAll(/<a[^>]+class="[^"]*result-link[^"]*"[^>]+href="([^"]+)"/gi)];

      for (let i = 0; i < Math.min(2, snippetMatches.length); i++) {
        const snippet = snippetMatches[i][1].replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim();
        const link = linkMatches[i]?.[1] ?? "";
        if (snippet && snippet.length > 25 && !link.includes("duckduckgo")) {
          results.push({ title: query, snippet: snippet.slice(0, 220), url: link });
        }
      }
    } catch { /* ignore */ }
  }

  void domain;
  return results.slice(0, 4);
}

// ─── Facebook Page Discovery (for businesses without a website) ──────────────

export async function discoverFacebookPage(businessName: string): Promise<FacebookDiscoveryResult> {
  const notFound: FacebookDiscoveryResult = {
    found: false, facebookUrl: null, pageName: null,
    discoveredWebsite: null, about: null, likes: null,
  };

  try {
    // Step 1: DuckDuckGo site search for Facebook page (rate-limited)
    const html = await duckDuckGoSearch(`site:facebook.com "${businessName}"`);
    if (!html) return notFound;

    // Extract first Facebook page link from results
    const linkMatches = [...html.matchAll(/<a[^>]+class="[^"]*result-link[^"]*"[^>]+href="([^"]+)"/gi)];

    let fbUrl: string | null = null;
    for (const match of linkMatches) {
      const href = match[1];
      if (
        /facebook\.com\/(?!sharer|login|help|groups|watch|events|marketplace|gaming|stories)[^/\s"]{3,}/i.test(href) &&
        !href.includes("/posts/") &&
        !href.includes("/photos/")
      ) {
        fbUrl = href;
        break;
      }
    }

    if (!fbUrl) return notFound;

    // Step 2: Fetch the Facebook page to extract info
    let discoveredWebsite: string | null = null;
    let about: string | null = null;
    let pageName: string | null = null;
    let likes: string | null = null;

    try {
      const pageRes = await fetchWithTimeout(fbUrl, 8000);
      if (pageRes.ok) {
        const pageHtml = await pageRes.text();

        // Extract page name from og:title or <title>
        const ogTitle = pageHtml.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
        pageName = ogTitle?.[1] ?? null;
        if (!pageName) {
          const titleMatch = pageHtml.match(/<title[^>]*>([^<]+)<\/title>/i);
          pageName = titleMatch?.[1]?.replace(/\s*[|\-–—].*$/, "").trim() ?? null;
        }

        // Extract website URL from Facebook page (external links, not social platforms)
        const externalLinks = [...pageHtml.matchAll(/href=["'](https?:\/\/[^"']+)["']/gi)]
          .map(m => m[1])
          .filter(u =>
            !u.includes("facebook.com") && !u.includes("instagram.com") &&
            !u.includes("twitter.com") && !u.includes("youtube.com") &&
            !u.includes("google.com") && !u.includes("fbcdn.net") &&
            !u.includes("fbsbx.com") && !u.includes("l.facebook.com") &&
            /^https?:\/\/[a-z0-9][a-z0-9.-]+\.[a-z]{2,}/i.test(u)
          );
        if (externalLinks.length > 0) {
          discoveredWebsite = externalLinks[0];
        }

        // Also check og:see_also
        if (!discoveredWebsite) {
          const ogSeeAlso = pageHtml.match(/<meta[^>]*property=["']og:see_also["'][^>]*content=["'](https?:\/\/[^"']+)["']/i);
          if (ogSeeAlso?.[1] && !ogSeeAlso[1].includes("facebook.com")) {
            discoveredWebsite = ogSeeAlso[1];
          }
        }

        // Extract about/description
        const ogDesc = pageHtml.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
        about = ogDesc?.[1]?.slice(0, 500) ?? null;

        // Extract likes/followers count
        const likesMatch = pageHtml.match(/([\d,]+)\s*(?:people like|likes?|followers?)/i);
        likes = likesMatch?.[1] ?? null;
      }
    } catch { /* Facebook fetch failed — we still have the URL from DuckDuckGo */ }

    return { found: true, facebookUrl: fbUrl, pageName, discoveredWebsite, about, likes };
  } catch {
    return notFound;
  }
}

// ─── Prompt formatter ─────────────────────────────────────────────────────────

export function formatBusinessIntelForPrompt(results: BusinessIntelResults): string {
  const gbp = results.google;
  const yelp = results.yelp;
  const bbb = results.bbb;

  const mentionsList = results.otherMentions
    .map((m) => `${m.found ? "✅" : "❌"} ${m.source}${m.url ? ` — ${m.url}` : ""}`)
    .join("\n");

  const reviewsList = gbp?.recentReviews?.length
    ? gbp.recentReviews.map((r) =>
        `  ⭐ ${r.rating}/5 (${r.relativeTime}) — ${r.authorName}: "${r.text}"`
      ).join("\n")
    : "  No reviews available";

  const hoursList = gbp?.weekdayHours?.length
    ? gbp.weekdayHours.map((h) => `  ${h}`).join("\n")
    : "  Hours not available";

  const domainSection = results.domainRegistry ? `
--- DOMAIN REGISTRY (WHOIS/RDAP) ---
Domain Age: ${results.domainRegistry.domainAgeYears != null ? `${results.domainRegistry.domainAgeYears} years` : "Unknown"}
Registered: ${results.domainRegistry.registeredDate ?? "Unknown"}
Expires: ${results.domainRegistry.expiryDate ?? "Unknown"}
Registrar: ${results.domainRegistry.registrar ?? "Unknown"}
Privacy Protected: ${results.domainRegistry.isPrivacyProtected ? "Yes" : "No (owner info publicly exposed)"}
Nameservers: ${results.domainRegistry.nameservers.slice(0, 3).join(", ") || "Unknown"}` : "";

  const ipSection = results.ipGeo ? `
--- SERVER / HOSTING INTEL ---
IP Address: ${results.ipGeo.ip}
Hosting Provider: ${results.ipGeo.hosting ?? results.ipGeo.org ?? "Unknown"}
Server Location: ${[results.ipGeo.city, results.ipGeo.region, results.ipGeo.country].filter(Boolean).join(", ") || "Unknown"}` : "";

  const webSection = results.webSearchMentions.length > 0 ? `
--- WEB SEARCH MENTIONS ---
${results.webSearchMentions.map(m => `• ${m.snippet}${m.url ? ` [${m.url}]` : ""}`).join("\n")}` : "";

  const fbSection = results.facebookDiscovery?.found ? `
--- FACEBOOK PAGE DISCOVERY ---
Facebook Page: ${results.facebookDiscovery.facebookUrl}
Page Name: ${results.facebookDiscovery.pageName ?? "N/A"}
Website Found on FB: ${results.facebookDiscovery.discoveredWebsite ?? "None — business likely has NO website at all"}
About: ${results.facebookDiscovery.about ?? "N/A"}
Followers/Likes: ${results.facebookDiscovery.likes ?? "Unknown"}
NOTE: This business was found via Facebook because they have NO website. This is a MAJOR opportunity — they need a website built from scratch.` : "";

  return `--- GOOGLE BUSINESS PROFILE ---
${gbp?.found ? `✅ Google Business Profile FOUND
Name: ${gbp.name ?? "N/A"}
Rating: ${gbp.rating ?? "N/A"}/5.0 (${gbp.reviewCount ?? 0} reviews)
Industry Benchmark: ${gbp.ratingBenchmark}/5.0 — ${gbp.rating !== null ? (gbp.rating >= gbp.ratingBenchmark ? "✅ Above benchmark" : `❌ Below benchmark by ${(gbp.ratingBenchmark - gbp.rating).toFixed(1)} stars`) : "N/A"}
Address: ${gbp.address ?? "N/A"}
Phone: ${gbp.phone ?? "N/A"}
Website on GBP: ${gbp.website ?? "N/A"}
Google Maps: ${gbp.googleMapsUrl ?? "N/A"}
Status: ${gbp.isOpenNow === null ? "Unknown" : gbp.isOpenNow ? "🟢 Currently Open" : "🔴 Currently Closed"}

Business Hours:
${hoursList}

Recent Customer Reviews (reference specific reviews in pain points and talking points):
${reviewsList}

Categories: ${gbp.categories.filter(c => !c.startsWith("point_of_interest")).slice(0, 5).join(", ")}` : "❌ Google Business Profile NOT FOUND — major local SEO gap"}

--- YELP LISTING ---
${yelp?.found ? `✅ Yelp listing found — ${yelp.url}${yelp.rating ? ` — Rating: ${yelp.rating}/5 (${yelp.reviewCount ?? "?"} reviews)` : ""}` : "❌ No Yelp listing detected"}

--- BBB LISTING ---
${bbb?.found ? `✅ BBB listing found — ${bbb.url}${bbb.snippet ? ` — ${bbb.snippet}` : ""}` : "❌ No BBB listing detected"}

--- OTHER PLATFORM PRESENCE ---
${mentionsList || "No additional platform mentions detected"}
${domainSection}
${ipSection}
${webSection}
${fbSection}`;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function runBusinessIntel(
  businessName: string,
  websiteUrl: string,
  websiteHtml?: string
): Promise<BusinessIntelResults> {
  let domain = "";
  try {
    domain = new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`).hostname;
  } catch {
    domain = websiteUrl.replace(/^https?:\/\//, "").split("/")[0];
  }

  // ── PHASE 1: Google Places + independent tasks (parallel) ──
  // Google Places runs first so we can extract location & phone for Phase 2 probes.
  const [googleResult, rdapResult, ipResult, webSearchResult] =
    await Promise.allSettled([
      searchGooglePlaces(businessName, websiteUrl),
      fetchDomainRegistry(domain),
      (async (): Promise<IpGeoInfo | null> => {
        try {
          const dns = await import("dns");
          const { address } = await dns.promises.lookup(domain);
          return fetchIpGeo(address);
        } catch { return null; }
      })(),
      fetchWebSearchMentions(businessName, domain),
    ]);

  const google = googleResult.status === "fulfilled" ? googleResult.value : null;

  // Extract location & phone from Google Places for Phase 2 probes.
  // This dramatically improves Yelp/BBB/platform detection — searching by
  // name + location + phone catches businesses even with name discrepancies.
  const cityState = extractCityState(google?.address ?? null);
  const phone = google?.phone ?? "";

  // ── PHASE 2: Platform probes WITH location context ──
  // IMPORTANT: Run sequentially, NOT in parallel!  DuckDuckGo rate-limits
  // automated requests after 2-3 rapid calls (returns 202 botnet challenge).
  // The DDG queue serialises individual requests with 2.5 s gaps, but running
  // probes sequentially also avoids queueing 8+ requests that would take 20 s.

  // 2a. Yelp probe (1-3 DDG requests)
  let yelp: WebMention | null = null;
  try { yelp = await probeYelp(businessName, cityState, phone); } catch { /* ignore */ }

  // 2b. BBB probe (1-2 DDG requests)
  let bbb: WebMention | null = null;
  try { bbb = await probeBBB(businessName, cityState); } catch { /* ignore */ }

  // 2c. Broad platform presence (1-2 DDG requests + website HTML scan)
  let mentions: WebMention[] = [];
  try { mentions = await probePlatformPresence(businessName, websiteHtml, cityState); } catch { /* ignore */ }

  // If Google Places found the business, ensure Google Maps shows as found
  if (google?.found) {
    const gmIdx = mentions.findIndex(m => m.source === "Google Maps");
    if (gmIdx !== -1 && !mentions[gmIdx].found) {
      mentions[gmIdx] = { ...mentions[gmIdx], found: true, url: google.googleMapsUrl };
    }
  }

  // If dedicated Yelp probe found it, ensure Yelp shows as found in mentions
  if (yelp?.found) {
    const yelpIdx = mentions.findIndex(m => m.source === "Yelp");
    if (yelpIdx !== -1 && !mentions[yelpIdx].found) {
      mentions[yelpIdx] = { ...mentions[yelpIdx], found: true, url: yelp.url, rating: yelp.rating, reviewCount: yelp.reviewCount };
    }
  }

  // If dedicated BBB probe found it, ensure BBB shows as found in mentions
  if (bbb?.found) {
    const bbbIdx = mentions.findIndex(m => m.source === "BBB");
    if (bbbIdx !== -1 && !mentions[bbbIdx].found) {
      mentions[bbbIdx] = { ...mentions[bbbIdx], found: true, url: bbb.url, snippet: bbb.snippet };
    }
  }

  // Conversely: if platform presence found Yelp/BBB but dedicated probes missed, update dedicated results
  const yelpFromMentions = mentions.find(m => m.source === "Yelp");
  const bbbFromMentions = mentions.find(m => m.source === "BBB");
  const mergedYelp = yelp?.found ? yelp : (yelpFromMentions?.found ? yelpFromMentions : yelp);
  const mergedBbb = bbb?.found ? bbb : (bbbFromMentions?.found ? bbbFromMentions : bbb);

  return {
    searchedAt: new Date().toISOString(),
    businessName,
    domain,
    google,
    yelp: mergedYelp,
    bbb: mergedBbb,
    otherMentions: mentions,
    domainRegistry: rdapResult.status === "fulfilled" ? rdapResult.value : null,
    ipGeo: ipResult.status === "fulfilled" ? (ipResult.value ?? null) : null,
    webSearchMentions: webSearchResult.status === "fulfilled" ? webSearchResult.value : [],
  };
}
