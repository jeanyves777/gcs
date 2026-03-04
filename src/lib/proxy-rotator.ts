/**
 * Free IP Rotation for web searches.
 *
 * Fetches free proxy lists, validates them in the background, and routes
 * requests through working proxies when available.  Falls back to direct
 * fetch seamlessly — the system never blocks or slows down because of
 * proxy issues.
 *
 * The proxy pool is built lazily (on first use) and refreshed in the
 * background every 15 minutes.  Validation runs in parallel and doesn't
 * block the caller.
 */

import { ProxyAgent } from "undici";

// ─── Pool state ───────────────────────────────────────────────────────────────

let _goodPool: string[] = [];
let _isBuilding = false;
let _lastBuildAt = 0;
const POOL_TTL_MS = 15 * 60 * 1000;
const _blacklist = new Set<string>();

// ─── Fetch raw proxy lists ────────────────────────────────────────────────────

async function fetchRawProxies(): Promise<string[]> {
  const all: string[] = [];

  // Source 1: ProxyScrape
  try {
    const res = await fetch(
      "https://api.proxyscrape.com/v4/free-proxy-list/get?request=display_proxies&protocol=http&proxy_format=protocolipport&format=json&anonymity=Elite,Anonymous&timeout=5000",
      { signal: AbortSignal.timeout(10_000) }
    );
    if (res.ok) {
      const data = (await res.json()) as { proxies?: { ip: string; port: number; alive: boolean }[] };
      all.push(...(data.proxies ?? []).filter((p) => p.alive).map((p) => `http://${p.ip}:${p.port}`));
    }
  } catch { /* ignore */ }

  // Source 2: SpeedX GitHub list
  try {
    const res = await fetch(
      "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt",
      { signal: AbortSignal.timeout(10_000) }
    );
    if (res.ok) {
      const text = await res.text();
      const lines = text.split("\n").filter((l) => /^\d+\.\d+\.\d+\.\d+:\d+$/.test(l.trim()));
      all.push(...lines.slice(0, 300).map((l) => `http://${l.trim()}`));
    }
  } catch { /* ignore */ }

  return [...new Set(all)].filter((p) => !_blacklist.has(p));
}

// ─── Validate a single proxy ──────────────────────────────────────────────────

async function validateProxy(proxyUrl: string): Promise<boolean> {
  try {
    const agent = new ProxyAgent(proxyUrl);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    const res = await fetch("https://httpbin.org/ip", {
      signal: controller.signal,
      // @ts-expect-error -- dispatcher is valid on Node.js undici-backed fetch
      dispatcher: agent,
    });
    clearTimeout(timer);
    if (!res.ok) return false;
    const data = (await res.json()) as { origin?: string };
    return !!data.origin; // proxy works if we get an IP back
  } catch {
    return false;
  }
}

// ─── Background pool builder (non-blocking) ──────────────────────────────────

function triggerPoolBuild(): void {
  if (_isBuilding) return;
  if (_goodPool.length > 3 && Date.now() - _lastBuildAt < POOL_TTL_MS) return;

  _isBuilding = true;
  (async () => {
    try {
      const raw = await fetchRawProxies();
      const sample = raw.sort(() => Math.random() - 0.5).slice(0, 60);

      const validated: string[] = [];
      // Test in batches of 15 (parallel)
      for (let i = 0; i < sample.length && validated.length < 8; i += 15) {
        const batch = sample.slice(i, i + 15);
        const results = await Promise.allSettled(
          batch.map(async (p) => ((await validateProxy(p)) ? p : null))
        );
        for (const r of results) {
          if (r.status === "fulfilled" && r.value) validated.push(r.value);
        }
      }

      if (validated.length > 0) {
        _goodPool = validated;
        _lastBuildAt = Date.now();
        console.log(`[proxy] Pool ready: ${_goodPool.length} working proxies`);
      } else {
        console.log("[proxy] No working proxies found — will use direct fetch");
      }
    } catch {
      console.log("[proxy] Pool build failed — will use direct fetch");
    } finally {
      _isBuilding = false;
    }
  })();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch through a rotating proxy if available, else direct.
 * NEVER blocks or slows down the caller — if no proxies are ready yet,
 * falls back to direct fetch immediately.
 */
export async function proxiedFetch(
  url: string,
  options: {
    headers?: Record<string, string>;
    timeoutMs?: number;
    maxRetries?: number;
  } = {}
): Promise<Response> {
  const { headers = {}, timeoutMs = 15_000, maxRetries = 2 } = options;

  // Trigger background pool build if needed (non-blocking)
  triggerPoolBuild();

  // Try proxies if we have any
  for (let attempt = 0; attempt < maxRetries && _goodPool.length > 0; attempt++) {
    const proxyUrl = _goodPool[Math.floor(Math.random() * _goodPool.length)];
    try {
      const agent = new ProxyAgent(proxyUrl);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, {
        signal: controller.signal,
        headers,
        // @ts-expect-error -- dispatcher is valid on Node.js undici-backed fetch
        dispatcher: agent,
      });
      clearTimeout(timer);

      if (res.status === 403 || res.status === 407 || res.status === 503 || res.status === 202) {
        _goodPool = _goodPool.filter((p) => p !== proxyUrl);
        _blacklist.add(proxyUrl);
        continue;
      }
      return res;
    } catch {
      _goodPool = _goodPool.filter((p) => p !== proxyUrl);
      _blacklist.add(proxyUrl);
    }
  }

  // Fallback: direct fetch
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, headers });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}
