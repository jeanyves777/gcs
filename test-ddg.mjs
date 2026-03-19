// Test script: Simulates the rate-limited DDG search queue
let _ddgQueue = Promise.resolve();
const DDG_GAP_MS = 2500;

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
    console.log(`[${ts}] Fetching: ${query}`);
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
      console.log("  => STATUS 202 (rate limited!)");
      return "";
    }
    if (res.status < 200 || res.status >= 300) {
      console.log("  => STATUS " + res.status + " (error)");
      return "";
    }

    const html = await res.text();
    if (html.includes("cc=botnet") || html.includes("challenge-form")) {
      console.log("  => BOTNET CHALLENGE detected");
      return "";
    }

    const hasResults = html.includes("result-link");
    console.log(
      `  => STATUS 200, has results: ${hasResults}, length: ${html.length}`
    );
    return html;
  } catch (e) {
    clearTimeout(timer);
    console.log("  => ERROR: " + e.message);
    return "";
  }
}

function extractYelpUrl(html) {
  const matches = [...html.matchAll(/yelp\.com\/biz\/[a-z0-9_-]+/gi)];
  for (const m of matches) {
    const url = "https://www." + m[0];
    if (/\/(search|writeareview|signup|login)/.test(url)) continue;
    if (!url.includes("duckduckgo")) return url.split(/[?#&;]/)[0];
  }
  return null;
}

function extractBbbUrl(html) {
  const matches = [...html.matchAll(/bbb\.org\/us\/[a-z]{2}\/[^"'\s<>]+/gi)];
  for (const m of matches) {
    const url = "https://www." + m[0];
    if (/\/search\b/.test(url)) continue;
    if (!url.includes("duckduckgo")) return url.split(/[?#&;]/)[0];
  }
  return null;
}

async function test() {
  const businessName = "Integrity Tax & Accounting Services";
  const location = "Pittsfield, MA";

  console.log("\n=== SIMULATING FULL PROBE SEQUENCE (with rate limiter) ===");
  console.log("Business: " + businessName);
  console.log("Location: " + location);
  console.log("");

  // Phase 2a: Yelp probe
  console.log("--- YELP PROBE ---");
  const yelpHtml = await duckDuckGoSearch(
    `site:yelp.com "${businessName}" ${location}`
  );
  const yelpUrl = yelpHtml ? extractYelpUrl(yelpHtml) : null;
  console.log(
    "  Yelp found: " + !!yelpUrl + (yelpUrl ? " => " + yelpUrl : "")
  );

  // Phase 2b: BBB probe
  console.log("\n--- BBB PROBE ---");
  const bbbHtml = await duckDuckGoSearch(
    `site:bbb.org "${businessName}" ${location}`
  );
  const bbbUrl = bbbHtml ? extractBbbUrl(bbbHtml) : null;
  console.log("  BBB found: " + !!bbbUrl + (bbbUrl ? " => " + bbbUrl : ""));

  // Phase 2c: Broad platform search
  console.log("\n--- BROAD PLATFORM SEARCH ---");
  const broadHtml = await duckDuckGoSearch(`"${businessName}" ${location}`);
  if (broadHtml) {
    const platforms = [
      "facebook.com",
      "instagram.com",
      "linkedin.com",
      "yelp.com",
      "bbb.org",
      "yellowpages.com",
      "manta.com",
    ];
    for (const domain of platforms) {
      if (broadHtml.toLowerCase().includes(domain)) {
        console.log("  Found mention: " + domain);
      }
    }
  } else {
    console.log("  No results from broad search");
  }

  // Phase 2c-2: Social media search
  console.log("\n--- SOCIAL MEDIA SEARCH ---");
  const socialHtml = await duckDuckGoSearch(
    `"${businessName}" ${location} facebook instagram linkedin`
  );
  if (socialHtml) {
    const platforms = ["facebook.com", "instagram.com", "linkedin.com"];
    for (const domain of platforms) {
      if (socialHtml.toLowerCase().includes(domain)) {
        console.log("  Found mention: " + domain);
      }
    }
  } else {
    console.log("  No results from social search");
  }

  console.log("\n=== DONE ===");
}

test();
