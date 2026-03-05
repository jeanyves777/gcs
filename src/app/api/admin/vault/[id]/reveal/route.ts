import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isGCSStaff } from "@/lib/auth-utils";
import { decryptIfPresent } from "@/lib/vault-crypto";
import { verifyToken } from "@/app/api/admin/ai/pin/route";
import { z } from "zod";

const revealSchema = z.object({
  fields: z.array(z.enum(["username", "password", "apiKey", "notes"])).min(1),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user || !isGCSStaff(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Require PIN session token
    const aiSession = req.headers.get("x-ai-session");
    if (!aiSession) {
      return NextResponse.json({ error: "PIN required" }, { status: 401 });
    }
    const tokenCheck = verifyToken(aiSession);
    if (!tokenCheck.valid || tokenCheck.userId !== session.user.id) {
      return NextResponse.json({ error: "Invalid or expired PIN session" }, { status: 401 });
    }

    const body = await req.json();
    const result = revealSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Invalid fields" }, { status: 400 });
    }

    const entry = await db.vaultEntry.findUnique({ where: { id } });
    if (!entry || !entry.isActive) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { fields } = result.data;
    const fieldMap: Record<string, string | null> = {
      username: "encUsername",
      password: "encPassword",
      apiKey: "encApiKey",
      notes: "encNotes",
    };

    const revealed: Record<string, string | null> = {};
    for (const field of fields) {
      const dbField = fieldMap[field] as keyof typeof entry;
      revealed[field] = decryptIfPresent(entry[dbField] as string | null);
    }

    // Audit log
    await db.vaultAccessLog.create({
      data: {
        action: "REVEAL",
        entryId: id,
        userId: session.user.id,
        metadata: JSON.stringify({ fields }),
      },
    });

    return NextResponse.json(revealed);
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
