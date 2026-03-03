import { NextRequest, NextResponse } from "next/server";
import { runPublicScan } from "@/lib/pentest";

// ─── In-memory rate limit: 5 scans/IP/hour ─────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }
  if (entry.count >= RATE_LIMIT) return { allowed: false, remaining: 0 };
  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT - entry.count };
}

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function normalizeUrl(input: string): string | null {
  try {
    const withProto = input.startsWith("http://") || input.startsWith("https://")
      ? input
      : `https://${input}`;
    const parsed = new URL(withProto);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    const host = parsed.hostname;
    // Block private / localhost
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      /^::1$/.test(host) ||
      host === "0.0.0.0"
    ) return null;
    return withProto;
  } catch {
    return null;
  }
}

// ─── Route Handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Rate limiting
  const ip = getIp(req);
  const { allowed, remaining } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Max 5 scans per hour." },
      { status: 429, headers: { "X-RateLimit-Remaining": "0" } }
    );
  }

  // Parse + validate URL
  let body: { url?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }
  if (!body.url || typeof body.url !== "string") {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }
  const normalizedUrl = normalizeUrl(body.url.trim());
  if (!normalizedUrl) {
    return NextResponse.json({ error: "Invalid or private URL. Please enter a public website URL." }, { status: 400 });
  }

  // Run safe public scan
  try {
    const result = await runPublicScan(normalizedUrl);
    return NextResponse.json(result, {
      headers: { "X-RateLimit-Remaining": String(remaining) },
    });
  } catch (err) {
    console.error("[public-scan] Error:", err);
    return NextResponse.json(
      { error: "Scan failed. Please try again with a different URL." },
      { status: 500 }
    );
  }
}
