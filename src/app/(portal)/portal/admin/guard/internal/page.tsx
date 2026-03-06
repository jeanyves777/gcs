import { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { InternalDashboardClient } from "./internal-dashboard-client";

export const metadata: Metadata = {
  title: "GcsGuard Internal Monitor | GCS Admin",
  description:
    "Real-time security scanning and monitoring for GCS production server",
};

const AGENT_ID = "INTERNAL_GCS_SERVER";

export default async function InternalGuardPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/portal/login");
  }

  // Find GCS org
  const gcsOrg = await db.organization.findFirst({
    where: { name: { contains: "General Computing" } },
    select: { id: true },
  });

  if (!gcsOrg) {
    return (
      <div className="p-6 text-red-500">
        GCS organization not found in database. Seed the database first.
      </div>
    );
  }

  // Fetch or create internal agent
  let agent = await db.guardAgent.findUnique({
    where: { id: AGENT_ID },
    include: {
      alerts: {
        where: { status: "OPEN" },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      serviceStatuses: true,
    },
  });

  if (!agent) {
    const apiKey = "internal-" + Date.now();
    agent = await db.guardAgent.create({
      data: {
        id: AGENT_ID,
        name: "GCS Internal Monitor",
        hostname: "localhost",
        ipAddress: "127.0.0.1",
        os: "linux",
        status: "ONLINE",
        apiKey,
        apiKeyPrefix: apiKey.substring(0, 8),
        lastHeartbeat: new Date(),
        organizationId: gcsOrg.id,
      },
      include: {
        alerts: {
          where: { status: "OPEN" },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        serviceStatuses: true,
      },
    });
  }

  // Get scan history for trend data
  const scans = await db.guardScan.findMany({
    where: { agentId: AGENT_ID, status: "COMPLETED" },
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
    <InternalDashboardClient
      initialData={{
        agent: JSON.parse(JSON.stringify(agent)),
        metricSnapshots: metricSnapshots as any[],
        latestScan,
      }}
    />
  );
}
