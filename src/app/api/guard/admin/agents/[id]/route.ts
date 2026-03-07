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
        take: 50,
      },
      devices: {
        orderBy: { lastSeen: "desc" },
      },
      commands: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { createdBy: { select: { name: true } } },
      },
      serviceStatuses: true,
    },
  });

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // Fetch scan history for metric snapshots (same as internal dashboard)
  const scans = await db.guardScan.findMany({
    where: { agentId: id, status: "COMPLETED" },
    orderBy: { startedAt: "desc" },
    take: 20,
    select: { results: true, startedAt: true },
  });

  const metricSnapshots = scans
    .filter((s) => s.results)
    .map((scan) => {
      try {
        const r = JSON.parse(scan.results!);
        return {
          cpuPercent: r.metrics?.cpuPercent ?? 0,
          memPercent: r.metrics?.memPercent ?? 0,
          memUsed: r.metrics?.memUsed ?? 0,
          memTotal: r.metrics?.memTotal ?? 0,
          diskPercent: r.metrics?.diskPercent ?? 0,
          diskTotal: r.metrics?.diskTotal ?? 0,
          diskUsed: r.metrics?.diskUsed ?? 0,
          loadAvg: r.metrics?.loadAvg ?? [0, 0, 0],
          uptime: r.metrics?.uptime ?? 0,
          processes: r.metrics?.processes ?? 0,
          networkRx: r.metrics?.networkRx ?? 0,
          networkTx: r.metrics?.networkTx ?? 0,
          threatScore: r.threatScore ?? 0,
          threatLevel: r.threatLevel ?? "LOW",
          grade: r.grade ?? "A",
          findingCount:
            r.findings?.filter(
              (f: { severity: string }) => f.severity !== "INFO"
            ).length ?? 0,
          timestamp: scan.startedAt.toISOString(),
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  let latestScan = null;
  if (scans[0]?.results) {
    try {
      latestScan = JSON.parse(scans[0].results);
    } catch {
      /* ignore */
    }
  }

  return NextResponse.json({
    success: true,
    agent,
    metricSnapshots,
    latestScan,
  });
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
