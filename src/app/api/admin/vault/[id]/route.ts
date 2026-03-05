import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isGCSStaff } from "@/lib/auth-utils";
import { encryptIfPresent } from "@/lib/vault-crypto";
import { z } from "zod";

const CATEGORIES = ["CLOUD", "HOSTING", "EMAIL", "DOMAIN", "DATABASE", "API", "SOCIAL", "PAYMENT", "VPN", "OTHER"] as const;

const updateSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  category: z.enum(CATEGORIES).optional(),
  url: z.string().max(500).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  username: z.string().max(500).optional().nullable(),
  password: z.string().max(500).optional().nullable(),
  apiKey: z.string().max(2000).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user || !isGCSStaff(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const entry = await db.vaultEntry.findUnique({
      where: { id },
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
        isActive: true,
        createdAt: true,
        updatedAt: true,
        createdBy: { select: { name: true } },
      },
    });

    if (!entry || !entry.isActive) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: entry.id,
      label: entry.label,
      category: entry.category,
      url: entry.url,
      description: entry.description,
      hasUsername: !!entry.encUsername,
      hasPassword: !!entry.encPassword,
      hasApiKey: !!entry.encApiKey,
      hasNotes: !!entry.encNotes,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      createdByName: entry.createdBy.name,
    });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user || !isGCSStaff(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const result = updateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message ?? "Invalid data" }, { status: 400 });
    }

    const { username, password, apiKey, notes, ...plainFields } = result.data;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = { ...plainFields };
    if (username !== undefined) data.encUsername = encryptIfPresent(username);
    if (password !== undefined) data.encPassword = encryptIfPresent(password);
    if (apiKey !== undefined) data.encApiKey = encryptIfPresent(apiKey);
    if (notes !== undefined) data.encNotes = encryptIfPresent(notes);

    const entry = await db.vaultEntry.update({ where: { id }, data });

    await db.vaultAccessLog.create({
      data: {
        action: "UPDATE",
        entryId: id,
        userId: session.user.id,
        metadata: JSON.stringify({ updatedFields: Object.keys(result.data) }),
      },
    });

    return NextResponse.json({ id: entry.id, label: entry.label });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user || !isGCSStaff(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const entry = await db.vaultEntry.findUnique({ where: { id } });
    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.vaultEntry.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await db.vaultAccessLog.create({
      data: {
        action: "DELETE",
        entryId: id,
        userId: session.user.id,
        metadata: JSON.stringify({ label: entry.label }),
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
