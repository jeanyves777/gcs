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

  const agent = await db.guardAgent.findUnique({ where: { id } });
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const monitors = await db.guardUrlMonitor.findMany({
    where: { agentId: id },
    orderBy: { createdAt: "desc" },
    include: {
      checks: {
        orderBy: { checkedAt: "desc" },
        take: 1,
      },
    },
  });

  // Flatten latest check info into the monitor object
  const result = monitors.map((m) => {
    const latestCheck = m.checks[0] || null;
    const { checks: _checks, ...monitor } = m;
    return {
      ...monitor,
      latestCheck,
    };
  });

  return NextResponse.json(result);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !isGCSStaff(session.user.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { url, name, method, expectedStatus, intervalSec } = body;

  if (!url || !name) {
    return NextResponse.json({ error: "url and name are required" }, { status: 400 });
  }

  const agent = await db.guardAgent.findUnique({ where: { id } });
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const monitor = await db.guardUrlMonitor.create({
    data: {
      url,
      name,
      method: method || "GET",
      expectedStatus: expectedStatus || 200,
      intervalSec: intervalSec || 60,
      agentId: id,
    },
  });

  return NextResponse.json(monitor, { status: 201 });
}
