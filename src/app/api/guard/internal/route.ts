import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";

const AGENT_ID = "INTERNAL_GCS_SERVER";

/**
 * GET /api/guard/internal
 * Returns agent data with dashboard-compatible metrics derived from
 * past GuardScan results, plus alerts and service statuses.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const agent = await db.guardAgent.findUnique({
      where: { id: AGENT_ID },
      include: {
        alerts: { where: { status: "OPEN" }, orderBy: { createdAt: "desc" }, take: 50 },
        serviceStatuses: true,
      },
    });

    if (!agent) {
      return NextResponse.json({ success: false, agent: null });
    }

    // Get last 20 scans for trend data
    const scans = await db.guardScan.findMany({
      where: { agentId: AGENT_ID, status: "COMPLETED" },
      orderBy: { startedAt: "desc" },
      take: 20,
      select: { results: true, startedAt: true },
    });

    // Transform scan results into dashboard-compatible metric snapshots
    const metricSnapshots = scans
      .filter(s => s.results)
      .map(scan => {
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
            findingCount: r.findings?.filter((f: { severity: string }) => f.severity !== "INFO").length ?? 0,
            timestamp: scan.startedAt,
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    // Latest scan's full result (for ports, services, file integrity, etc.)
    let latestScanResult = null;
    if (scans[0]?.results) {
      try {
        latestScanResult = JSON.parse(scans[0].results);
      } catch { /* ignore */ }
    }

    return NextResponse.json({
      success: true,
      agent,
      metricSnapshots,
      latestScan: latestScanResult,
      lastUpdate: agent.lastHeartbeat,
    });
  } catch (error) {
    console.error("[GuardInternal] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
