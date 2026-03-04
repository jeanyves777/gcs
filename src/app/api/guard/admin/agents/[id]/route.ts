import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isGCSStaff } from "@/lib/auth-utils";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !isGCSStaff(session.user.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const agent = await db.guardAgent.findUnique({
    where: { id },
    include: {
      organization: { select: { id: true, name: true } },
      alerts: {
        where: { status: "OPEN" },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      devices: {
        orderBy: { lastSeen: "desc" },
      },
      commands: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { createdBy: { select: { name: true } } },
      },
      scans: {
        orderBy: { startedAt: "desc" },
        take: 10,
      },
    },
  });

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  return NextResponse.json(agent);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !isGCSStaff(session.user.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { name, config } = body;

  const agent = await db.guardAgent.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(config && { config: JSON.stringify(config) }),
    },
  });

  return NextResponse.json(agent);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !isGCSStaff(session.user.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  await db.guardAgent.update({
    where: { id },
    data: { status: "DECOMMISSIONED" },
  });

  return NextResponse.json({ status: "decommissioned" });
}
