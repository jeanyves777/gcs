import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isGCSStaff } from "@/lib/auth-utils";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(200),
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
  subscriptionTier: z.enum(["BASIC", "PROFESSIONAL", "ENTERPRISE"]).optional(),
  googleRating: z.number().min(0).max(5).optional().nullable(),
  yelpUrl: z.string().max(500).optional().nullable(),
  bbbUrl: z.string().max(500).optional().nullable(),
  socialLinks: z.string().max(5000).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  logo: z.string().max(500).optional().nullable(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !isGCSStaff(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const orgs = await db.organization.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            users: true,
            projects: true,
            invoices: true,
            tickets: true,
            guardAgents: true,
          },
        },
      },
    });

    return NextResponse.json(orgs);
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

    // Check domain uniqueness if provided
    if (result.data.domain) {
      const existing = await db.organization.findUnique({ where: { domain: result.data.domain } });
      if (existing) {
        return NextResponse.json({ error: "An organization with this domain already exists" }, { status: 409 });
      }
    }

    const org = await db.organization.create({
      data: result.data,
      include: {
        _count: {
          select: { users: true, projects: true, invoices: true, tickets: true, guardAgents: true },
        },
      },
    });

    return NextResponse.json(org, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
