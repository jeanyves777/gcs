import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";

const API_KEY_PREFIX = "gk_";

export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = API_KEY_PREFIX + randomBytes(36).toString("hex");
  const hash = hashApiKey(raw);
  const prefix = raw.slice(0, 12) + "...";
  return { raw, hash, prefix };
}

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function authenticateAgent(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const raw = authHeader.slice(7);
  if (!raw.startsWith(API_KEY_PREFIX)) return null;

  const hash = hashApiKey(raw);
  const agent = await db.guardAgent.findUnique({
    where: { apiKey: hash },
    include: { organization: { select: { id: true, name: true } } },
  });

  return agent;
}
