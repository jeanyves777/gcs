import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isGCSStaff } from "@/lib/auth-utils";
import { db } from "@/lib/db";

// GET — list all pitches (most recent first)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !isGCSStaff(session.user.role ?? "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const pitches = await db.pitch.findMany({
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { name: true, email: true } } },
    });

    return NextResponse.json(pitches);
  } catch {
    return NextResponse.json({ error: "Failed to fetch pitches" }, { status: 500 });
  }
}

// POST — save a generated pitch
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !isGCSStaff(session.user.role ?? "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { businessName, websiteUrl, pitchText, securityScore, presenceScore, dealScore, painCount } =
      await req.json();

    if (!businessName || !websiteUrl || !pitchText) {
      return NextResponse.json({ error: "businessName, websiteUrl, and pitchText are required" }, { status: 400 });
    }

    const pitch = await db.pitch.create({
      data: {
        businessName,
        websiteUrl,
        pitchText,
        securityScore: securityScore ?? 0,
        presenceScore: presenceScore ?? 0,
        dealScore: dealScore ?? 0,
        painCount: painCount ?? 0,
        createdById: session.user.id,
      },
    });

    return NextResponse.json(pitch, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to save pitch" }, { status: 500 });
  }
}
