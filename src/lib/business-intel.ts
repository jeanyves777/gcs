/**
 * GCS Business Intelligence Module
 * Fetches Google Business Profile data, web mentions, domain registry info,
 * IP geolocation, and web search snippets for pitch analysis.
 * Google Places API key required for GBP data (GOOGLE_PLACES_API_KEY in .env).
 * All checks degrade gracefully if keys are missing or requests fail.
 */

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

async function fetchWithTimeout(url: string, timeoutMs = 6000): Promise<Response> {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, {
    signal: controller.signal,
    headers: { "User-Agent": "Mozilla/5.0 (compatible; GCS-SalesBot/1.0)" },
  });
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
    const findParams = new URLSearchParams({
      input: businessName,
      inputtype: "textquery",
      fields: "place_id,name,rating,user_ratings_total",
      key: apiKey,
    });

    const findRes = await fetchWithTimeout(`${PLACES_BASE}/findplacefromtext/json?${findParams}`);
    const findData = await findRes.json() as {
      status: string;
      candidates?: { place_id: string; name: string }[];
    };

    if (findData.status !== "OK" || !findData.candidates?.length) return notFound;

    const placeId = findData.candidates[0].place_id;

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

// ─── Yelp probe ───────────────────────────────────────────────────────────────

async function probeYelp(businessName: string): Promise<WebMention> {
  const base: WebMention = { source: "Yelp", url: null, rating: null, reviewCount: null, found: false, snippet: null };

  try {
    const slug = businessName.toLowerCase()
      .replace(/[^a-z0-9\s]+/g, "").replace(/\s+/g, "-").replace(/^-|-$/g, "");

    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`https://www.yelp.com/biz/${slug}`, {
      method: "HEAD",
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      redirect: "follow",
    });

    if (res.status === 200 && res.url.includes("yelp.com/biz/")) {
      return { ...base, found: true, url: res.url };
    }

    const searchController = new AbortController();
    setTimeout(() => searchController.abort(), 5000);
    const searchRes = await fetch(
      `https://www.yelp.com/search?find_desc=${encodeURIComponent(businessName)}`,
      { signal: searchController.signal, headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } }
    );
    const html = await searchRes.text();
    const bizMatch = html.match(/href="(\/biz\/[^"?]+)"/);
    if (bizMatch) {
      const ratingMatch = html.match(/"ratingValue":\s*"?([\d.]+)"?/);
      const countMatch  = html.match(/"reviewCount":\s*"?(\d+)"?/);
      return {
        ...base, found: true,
        url: `https://www.yelp.com${bizMatch[1]}`,
        rating: ratingMatch ? parseFloat(ratingMatch[1]) : null,
        reviewCount: countMatch ? parseInt(countMatch[1]) : null,
      };
    }
  } catch { /* ignore */ }

  return base;
}

// ─── BBB probe ────────────────────────────────────────────────────────────────

async function probeBBB(businessName: string): Promise<WebMention> {
  const base: WebMention = { source: "BBB", url: null, rating: null, reviewCount: null, found: false, snippet: null };

  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000);

    const searchUrl = `https://www.bbb.org/search?find_text=${encodeURIComponent(businessName)}`;
    const res = await fetch(searchUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    const html = await res.text();

    const bbbMatch = html.match(/href="(https:\/\/www\.bbb\.org\/us\/[^"]+)"/);
    const ratingMatch = html.match(/class="[^"]*rating[^"]*"[^>]*>\s*(A\+?|B\+?|C\+?|D\+?|F)/i);

    if (bbbMatch) {
      return {
        ...base, found: true, url: bbbMatch[1],
        snippet: ratingMatch ? `BBB Rating: ${ratingMatch[1]}` : null,
      };
    }
  } catch { /* ignore */ }

  return base;
}

// ─── Other mentions from website HTML ────────────────────────────────────────

async function probeOtherMentions(businessName: string, html: string): Promise<WebMention[]> {
  const results: WebMention[] = [];

  const platforms = [
    { source: "TripAdvisor",  pattern: /href=["'][^"']*tripadvisor\.com\/[^"']{5,}/i },
    { source: "Facebook",     pattern: /href=["'][^"']*facebook\.com\/(?!sharer)[^"']{3,}/i },
    { source: "Instagram",    pattern: /href=["'][^"']*instagram\.com\/[^"']{3,}/i },
    { source: "LinkedIn",     pattern: /href=["'][^"']*linkedin\.com\/company\/[^"']{3,}/i },
    { source: "Nextdoor",     pattern: /href=["'][^"']*nextdoor\.com\/[^"']{3,}/i },
    { source: "Google Maps",  pattern: /(?:g\.page\/|maps\.google\.|goo\.gl\/maps|google\.com\/maps)/i },
    { source: "Yelp",         pattern: /href=["'][^"']*yelp\.com\/biz\/[^"']{3,}/i },
    { source: "Angi",         pattern: /href=["'][^"']*angi\.com\/[^"']{3,}/i },
    { source: "Houzz",        pattern: /href=["'][^"']*houzz\.com\/[^"']{3,}/i },
    { source: "Thumbtack",    pattern: /href=["'][^"']*thumbtack\.com\/[^"']{3,}/i },
    { source: "Healthgrades", pattern: /href=["'][^"']*healthgrades\.com\/[^"']{3,}/i },
    { source: "Zocdoc",       pattern: /href=["'][^"']*zocdoc\.com\/[^"']{3,}/i },
  ];

  for (const { source, pattern } of platforms) {
    const match = html.match(pattern);
    if (match) {
      const urlMatch = match[0].match(/href=["']([^"']+)/);
      results.push({ source, url: urlMatch?.[1] ?? null, rating: null, reviewCount: null, found: true, snippet: null });
    } else {
      results.push({ source, url: null, rating: null, reviewCount: null, found: false, snippet: null });
    }
  }

  void businessName;
  return results;
}

// ─── Domain Registry (RDAP) ───────────────────────────────────────────────────

async function fetchDomainRegistry(domain: string): Promise<DomainRegistry | null> {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 7000);

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
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 6000);

      const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}&kl=us-en`;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "text/html",
        },
      });
      if (!res.ok) continue;
      const html = await res.text();

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
${webSection}`;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function runBusinessIntel(
  businessName: string,
  websiteUrl: string,
  websiteHtml: string = ""
): Promise<BusinessIntelResults> {
  let domain = "";
  try {
    domain = new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`).hostname;
  } catch {
    domain = websiteUrl.replace(/^https?:\/\//, "").split("/")[0];
  }

  const [googleResult, yelpResult, bbbResult, mentionResults, rdapResult, ipResult, webSearchResult] =
    await Promise.allSettled([
      searchGooglePlaces(businessName, websiteUrl),
      probeYelp(businessName),
      probeBBB(businessName),
      probeOtherMentions(businessName, websiteHtml),
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

  return {
    searchedAt: new Date().toISOString(),
    businessName,
    domain,
    google: googleResult.status === "fulfilled" ? googleResult.value : null,
    yelp: yelpResult.status === "fulfilled" ? yelpResult.value : null,
    bbb: bbbResult.status === "fulfilled" ? bbbResult.value : null,
    otherMentions: mentionResults.status === "fulfilled" ? mentionResults.value : [],
    domainRegistry: rdapResult.status === "fulfilled" ? rdapResult.value : null,
    ipGeo: ipResult.status === "fulfilled" ? (ipResult.value ?? null) : null,
    webSearchMentions: webSearchResult.status === "fulfilled" ? webSearchResult.value : [],
  };
}
