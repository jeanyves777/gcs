import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { AgentDetailClient } from "./agent-detail-client";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = await db.guardAgent.findUnique({ where: { id }, select: { name: true } });
  return { title: agent ? `${agent.name} — GcsGuard` : "Agent — GcsGuard" };
}

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["ADMIN", "STAFF"]);
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

  if (!agent) notFound();

  // Fetch scan history (same as internal dashboard)
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

  return (
    <AgentDetailClient
      initialData={{
        agent: JSON.parse(JSON.stringify(agent)),
        metricSnapshots: metricSnapshots as any[],
        latestScan,
      }}
    />
  );
}
