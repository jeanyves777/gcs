import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isGCSStaff } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { compare, hash } from "bcryptjs";
import { createHmac, randomBytes } from "crypto";

const SECRET = process.env.NEXTAUTH_SECRET || "gcsguard-ai-secret";

function signToken(userId: string): string {
  const payload = `${userId}:${Date.now() + 3600000}`; // 1 hour
  const sig = createHmac("sha256", SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

export function verifyToken(token: string): { valid: boolean; userId?: string } {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const parts = decoded.split(":");
    if (parts.length !== 3) return { valid: false };
    const [userId, exp, sig] = parts;
    const expected = createHmac("sha256", SECRET).update(`${userId}:${exp}`).digest("hex");
    if (sig !== expected) return { valid: false };
    if (Date.now() > Number(exp)) return { valid: false };
    return { valid: true, userId };
  } catch {
    return { valid: false };
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !isGCSStaff(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { action, pin } = await req.json();

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, aiPinHash: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (action === "check") {
    return NextResponse.json({ hasPin: !!user.aiPinHash });
  }

  if (action === "set") {
    if (!pin || typeof pin !== "string" || pin.length < 4 || pin.length > 6) {
      return NextResponse.json({ error: "PIN must be 4-6 digits" }, { status: 400 });
    }
    if (user.aiPinHash) {
      return NextResponse.json({ error: "PIN already set. Use reset." }, { status: 400 });
    }
    const hashed = await hash(pin, 10);
    await db.user.update({ where: { id: user.id }, data: { aiPinHash: hashed } });
    const token = signToken(user.id);
    return NextResponse.json({ success: true, sessionToken: token });
  }

  if (action === "verify") {
    if (!pin || !user.aiPinHash) {
      return NextResponse.json({ error: "Invalid PIN" }, { status: 400 });
    }
    const valid = await compare(pin, user.aiPinHash);
    if (!valid) {
      return NextResponse.json({ error: "Wrong PIN" }, { status: 401 });
    }
    const token = signToken(user.id);
    return NextResponse.json({ valid: true, sessionToken: token });
  }

  if (action === "reset") {
    if (!pin || typeof pin !== "string" || pin.length < 4 || pin.length > 6) {
      return NextResponse.json({ error: "PIN must be 4-6 digits" }, { status: 400 });
    }
    const hashed = await hash(pin, 10);
    await db.user.update({ where: { id: user.id }, data: { aiPinHash: hashed } });
    const token = signToken(user.id);
    return NextResponse.json({ success: true, sessionToken: token });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
