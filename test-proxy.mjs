// Test the validated proxy rotation approach
import { ProxyAgent } from "undici";

let _goodPool = [];
const _blacklist = new Set();

async function fetchRawProxies() {
  const all = [];

  try {
    const res = await fetch(
      "https://api.proxyscrape.com/v4/free-proxy-list/get?request=display_proxies&protocol=http&proxy_format=protocolipport&format=json&anonymity=Elite,Anonymous&timeout=5000",
      { signal: AbortSignal.timeout(10000) }
    );
    if (res.ok) {
      const data = await res.json();
      const proxies = (data.proxies || [])
        .filter((p) => p.alive)
        .map((p) => `http://${p.ip}:${p.port}`);
      all.push(...proxies);
      console.log(`proxyscrape: ${proxies.length} raw`);
    }
  } catch (e) {
    console.log(`proxyscrape: ${e.message}`);
  }

  try {
    const res = await fetch(
      "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt",
      { signal: AbortSignal.timeout(10000) }
    );
    if (res.ok) {
      const text = await res.text();
      const lines = text
        .split("\n")
        .filter((l) => l.trim().match(/^\d+\.\d+\.\d+\.\d+:\d+$/));
      all.push(...lines.slice(0, 200).map((l) => `http://${l.trim()}`));
      console.log(`speedx: ${Math.min(lines.length, 200)} raw`);
    }
  } catch (e) {
    console.log(`speedx: ${e.message}`);
  }

  return [...new Set(all)];
}

async function validateProxy(proxyUrl) {
  try {
    const agent = new ProxyAgent(proxyUrl);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(
      "https://lite.duckduckgo.com/lite/?q=test&kl=us-en",
      {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "text/html",
        },
        dispatcher: agent,
      }
    );
    clearTimeout(timer);

    if (res.status !== 200) return false;
    const html = await res.text();
    return html.includes("result-link") && !html.includes("cc=botnet");
  } catch {
    return false;
  }
}

async function buildPool() {
  console.log("Fetching proxy lists...\n");
  const raw = await fetchRawProxies();
  console.log(`\nTotal raw: ${raw.length}`);

  // Shuffle and test batches of 20
  const sample = raw.sort(() => Math.random() - 0.5).slice(0, 80);
  console.log(`Testing ${sample.length} random proxies...\n`);

  const validated = [];
  let tested = 0;

  for (let i = 0; i < sample.length; i += 20) {
    const batch = sample.slice(i, i + 20);
    const start = Date.now();
    const results = await Promise.allSettled(
      batch.map(async (p) => {
        const ok = await validateProxy(p);
        return ok ? p : null;
      })
    );
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const good = results
      .filter((r) => r.status === "fulfilled" && r.value)
      .map((r) => r.value);
    tested += batch.length;
    validated.push(...good);
    console.log(
      `  Batch ${Math.floor(i / 20) + 1}: ${good.length}/${batch.length} working (${elapsed}s) | Total good: ${validated.length}`
    );

    if (validated.length >= 10) {
      console.log("  Got enough working proxies, stopping validation.");
      break;
    }
  }

  _goodPool = validated;
  console.log(`\nValidated pool: ${_goodPool.length} working proxies`);
  return validated;
}

async function ddgSearch(query) {
  const url =
    "https://lite.duckduckgo.com/lite/?q=" +
    encodeURIComponent(query) +
    "&kl=us-en";

  for (let i = 0; i < 2 && _goodPool.length > 0; i++) {
    const proxyUrl =
      _goodPool[Math.floor(Math.random() * _goodPool.length)];
    try {
      const agent = new ProxyAgent(proxyUrl);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "text/html",
        },
        dispatcher: agent,
      });
      clearTimeout(timer);
      if (res.status === 202) {
        console.log(`  ${proxyUrl.substring(7, 30)} -> 202 (removing)`);
        _goodPool = _goodPool.filter((p) => p !== proxyUrl);
        continue;
      }
      if (res.ok) {
        const html = await res.text();
        if (html.includes("cc=botnet")) {
          _goodPool = _goodPool.filter((p) => p !== proxyUrl);
          continue;
        }
        console.log(`  ${proxyUrl.substring(7, 30)} -> 200 OK`);
        return html;
      }
    } catch {
      _goodPool = _goodPool.filter((p) => p !== proxyUrl);
    }
  }
  return "";
}

async function main() {
  console.log("=== PROXY POOL VALIDATION TEST ===\n");
  await buildPool();

  if (_goodPool.length === 0) {
    console.log("\nNo working proxies found. Exiting.");
    return;
  }

  console.log("\n=== DDG SEARCH THROUGH PROXIES ===\n");

  const queries = [
    'site:yelp.com "Integrity Tax" Pittsfield MA',
    'site:bbb.org "Integrity Tax" Pittsfield MA',
  ];

  for (const q of queries) {
    console.log(`Query: ${q}`);
    const html = await ddgSearch(q);
    if (html) {
      const yelp = [...html.matchAll(/yelp\.com\/biz\/[a-z0-9_-]+/gi)];
      const bbb = [...html.matchAll(/bbb\.org\/us\/[a-z]{2}\/[^"'\s<>]+/gi)];
      if (yelp.length) console.log("  YELP:", yelp.map((m) => m[0])[0]);
      if (bbb.length) console.log("  BBB:", bbb.map((m) => m[0])[0]);
      if (!yelp.length && !bbb.length)
        console.log("  (results but no yelp/bbb URLs)");
    } else {
      console.log("  FAILED - no results");
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\nPool remaining: ${_goodPool.length}`);
}

main();
