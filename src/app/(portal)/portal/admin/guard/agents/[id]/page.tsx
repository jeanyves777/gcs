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
        orderBy: { createdAt: "desc" },
        take: 30,
      },
      devices: {
        orderBy: { lastSeen: "desc" },
      },
      commands: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { createdBy: { select: { name: true } } },
      },
    },
  });

  if (!agent) notFound();

  // Fetch latest metrics (last 24h)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const metrics = await db.guardMetric.findMany({
    where: { agentId: id, timestamp: { gte: since } },
    orderBy: { timestamp: "asc" },
    select: { type: true, value: true, timestamp: true },
  });

  return (
    <AgentDetailClient
      agent={JSON.parse(JSON.stringify(agent))}
      metrics={JSON.parse(JSON.stringify(metrics))}
    />
  );
}
