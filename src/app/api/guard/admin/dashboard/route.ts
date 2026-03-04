import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isGCSStaff } from "@/lib/auth-utils";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user || !isGCSStaff(session.user.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const [agents, alertCounts, recentAlerts, incidentCount] = await Promise.all([
    db.guardAgent.findMany({
      select: {
        id: true,
        name: true,
        hostname: true,
        ipAddress: true,
        status: true,
        lastHeartbeat: true,
        organization: { select: { name: true } },
        _count: { select: { alerts: { where: { status: "OPEN" } } } },
      },
      orderBy: { lastHeartbeat: { sort: "desc", nulls: "last" } },
    }),
    db.guardAlert.groupBy({
      by: ["severity"],
      where: { status: "OPEN" },
      _count: true,
    }),
    db.guardAlert.findMany({
      where: { status: "OPEN" },
      include: {
        agent: { select: { name: true, hostname: true, organization: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    db.guardIncident.count({ where: { status: { in: ["OPEN", "INVESTIGATING"] } } }),
  ]);

  const now = Date.now();
  const agentStats = {
    total: agents.length,
    online: agents.filter((a) => a.lastHeartbeat && now - new Date(a.lastHeartbeat).getTime() < 90_000).length,
    offline: agents.filter((a) => !a.lastHeartbeat || now - new Date(a.lastHeartbeat).getTime() >= 90_000).length,
    pending: agents.filter((a) => a.status === "PENDING").length,
  };

  const severityMap: Record<string, number> = {};
  for (const ac of alertCounts) {
    severityMap[ac.severity] = ac._count;
  }

  return NextResponse.json({
    agents: agentStats,
    agentList: agents,
    alerts: {
      critical: severityMap["CRITICAL"] || 0,
      high: severityMap["HIGH"] || 0,
      medium: severityMap["MEDIUM"] || 0,
      low: severityMap["LOW"] || 0,
      total: Object.values(severityMap).reduce((a, b) => a + b, 0),
    },
    recentAlerts,
    incidentCount,
  });
}
