import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isGCSStaff } from "@/lib/auth-utils";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  domain: z.string().max(255).optional().nullable(),
  website: z.string().max(500).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  zipCode: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  industry: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  subscriptionTier: z.enum(["NONE", "GCSGUARD_MANAGED", "GCSGUARD_NON_MANAGED"]).optional(),
  isActive: z.boolean().optional(),
  googleRating: z.number().min(0).max(5).optional().nullable(),
  yelpUrl: z.string().max(500).optional().nullable(),
  bbbUrl: z.string().max(500).optional().nullable(),
  socialLinks: z.string().max(5000).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  logo: z.string().max(500).optional().nullable(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user || !isGCSStaff(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const org = await db.organization.findUnique({
      where: { id },
      include: {
        users: { select: { id: true, name: true, email: true, role: true, isActive: true }, orderBy: { name: "asc" } },
        _count: { select: { projects: true, invoices: true, tickets: true, guardAgents: true } },
      },
    });

    if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(org);
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

    // Check domain uniqueness if changed
    if (result.data.domain) {
      const existing = await db.organization.findFirst({
        where: { domain: result.data.domain, NOT: { id } },
      });
      if (existing) {
        return NextResponse.json({ error: "An organization with this domain already exists" }, { status: 409 });
      }
    }

    const org = await db.organization.update({
      where: { id },
      data: result.data,
      include: {
        _count: { select: { users: true, projects: true, invoices: true, tickets: true, guardAgents: true } },
      },
    });

    return NextResponse.json(org);
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user || !isGCSStaff(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const org = await db.organization.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });

    if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (org._count.users > 0) {
      return NextResponse.json(
        { error: `Cannot delete — organization has ${org._count.users} user(s). Reassign or remove them first.` },
        { status: 400 }
      );
    }

    await db.organization.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
