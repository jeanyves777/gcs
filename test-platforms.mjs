// Test all platform detection approaches
// Tests: Yelp slug, BBB API, and checks how other platforms are detected

// ─── Rate-limited DDG search ─────────────────────────────────────────────────
let _ddgQueue = Promise.resolve();
const DDG_GAP_MS = 3000; // 3s gap (safer for testing)

async function duckDuckGoSearch(query) {
  return new Promise((resolve) => {
    _ddgQueue = _ddgQueue
      .then(async () => {
        const html = await _ddgFetch(query);
        await new Promise((r) => setTimeout(r, DDG_GAP_MS));
        resolve(html);
      })
      .catch(() => resolve(""));
  });
}

async function _ddgFetch(query) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const url =
      "https://lite.duckduckgo.com/lite/?q=" +
      encodeURIComponent(query) +
      "&kl=us-en";
    const ts = new Date().toISOString().substring(11, 19);
    console.log(`[${ts}] DDG: ${query}`);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    clearTimeout(timer);
    if (res.status === 202) {
      console.log("  => DDG 202 (rate limited)");
      return "";
    }
    if (res.status < 200 || res.status >= 300) {
      console.log("  => DDG " + res.status);
      return "";
    }
    const html = await res.text();
    if (html.includes("cc=botnet") || html.includes("challenge-form")) {
      console.log("  => DDG botnet challenge");
      return "";
    }
    console.log(`  => DDG 200, ${html.length} chars`);
    return html;
  } catch (e) {
    clearTimeout(timer);
    console.log("  => DDG error: " + e.message);
    return "";
  }
}

// ─── BBB API Test ────────────────────────────────────────────────────────────

async function testBBBApi(businessName, location) {
  console.log(`\n=== BBB API: "${businessName}" in ${location} ===`);

  function extractCoreName(name) {
    let core = name
      .replace(
        /\b(LLC|Inc\.?|Corp\.?|Corporation|Company|Co\.?|Services|Solutions|Group|Associates|Enterprises|International|Ltd\.?)\b/gi,
        ""
      )
      .replace(/\s*[&,]\s*/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
    const words = core.split(/\s+/).filter((w) => w.length > 1);
    if (words.length > 3) core = words.slice(0, 3).join(" ");
    return core || name;
  }

  const coreName = extractCoreName(businessName);
  const searchNames = [businessName];
  if (coreName !== businessName) searchNames.push(coreName);

  for (const name of searchNames) {
    const params = new URLSearchParams({
      find_text: name,
      find_loc: location || "",
      find_type: "Category",
      page: "1",
      size: "5",
    });
    try {
      const res = await fetch(
        `https://www.bbb.org/api/search?${params}`,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; GCS-SalesBot/1.0)",
          },
        }
      );
      const data = await res.json();
      if (data.results?.length > 0) {
        const coreNameLower = coreName.toLowerCase();
        const best =
          data.results.find((r) => {
            const rCore = extractCoreName(r.businessName ?? "").toLowerCase();
            return (
              rCore.includes(coreNameLower) ||
              coreNameLower.includes(rCore)
            );
          }) ?? data.results[0];
        const cleanName = (best.businessName || "").replace(/<[^>]+>/g, "");
        console.log(`  FOUND: ${cleanName}`);
        console.log(`  URL: https://www.bbb.org${best.reportUrl}`);
        return true;
      }
    } catch (e) {
      console.log(`  API error: ${e.message}`);
    }
  }
  console.log("  NOT FOUND via BBB API");
  return false;
}

// ─── Yelp Slug Test ──────────────────────────────────────────────────────────

async function testYelpSlug(businessName, city) {
  console.log(`\n=== YELP SLUG: "${businessName}" in ${city} ===`);

  function makeSlug(name, c) {
    return (
      "https://www.yelp.com/biz/" +
      (name + " " + c)
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
    );
  }

  function extractCoreName(name) {
    let core = name
      .replace(
        /\b(LLC|Inc\.?|Corp\.?|Corporation|Company|Co\.?|Services|Solutions|Group|Associates|Enterprises|International|Ltd\.?)\b/gi,
        ""
      )
      .replace(/\s*[&,]\s*/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
    const words = core.split(/\s+/).filter((w) => w.length > 1);
    if (words.length > 3) core = words.slice(0, 3).join(" ");
    return core || name;
  }

  const coreName = extractCoreName(businessName);
  const slugs = [makeSlug(businessName, city)];
  if (coreName !== businessName) slugs.push(makeSlug(coreName, city));

  for (const slug of [...new Set(slugs)]) {
    console.log(`  Trying: ${slug}`);
    try {
      const res = await fetch(slug, {
        method: "GET",
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "text/html",
        },
      });
      console.log(`  Status: ${res.status}`);
      if (res.status === 200) {
        console.log("  FOUND!");
        return true;
      }
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  console.log("  NOT FOUND via slug probing");
  return false;
}

// ─── Broad DDG search for other platforms ────────────────────────────────────

async function testBroadPlatformSearch(businessName, location) {
  console.log(`\n=== BROAD PLATFORM SEARCH: "${businessName}" ${location} ===`);

  const platformDomains = {
    Facebook: "facebook.com",
    Instagram: "instagram.com",
    LinkedIn: "linkedin.com",
    TripAdvisor: "tripadvisor.com",
    Nextdoor: "nextdoor.com",
    "Google Maps": "google.com/maps",
    Yelp: "yelp.com",
    BBB: "bbb.org",
    Angi: "angi.com",
    Thumbtack: "thumbtack.com",
    "Yellow Pages": "yellowpages.com",
    Manta: "manta.com",
    MapQuest: "mapquest.com",
    Foursquare: "foursquare.com",
  };

  // Broad search
  const html = await duckDuckGoSearch(`"${businessName}" ${location}`);
  if (html) {
    console.log("  Results from broad search:");
    for (const [name, domain] of Object.entries(platformDomains)) {
      if (html.toLowerCase().includes(domain)) {
        // Try to extract the actual URL
        const urlPattern = new RegExp(
          `https?://[^"'\\s<>]*${domain.replace(/\./g, "\\.")}[^"'\\s<>]*`,
          "gi"
        );
        const urls = [...html.matchAll(urlPattern)]
          .map((m) => m[0])
          .filter((u) => !u.includes("duckduckgo"));
        console.log(
          `  ${name}: FOUND${urls.length > 0 ? " -> " + urls[0] : ""}`
        );
      }
    }
  } else {
    console.log("  DDG rate limited — no results");
  }

  // Social media search
  console.log("\n  Social media search:");
  const html2 = await duckDuckGoSearch(
    `"${businessName}" ${location} facebook instagram linkedin`
  );
  if (html2) {
    for (const [name, domain] of Object.entries(platformDomains)) {
      if (
        ["Facebook", "Instagram", "LinkedIn"].includes(name) &&
        html2.toLowerCase().includes(domain)
      ) {
        console.log(`  ${name}: FOUND`);
      }
    }
  } else {
    console.log("  DDG rate limited — no results");
  }
}

// ─── Direct platform URL probing ─────────────────────────────────────────────
// For platforms that have predictable URL patterns

async function testDirectPlatformProbes(businessName, city, state) {
  console.log(`\n=== DIRECT PLATFORM URL PROBING ===`);

  // Yellow Pages has a predictable URL: yellowpages.com/city-state/mip/business-name-XXXXX
  // We can search instead: yellowpages.com/search?search_terms=business&geo_location_terms=city,state
  console.log("\n  Yellow Pages search:");
  try {
    const ypUrl = `https://www.yellowpages.com/search?search_terms=${encodeURIComponent(businessName)}&geo_location_terms=${encodeURIComponent(city + ", " + state)}`;
    console.log(`  URL: ${ypUrl}`);
    const res = await fetch(ypUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html",
      },
    });
    console.log(`  Status: ${res.status}`);
    if (res.status === 200) {
      const html = await res.text();
      // Look for business listing links
      const bizLinks = [
        ...html.matchAll(/href="(\/[^"]*mip\/[^"]+)"/gi),
      ];
      if (bizLinks.length > 0) {
        console.log(
          `  FOUND: https://www.yellowpages.com${bizLinks[0][1]}`
        );
      } else {
        // Also check for organic results
        const hasResults =
          html.includes("business-name") || html.includes("listing");
        console.log(`  Has listing results: ${hasResults}`);
      }
    }
  } catch (e) {
    console.log(`  Error: ${e.message}`);
  }

  // Manta search
  console.log("\n  Manta search:");
  try {
    const mantaUrl = `https://www.manta.com/search?search_source=nav&search=${encodeURIComponent(businessName)}&search_location=${encodeURIComponent(city + ", " + state)}`;
    console.log(`  URL: ${mantaUrl}`);
    const res = await fetch(mantaUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html",
      },
      redirect: "follow",
    });
    console.log(`  Status: ${res.status}`);
    if (res.status === 200) {
      const html = await res.text();
      console.log(`  HTML length: ${html.length}`);
      // Look for business links
      const mantaLinks = [...html.matchAll(/href="(\/c\/[^"]+)"/gi)];
      if (mantaLinks.length > 0) {
        console.log(
          `  FOUND: https://www.manta.com${mantaLinks[0][1]}`
        );
      }
    }
  } catch (e) {
    console.log(`  Error: ${e.message}`);
  }
}

// ─── Run all tests ───────────────────────────────────────────────────────────

async function main() {
  const businessName = "Integrity Tax & Accounting Services";
  const location = "Pittsfield, MA";
  const city = "Pittsfield";
  const state = "MA";

  console.log("========================================");
  console.log("FULL PLATFORM DETECTION TEST");
  console.log(`Business: ${businessName}`);
  console.log(`Location: ${location}`);
  console.log("========================================");

  // 1. BBB API (no DDG needed)
  await testBBBApi(businessName, location);

  // 2. Yelp direct slug (no DDG needed)
  await testYelpSlug(businessName, city);

  // 3. Direct platform probes (no DDG needed)
  await testDirectPlatformProbes(businessName, city, state);

  // 4. Broad DDG search for remaining platforms (rate-limited)
  await testBroadPlatformSearch(businessName, location);

  console.log("\n========================================");
  console.log("TESTS COMPLETE");
  console.log("========================================");
}

main();
