/**
 * GCS Business Intelligence Module
 * Fetches Google Business Profile data, web mentions, domain registry info,
 * IP geolocation, and web search snippets for pitch analysis.
 * Google Places API key required for GBP data (GOOGLE_PLACES_API_KEY in .env).
 * All checks degrade gracefully if keys are missing or requests fail.
 */

import Anthropic from "@anthropic-ai/sdk";
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
  // Filter out stop words BEFORE truncating — prevents "and"/"the" from wasting
  // one of the 3 core-name slots (which weakens verification to only 2 real words)
  const words = core.split(/\s+/).filter(w => w.length > 1 && !STOP_WORDS.has(w.toLowerCase()));
  if (words.length > 3) core = words.slice(0, 3).join(" ");
  else core = words.join(" ");
  return core || businessName;
}

// ─── Yelp probe (DDG search → direct URL slug probing fallback) ──────────────

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

export async function probeYelp(businessName: string, location?: string, phone?: string, address?: string): Promise<WebMention> {
  const base: WebMention = { source: "Yelp", url: null, rating: null, reviewCount: null, found: false, snippet: null };

  try {
    const loc = location || "";
    const coreName = extractCoreName(businessName);

    const yelpExclude = ["search", "writeareview", "signup", "login"];

    // 1 — Web search for Yelp listing WITH location
    // NOTE: Use "yelp.com" as keyword, NOT "site:yelp.com" — Claude web search ignores site: filter
    // Pass city + business name for verification (rejects wrong-city AND wrong-name results)
    const results = await webSearch(`yelp.com "${businessName}" ${loc}`.trim());
    console.log(`[yelp] Search returned ${results.length} URLs: ${results.slice(0, 3).map(r => r.link).join(", ")}`);
    const yelpUrl = findResultUrl(results, "yelp.com/biz/", yelpExclude, loc, businessName) || findResultUrl(results, "yelp.com/", yelpExclude, loc, businessName);
    if (yelpUrl) return { ...base, found: true, url: yelpUrl };

    // 2 — Search with core name variant
    if (coreName !== businessName) {
      const results2 = await webSearch(`yelp.com "${coreName}" ${loc}`.trim());
      const url2 = findResultUrl(results2, "yelp.com/biz/", yelpExclude, loc, coreName) || findResultUrl(results2, "yelp.com/", yelpExclude, loc, coreName);
      if (url2) return { ...base, found: true, url: url2 };
    }

    // 3 — Search WITHOUT location in query (wider net, but still verify city + name on results)
    if (loc) {
      const results3 = await webSearch(`yelp.com "${businessName}"`);
      const url3 = findResultUrl(results3, "yelp.com/biz/", yelpExclude, loc, businessName) || findResultUrl(results3, "yelp.com/", yelpExclude, loc, businessName);
      if (url3) return { ...base, found: true, url: url3 };
    }

    // 4 — Direct URL slug probing
    if (location) {
      const city = location.split(",")[0].trim();
      const slugVariants = [...new Set([makeYelpSlug(businessName, city), makeYelpSlug(coreName, city)])];
      for (const slugUrl of slugVariants) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 8000);
          const res = await fetch(slugUrl, {
            signal: controller.signal, redirect: "follow",
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", "Accept": "text/html" },
          });
          clearTimeout(timer);
          if (res.status === 200) return { ...base, found: true, url: slugUrl };
        } catch { /* try next */ }
      }
    }

    // 5 — Search with phone number (still verify name — phone could match a different business at same number)
    if (phone) {
      const results4 = await webSearch(`yelp.com "${phone}"`);
      const url4 = findResultUrl(results4, "yelp.com/biz/", yelpExclude, undefined, businessName) || findResultUrl(results4, "yelp.com/", yelpExclude, undefined, businessName);
      if (url4) return { ...base, found: true, url: url4 };
    }

    // 6 — Search with street address (registered under different name? — use core name verification
    //     to avoid accepting a completely unrelated business from another city)
    if (address) {
      const streetPart = address.split(",")[0].trim(); // "536 Tyler Street"
      if (streetPart) {
        const results5 = await webSearch(`yelp.com "${streetPart}"`);
        const url5 = findResultUrl(results5, "yelp.com/biz/", yelpExclude, loc || undefined, coreName) || findResultUrl(results5, "yelp.com/", yelpExclude, loc || undefined, coreName);
        if (url5) return { ...base, found: true, url: url5 };
      }
    }
  } catch { /* ignore */ }

  return base;
}

// ─── BBB probe (BBB Search API → Google/Claude fallback) ─────────────────────

export async function probeBBB(businessName: string, location?: string, phone?: string, address?: string): Promise<WebMention> {
  const base: WebMention = { source: "BBB", url: null, rating: null, reviewCount: null, found: false, snippet: null };

  try {
    const coreName = extractCoreName(businessName);
    const searchNames = [businessName];
    if (coreName !== businessName) searchNames.push(coreName);
    console.log(`[bbb] Searching for "${businessName}" (core: "${coreName}") in "${location || ""}" phone="${phone || ""}" addr="${address || ""}"`);

    // Helper: fuzzy name match — checks if business names share significant words
    const nameWords = (name: string) => name.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(w => w.length > 2);
    const fuzzyMatch = (a: string, b: string): boolean => {
      const wordsA = nameWords(a);
      const wordsB = nameWords(b);
      const shared = wordsA.filter(w => wordsB.some(w2 => w2.includes(w) || w.includes(w2)));
      return shared.length >= Math.min(2, wordsA.length); // at least 2 shared words (or all words if name is short)
    };

    // Helper: normalize phone for comparison — strip everything but digits
    const normalizePhone = (p: string) => p.replace(/\D/g, "").replace(/^1/, ""); // strip +1/1 prefix

    // Helper: match by phone number
    const phoneMatch = (resultPhone: string): boolean => {
      if (!phone || !resultPhone) return false;
      return normalizePhone(phone) === normalizePhone(resultPhone);
    };

    // Helper: match by street address — compare street number + street name
    const addressMatch = (resultAddr: string): boolean => {
      if (!address || !resultAddr) return false;
      // Extract just "536 Tyler" from "536 Tyler Street, Pittsfield, MA 01201, USA"
      const extractStreet = (a: string) => {
        const streetPart = a.split(",")[0].trim().toLowerCase();
        // Get number + first word of street name: "536 tyler street" → "536 tyler"
        const words = streetPart.split(/\s+/);
        if (words.length >= 2 && /^\d+$/.test(words[0])) return words[0] + " " + words[1];
        return streetPart;
      };
      return extractStreet(address) === extractStreet(resultAddr);
    };

    // Extended BBB result type — BBB API returns phone, address, city, state, etc.
    type BbbResult = {
      businessName?: string; reportUrl?: string; rating?: string; reviewCount?: number;
      phone?: string; address?: string; city?: string; state?: string; postalCode?: string;
    };

    // Helper: build result from BBB API match
    const buildResult = (r: BbbResult, matchType: string): WebMention => {
      const clean = (n: string) => (n ?? "").replace(/<[^>]+>/g, "");
      const profileUrl = r.reportUrl ? `https://www.bbb.org${r.reportUrl}` : null;
      const cleanName = clean(r.businessName ?? "");
      console.log(`[bbb] ${matchType} MATCH: "${cleanName}" city:${r.city || "?"} -> ${profileUrl}`);
      return { ...base, found: true, url: profileUrl, snippet: cleanName || null };
    };

    // Helper: verify BBB result is in the expected city (rejects wrong-city matches)
    const expectedCity = (location || "").split(",")[0].trim().toLowerCase(); // "Las Vegas, NV" → "las vegas"
    const cityVerify = (r: BbbResult): boolean => {
      if (!expectedCity || expectedCity.length < 3) return true; // No city to verify
      const rCity = (r.city ?? "").toLowerCase().trim();
      if (!rCity) return true; // BBB didn't return city — can't reject
      return rCity.includes(expectedCity) || expectedCity.includes(rCity);
    };

    // Helper: name match function (used in multiple steps)
    const clean = (n: string) => (n ?? "").replace(/<[^>]+>/g, "");
    const nameMatch = (r: BbbResult): boolean => {
      const rClean = clean(r.businessName ?? "");
      const rCore = extractCoreName(rClean);
      const coreL = coreName.toLowerCase();
      return rCore.toLowerCase().includes(coreL) || coreL.includes(rCore.toLowerCase())
        || rClean.toLowerCase().includes(coreL) || coreL.includes(rClean.toLowerCase());
    };

    // 1 — BBB Search API (returns structured JSON) — try name match first
    let allApiResults: BbbResult[] = [];
    for (const searchName of searchNames) {
      try {
        const apiParams = new URLSearchParams({ find_text: searchName, find_loc: location || "", find_type: "Category", page: "1", size: "10" });
        console.log(`[bbb] API call: find_text="${searchName}"`);
        const apiRes = await fetchWithTimeout(`https://www.bbb.org/api/search?${apiParams}`, 12000);
        console.log(`[bbb] API status: ${apiRes.status}`);
        if (apiRes.ok) {
          const data = (await apiRes.json()) as { results?: BbbResult[] };
          console.log(`[bbb] API returned ${data.results?.length ?? 0} results`);
          if (data.results && data.results.length > 0) {
            allApiResults = [...allApiResults, ...data.results];
            // Try name match WITH city verification first (strongest signal)
            const best = data.results.find((r) => nameMatch(r) && cityVerify(r))
              || data.results.find((r) => fuzzyMatch(clean(r.businessName ?? ""), businessName) && cityVerify(r));

            if (best) return buildResult(best, "NAME+CITY");

            // Log why matches were rejected
            const nameOnlyMatch = data.results.find((r) => nameMatch(r));
            if (nameOnlyMatch) {
              console.log(`[bbb] Name matched "${clean(nameOnlyMatch.businessName ?? "")}" but WRONG CITY: ${nameOnlyMatch.city || "?"} (expected "${expectedCity}")`);
            }
            console.log(`[bbb] No verified match. Top results: ${data.results.slice(0, 5).map(r => `"${clean(r.businessName ?? "")}" city:${r.city || "?"} ph:${r.phone || "?"}`).join(", ")}`);
          }
        }
      } catch (e) { console.log(`[bbb] API error: ${e instanceof Error ? e.message : e}`); }
    }

    // 1b — BBB API without location (wider net — still verify city on results if we know it)
    if (location) {
      try {
        const apiParams = new URLSearchParams({ find_text: businessName, find_loc: "", find_type: "Category", page: "1", size: "10" });
        console.log(`[bbb] API call (no-loc): find_text="${businessName}"`);
        const apiRes = await fetchWithTimeout(`https://www.bbb.org/api/search?${apiParams}`, 12000);
        if (apiRes.ok) {
          const data = (await apiRes.json()) as { results?: BbbResult[] };
          console.log(`[bbb] API (no-loc) returned ${data.results?.length ?? 0} results`);
          if (data.results && data.results.length > 0) {
            allApiResults = [...allApiResults, ...data.results];
            // Still verify city — wider search doesn't mean accept any city
            const best = data.results.find((r) => nameMatch(r) && cityVerify(r))
              || data.results.find((r) => fuzzyMatch(clean(r.businessName ?? ""), businessName) && cityVerify(r));

            if (best) return buildResult(best, "NAME (no-loc, city-verified)");

            // Log rejected matches
            const nameOnly = data.results.find((r) => nameMatch(r) || fuzzyMatch(clean(r.businessName ?? ""), businessName));
            if (nameOnly) {
              console.log(`[bbb] No-loc name matched "${clean(nameOnly.businessName ?? "")}" but WRONG CITY: ${nameOnly.city || "?"} (expected "${expectedCity}")`);
            }
          }
        }
      } catch (e) { console.log(`[bbb] API (no-loc) error: ${e instanceof Error ? e.message : e}`); }
    }

    // 2 — Phone/address matching on ALL collected API results (catches different business names)
    if (allApiResults.length > 0 && (phone || address)) {
      console.log(`[bbb] Trying phone/address match on ${allApiResults.length} API results...`);
      // Phone match first (most reliable)
      if (phone) {
        const phoneHit = allApiResults.find(r => phoneMatch(r.phone ?? ""));
        if (phoneHit) return buildResult(phoneHit, "PHONE");
      }
      // Address match (street number + street name)
      if (address) {
        const addrHit = allApiResults.find(r => {
          // BBB may return address as separate field, or combined
          const rAddr = [r.address, r.city, r.state].filter(Boolean).join(", ");
          return addressMatch(rAddr) || addressMatch(r.address ?? "");
        });
        if (addrHit) return buildResult(addrHit, "ADDRESS");
      }
    }

    // 3 — Search BBB API by phone number directly (still verify name+city to avoid wrong-business)
    if (phone) {
      try {
        const apiParams = new URLSearchParams({ find_text: phone, find_loc: "", find_type: "Category", page: "1", size: "5" });
        console.log(`[bbb] API call (phone): find_text="${phone}"`);
        const apiRes = await fetchWithTimeout(`https://www.bbb.org/api/search?${apiParams}`, 12000);
        if (apiRes.ok) {
          const data = (await apiRes.json()) as { results?: BbbResult[] };
          console.log(`[bbb] API (phone) returned ${data.results?.length ?? 0} results`);
          if (data.results && data.results.length > 0) {
            // Phone is a strong signal but still verify name+city to prevent wrong-business matches
            const best = data.results.find((r) => (nameMatch(r) || fuzzyMatch(clean(r.businessName ?? ""), businessName)) && cityVerify(r))
              || data.results.find((r) => nameMatch(r) || fuzzyMatch(clean(r.businessName ?? ""), businessName));
            if (best) return buildResult(best, "PHONE-SEARCH");
            console.log(`[bbb] Phone search returned results but none matched name: ${data.results.slice(0, 3).map(r => `"${clean(r.businessName ?? "")}"`).join(", ")}`);
          }
        }
      } catch (e) { console.log(`[bbb] API (phone) error: ${e instanceof Error ? e.message : e}`); }
    }

    // 4 — Web search fallback (Google/Claude/DDG)
    // NOTE: Use "bbb.org" as keyword, NOT "site:bbb.org" — Claude web search ignores site: filter
    // Pass city + business name for verification
    const loc = location || "";
    const bbbPattern = /bbb\.org\//;
    const results = await webSearch(`bbb.org "${businessName}" ${loc}`.trim());
    console.log(`[bbb] Search returned ${results.length} URLs: ${results.slice(0, 3).map(r => r.link).join(", ")}`);
    const bbbUrl = findResultUrl(results, bbbPattern, ["search", "/api/"], loc, businessName);
    if (bbbUrl) return { ...base, found: true, url: bbbUrl };

    // 5 — Search with core name
    if (coreName !== businessName) {
      const results2 = await webSearch(`bbb.org "${coreName}" ${loc}`.trim());
      const url2 = findResultUrl(results2, bbbPattern, ["search", "/api/"], loc, coreName);
      if (url2) return { ...base, found: true, url: url2 };
    }

    // 6 — Search WITHOUT location in query (wider net, but still verify city + name on results)
    if (loc) {
      const results3 = await webSearch(`bbb.org "${businessName}"`);
      console.log(`[bbb] No-location search returned ${results3.length} URLs: ${results3.slice(0, 3).map(r => r.link).join(", ")}`);
      const url3 = findResultUrl(results3, bbbPattern, ["search", "/api/"], loc, businessName);
      if (url3) return { ...base, found: true, url: url3 };
    }

    // 7 — Search by phone number on web (still verify name)
    if (phone) {
      const results4 = await webSearch(`bbb.org "${phone}"`);
      const url4 = findResultUrl(results4, bbbPattern, ["search", "/api/"], undefined, businessName);
      if (url4) return { ...base, found: true, url: url4 };
    }
  } catch { /* ignore */ }

  return base;
}

// ─── Web Search (Google Custom Search → Claude → DuckDuckGo fallback) ────────
// Uses Google Custom Search API (if GOOGLE_CSE_ID is set) for fast, reliable
// results — the same results you see when searching Google.
// Falls back to Claude API with web search tool (uses ANTHROPIC_API_KEY).
// Last resort: DuckDuckGo Lite (often rate-limited from server IPs).

type SearchResult = { title: string; link: string; snippet: string };

async function claudeSearch(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return [];

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      tools: [{ type: "web_search_20250305" as const, name: "web_search", max_uses: 1 }],
      messages: [{ role: "user", content: `Search the web for: ${query}\nReturn the top results as JSON: [{"title":"...","link":"https://...","snippet":"..."}]. Only JSON.` }],
    });

    // Extract URLs from web search tool results (server-side blocks)
    const results: SearchResult[] = [];
    for (const block of response.content) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const b = block as any;
      if (b.type === "web_search_tool_result" && Array.isArray(b.content)) {
        for (const item of b.content) {
          if (item.type === "web_search_result" && item.url) {
            results.push({ title: item.title || "", link: item.url, snippet: item.page_snippet || "" });
          }
        }
      }
    }
    if (results.length > 0) return results;

    // Fallback: parse Claude's text response for JSON array
    let text = "";
    for (const block of response.content) {
      if (block.type === "text") text += block.text;
    }
    const jsonMatch = text.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[0]) as SearchResult[]; } catch { /* ignore */ }
    }
  } catch (e) {
    console.log(`[search] Claude search error: ${e instanceof Error ? e.message : e}`);
  }
  return [];
}

async function ddgSearch(query: string): Promise<SearchResult[]> {
  try {
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}&kl=us-en`;
    const res = await proxiedFetch(url, {
      headers: { "User-Agent": ua, "Accept": "text/html", "Accept-Language": "en-US,en;q=0.9" },
      timeoutMs: 12000, maxRetries: 2,
    });
    if (res.status === 202 || !res.ok) return [];
    const html = await res.text();
    if (html.includes("cc=botnet") || html.includes("challenge-form")) return [];

    const links = [...html.matchAll(/<a[^>]+class="[^"]*result-link[^"]*"[^>]+href="([^"]+)"/gi)];
    const snippets = [...html.matchAll(/<td[^>]*class="[^"]*result-snippet[^"]*"[^>]*>([\s\S]*?)<\/td>/gi)];
    return links.map((m, i) => ({
      title: "",
      link: m[1],
      snippet: snippets[i]?.[1]?.replace(/<[^>]+>/g, " ").trim() || "",
    }));
  } catch { return []; }
}

/**
 * Unified web search: tries Google CSE → Claude → DDG.
 * Returns clean {title, link, snippet} results.
 */
async function webSearch(query: string): Promise<SearchResult[]> {
  // 1. Google Custom Search (if GOOGLE_CSE_ID is configured — optional)
  const googleKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
  const cseId = process.env.GOOGLE_CSE_ID;
  if (googleKey && cseId) {
    try {
      const params = new URLSearchParams({ key: googleKey, cx: cseId, q: query, num: "10" });
      const res = await fetchWithTimeout(`https://www.googleapis.com/customsearch/v1?${params}`, 10000);
      if (res.ok) {
        const data = (await res.json()) as { items?: { title: string; link: string; snippet: string }[] };
        const items = (data.items || []).map(item => ({ title: item.title || "", link: item.link || "", snippet: item.snippet || "" }));
        if (items.length > 0) {
          console.log(`[search] Google CSE returned ${items.length} results for: ${query}`);
          return items;
        }
      }
    } catch (e) { console.log(`[search] Google CSE error: ${e instanceof Error ? e.message : e}`); }
  }

  // 2. Claude with web search (primary — uses existing ANTHROPIC_API_KEY)
  let results = await claudeSearch(query);
  if (results.length > 0) {
    console.log(`[search] Claude returned ${results.length} results for: ${query}`);
    return results;
  }

  // 3. DuckDuckGo (last resort — often rate-limited from server)
  results = await ddgSearch(query);
  if (results.length > 0) {
    console.log(`[search] DDG returned ${results.length} results for: ${query}`);
  } else {
    console.log(`[search] All search engines failed for: ${query}`);
  }
  return results;
}

/** Find a URL in search results matching a domain pattern.
 *  When `verifyCity` is provided, prefer results whose title/snippet/URL contain that city.
 *  Falls back to first unverified match only if no city-matched result exists.
 */
// Helper: extract significant words from a business name (for verification)
// Filters out very short words and common suffixes
const STOP_WORDS = new Set(["the", "and", "inc", "llc", "ltd", "corp", "co", "of", "for", "dba"]);
function businessNameWords(name: string): string[] {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function findResultUrl(
  results: SearchResult[],
  domainPattern: string | RegExp,
  exclude: string[] = [],
  verifyCity?: string,
  verifyName?: string,
): string | null {
  let unverifiedMatch: string | null = null;
  const cityLower = verifyCity?.split(",")[0].trim().toLowerCase(); // "Las Vegas, NV" → "las vegas"
  const nameWords = verifyName ? businessNameWords(verifyName) : [];

  for (const r of results) {
    const link = r.link.toLowerCase();
    const matches = typeof domainPattern === "string" ? link.includes(domainPattern) : domainPattern.test(link);
    if (!matches) continue;
    if (exclude.some(ex => link.includes(ex))) continue;

    const text = `${r.title} ${r.snippet} ${r.link}`.toLowerCase();

    // Business name verification: require ALL significant words to match
    // e.g. "Integrity Tax Services" → must find "integrity" AND "tax" AND "services" in result
    if (nameWords.length > 0) {
      const matched = nameWords.filter(w => text.includes(w));
      if (matched.length < nameWords.length) {
        console.log(`[verify] Skipping "${r.title}" — name words matched ${matched.length}/${nameWords.length}: [${matched.join(",")}] missing [${nameWords.filter(w => !text.includes(w)).join(",")}]`);
        continue;
      }
    }

    // City verification: check title/snippet/URL for expected city
    if (cityLower && cityLower.length > 2) {
      const citySlug = cityLower.replace(/\s+/g, "-");
      if (text.includes(cityLower) || text.includes(citySlug)) {
        return r.link; // City + name verified match
      }
      if (!unverifiedMatch) unverifiedMatch = r.link;
      continue;
    }

    return r.link; // No city verification needed (name already verified above)
  }

  if (unverifiedMatch) {
    console.log(`[verify] Skipping unverified match ${unverifiedMatch} — city "${cityLower}" not found in result`);
  }
  return null;
}

export async function probePlatformPresence(businessName: string, websiteHtml?: string, location?: string, phone?: string, address?: string): Promise<WebMention[]> {
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

  // Helper: scan search results for platform URLs
  // Directory platforms need city + name verification to avoid wrong-business matches
  const cityLower = (location || "").split(",")[0].trim().toLowerCase();
  const citySlug = cityLower.replace(/\s+/g, "-");
  const needsCityVerify = new Set(["Yelp", "BBB", "Yellow Pages", "Angi", "Thumbtack", "Manta", "MapQuest", "TripAdvisor", "Foursquare"]);
  const needsNameVerify = new Set(["Yelp", "BBB", "Yellow Pages", "Angi", "Thumbtack", "Manta", "MapQuest", "TripAdvisor", "Foursquare", "Nextdoor"]);
  const bizNameWords = businessNameWords(businessName);

  function scanSearchResults(searchResults: SearchResult[]) {
    for (const p of platforms) {
      if (results.get(p.source)?.found) continue;
      for (const sr of searchResults) {
        const link = sr.link.toLowerCase();
        const matchesDomain = p.domains.some(d => link.includes(d));
        if (!matchesDomain) continue;
        if (p.exclude.some(ex => link.includes(ex))) continue;

        const text = `${sr.title} ${sr.snippet} ${sr.link}`.toLowerCase();

        // Business name verification for directory platforms — require ALL significant words
        if (needsNameVerify.has(p.source) && bizNameWords.length > 0) {
          const matched = bizNameWords.filter(w => text.includes(w));
          if (matched.length < bizNameWords.length) continue; // Wrong business name — skip
        }

        // City verification for directory platforms (avoids matching wrong city's business)
        if (needsCityVerify.has(p.source) && cityLower.length > 2) {
          if (!text.includes(cityLower) && !text.includes(citySlug)) {
            continue; // Wrong city — skip this result
          }
        }

        results.set(p.source, { ...results.get(p.source)!, found: true, url: sr.link, snippet: sr.snippet || null });
        break;
      }
    }
  }

  // ── SECONDARY SOURCE: Web search (Google/Claude) ──
  const locationPart = location || "";

  // Phase A: Broad queries (surfaces multiple platforms at once)
  const stillMissing = platforms.filter(p => !results.get(p.source)?.found).map(p => p.source);
  if (stillMissing.length > 0) {
    // Query 1: Business name + location
    const sr1 = await webSearch(`"${businessName}" ${locationPart}`.trim());
    scanSearchResults(sr1);

    // Query 2: Search by phone number
    if (phone) {
      const sr2 = await webSearch(`"${phone}" ${locationPart}`.trim());
      scanSearchResults(sr2);
    }

    // Query 3: Search by street address
    if (address) {
      const streetPart = address.split(",")[0].trim();
      if (streetPart) {
        const sr3 = await webSearch(`"${streetPart}" ${locationPart}`.trim());
        scanSearchResults(sr3);
      }
    }
  }

  // Phase B: Dedicated per-platform searches for still-missing platforms
  // Much more effective than broad queries — e.g. facebook.com "Business Name" Las Vegas
  const dedicatedPlatforms = [
    { source: "Facebook",    keyword: "facebook.com",    domain: "facebook.com" },
    { source: "Instagram",   keyword: "instagram.com",   domain: "instagram.com" },
    { source: "LinkedIn",    keyword: "linkedin.com",    domain: "linkedin.com" },
    { source: "Yellow Pages",keyword: "yellowpages.com", domain: "yellowpages.com" },
    { source: "Nextdoor",    keyword: "nextdoor.com",    domain: "nextdoor.com" },
    { source: "Angi",        keyword: "angi.com",        domain: "angi.com" },
    { source: "Thumbtack",   keyword: "thumbtack.com",   domain: "thumbtack.com" },
    { source: "Manta",       keyword: "manta.com",       domain: "manta.com" },
  ];

  for (const dp of dedicatedPlatforms) {
    if (results.get(dp.source)?.found) continue;

    const platformDef = platforms.find(p => p.source === dp.source);
    if (!platformDef) continue;

    try {
      const sr = await webSearch(`${dp.keyword} "${businessName}" ${locationPart}`.trim());
      const url = findResultUrl(sr, dp.domain, platformDef.exclude, locationPart || undefined, businessName);
      if (url) {
        results.set(dp.source, { ...results.get(dp.source)!, found: true, url, snippet: null });
        console.log(`[platform] Dedicated search found ${dp.source}: ${url}`);
      }
    } catch { /* ignore */ }
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

// ─── Web Search Mentions (Google/Claude/DDG) ──────────────────────────────────

async function fetchWebSearchMentions(businessName: string, domain: string): Promise<WebSearchMention[]> {
  const results: WebSearchMention[] = [];

  const queries = [`"${businessName}" reviews`, `"${businessName}" news`];

  for (const query of queries) {
    try {
      const searchResults = await webSearch(query);
      for (const sr of searchResults.slice(0, 3)) {
        if (sr.snippet && sr.snippet.length > 25) {
          results.push({ title: sr.title || query, snippet: sr.snippet.slice(0, 220), url: sr.link });
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
    // Step 1: Web search for Facebook page (Google/Claude/DDG)
    const searchResults = await webSearch(`facebook.com "${businessName}"`);
    const fbExclude = ["sharer", "login", "help", "groups", "watch", "events", "marketplace", "gaming", "stories", "/posts/", "/photos/"];
    const fbUrl = findResultUrl(searchResults, "facebook.com/", fbExclude);
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

  // ── PHASE 2: Platform probes WITH location context (parallel — no DDG rate limit) ──
  const [yelpResult, bbbResult, mentionsResult] = await Promise.allSettled([
    probeYelp(businessName, cityState, phone, google?.address ?? ""),
    probeBBB(businessName, cityState, phone, google?.address ?? ""),
    probePlatformPresence(businessName, websiteHtml, cityState, phone, google?.address ?? ""),
  ]);

  let yelp = yelpResult.status === "fulfilled" ? yelpResult.value : null;
  let bbb = bbbResult.status === "fulfilled" ? bbbResult.value : null;
  let mentions = mentionsResult.status === "fulfilled" ? mentionsResult.value : [];

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
