import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isGCSStaff } from "@/lib/auth-utils";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; monitorId: string }> }
) {
  const session = await auth();
  if (!session?.user || !isGCSStaff(session.user.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id, monitorId } = await params;

  const monitor = await db.guardUrlMonitor.findUnique({
    where: { id: monitorId },
    include: {
      checks: {
        orderBy: { checkedAt: "desc" },
        take: 100,
      },
    },
  });

  if (!monitor) {
    return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
  }

  if (monitor.agentId !== id) {
    return NextResponse.json({ error: "Monitor does not belong to this agent" }, { status: 400 });
  }

  return NextResponse.json(monitor);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; monitorId: string }> }
) {
  const session = await auth();
  if (!session?.user || !isGCSStaff(session.user.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id, monitorId } = await params;
  const body = await request.json();

  const monitor = await db.guardUrlMonitor.findUnique({
    where: { id: monitorId },
  });

  if (!monitor) {
    return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
  }

  if (monitor.agentId !== id) {
    return NextResponse.json({ error: "Monitor does not belong to this agent" }, { status: 400 });
  }

  const { url, name, method, expectedStatus, intervalSec, timeoutMs, isActive } = body;

  const updated = await db.guardUrlMonitor.update({
    where: { id: monitorId },
    data: {
      ...(url !== undefined && { url }),
      ...(name !== undefined && { name }),
      ...(method !== undefined && { method }),
      ...(expectedStatus !== undefined && { expectedStatus }),
      ...(intervalSec !== undefined && { intervalSec }),
      ...(timeoutMs !== undefined && { timeoutMs }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; monitorId: string }> }
) {
  const session = await auth();
  if (!session?.user || !isGCSStaff(session.user.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id, monitorId } = await params;

  const monitor = await db.guardUrlMonitor.findUnique({
    where: { id: monitorId },
  });

  if (!monitor) {
    return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
  }

  if (monitor.agentId !== id) {
    return NextResponse.json({ error: "Monitor does not belong to this agent" }, { status: 400 });
  }

  // Delete checks first (cascade), then the monitor
  await db.guardUrlCheck.deleteMany({ where: { monitorId } });
  await db.guardUrlMonitor.delete({ where: { id: monitorId } });

  return NextResponse.json({ status: "deleted" });
}
