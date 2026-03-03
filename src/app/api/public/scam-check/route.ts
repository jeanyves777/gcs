import { NextRequest, NextResponse } from "next/server";
import { checkUrlScam, checkEmailScam, detectInputType } from "@/lib/scam-check";

// ─── Rate limit: 5 checks/IP/hour ──────────────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;

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

function isPrivateUrl(input: string): boolean {
  try {
    const withProto = input.startsWith("http") ? input : `https://${input}`;
    const host = new URL(withProto).hostname;
    return (
      host === "localhost" ||
      host.endsWith(".local") ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      /^::1$/.test(host) ||
      host === "0.0.0.0"
    );
  } catch {
    return false;
  }
}

// ─── Route Handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const ip = getIp(req);
  const { allowed, remaining } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Max 5 checks per hour." },
      { status: 429, headers: { "X-RateLimit-Remaining": "0" } },
    );
  }

  let body: { input?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.input || typeof body.input !== "string") {
    return NextResponse.json({ error: "input is required" }, { status: 400 });
  }

  const trimmed = body.input.trim().slice(0, 500);
  const inputType = detectInputType(trimmed);
  if (!inputType) {
    return NextResponse.json(
      { error: "Please enter a valid website URL or email address." },
      { status: 400 },
    );
  }

  if (inputType === "url" && isPrivateUrl(trimmed)) {
    return NextResponse.json(
      { error: "Private or local addresses are not allowed." },
      { status: 400 },
    );
  }

  try {
    const result = inputType === "url"
      ? await checkUrlScam(trimmed)
      : await checkEmailScam(trimmed);

    return NextResponse.json(result, {
      headers: { "X-RateLimit-Remaining": String(remaining) },
    });
  } catch (err) {
    console.error("[scam-check] Error:", err);
    return NextResponse.json(
      { error: "Check failed. Please try again." },
      { status: 500 },
    );
  }
}
