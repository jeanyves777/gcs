import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { GuardDashboardClient } from "./guard-dashboard-client";

export const metadata = { title: "GcsGuard — Security Operations" };

export default async function GuardDashboardPage() {
  await requireRole(["ADMIN", "STAFF"]);

  const [agents, openAlerts, recentAlerts] = await Promise.all([
    db.guardAgent.findMany({
      select: {
        id: true,
        name: true,
        hostname: true,
        ipAddress: true,
        status: true,
        lastHeartbeat: true,
        organization: { select: { name: true } },
        _count: { select: { alerts: { where: { status: "OPEN" } }, devices: true } },
      },
      where: { status: { not: "DECOMMISSIONED" } },
      orderBy: { lastHeartbeat: { sort: "desc", nulls: "last" } },
    }),
    db.guardAlert.groupBy({
      by: ["severity"],
      where: { status: "OPEN" },
      _count: true,
    }),
    db.guardAlert.findMany({
      where: { status: { in: ["OPEN", "INVESTIGATING"] } },
      include: {
        agent: {
          select: { name: true, hostname: true, organization: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const severityMap: Record<string, number> = {};
  for (const a of openAlerts) severityMap[a.severity] = a._count;

  return (
    <GuardDashboardClient
      agents={JSON.parse(JSON.stringify(agents))}
      alertCounts={{
        critical: severityMap["CRITICAL"] || 0,
        high: severityMap["HIGH"] || 0,
        medium: severityMap["MEDIUM"] || 0,
        low: severityMap["LOW"] || 0,
      }}
      recentAlerts={JSON.parse(JSON.stringify(recentAlerts))}
    />
  );
}
