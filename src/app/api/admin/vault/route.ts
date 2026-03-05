import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isGCSStaff } from "@/lib/auth-utils";
import { encryptIfPresent } from "@/lib/vault-crypto";
import { z } from "zod";

const CATEGORIES = ["CLOUD", "HOSTING", "EMAIL", "DOMAIN", "DATABASE", "API", "SOCIAL", "PAYMENT", "VPN", "OTHER"] as const;

const createSchema = z.object({
  label: z.string().min(1).max(200),
  category: z.enum(CATEGORIES).default("OTHER"),
  url: z.string().max(500).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  username: z.string().max(500).optional().nullable(),
  password: z.string().max(500).optional().nullable(),
  apiKey: z.string().max(2000).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !isGCSStaff(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const category = searchParams.get("category");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { isActive: true, deletedAt: null };
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { label: { contains: search } },
        { description: { contains: search } },
        { url: { contains: search } },
      ];
    }

    const entries = await db.vaultEntry.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        label: true,
        category: true,
        url: true,
        description: true,
        encUsername: true,
        encPassword: true,
        encApiKey: true,
        encNotes: true,
        createdAt: true,
        updatedAt: true,
        createdBy: { select: { name: true } },
      },
    });

    const result = entries.map((e) => ({
      id: e.id,
      label: e.label,
      category: e.category,
      url: e.url,
      description: e.description,
      hasUsername: !!e.encUsername,
      hasPassword: !!e.encPassword,
      hasApiKey: !!e.encApiKey,
      hasNotes: !!e.encNotes,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
      createdByName: e.createdBy.name,
    }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !isGCSStaff(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const result = createSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message ?? "Invalid data" }, { status: 400 });
    }

    const { username, password, apiKey, notes, ...plainFields } = result.data;

    const entry = await db.vaultEntry.create({
      data: {
        ...plainFields,
        encUsername: encryptIfPresent(username),
        encPassword: encryptIfPresent(password),
        encApiKey: encryptIfPresent(apiKey),
        encNotes: encryptIfPresent(notes),
        createdById: session.user.id,
      },
    });

    await db.vaultAccessLog.create({
      data: {
        action: "CREATE",
        entryId: entry.id,
        userId: session.user.id,
        metadata: JSON.stringify({ label: entry.label, category: entry.category }),
      },
    });

    return NextResponse.json({ id: entry.id, label: entry.label }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
