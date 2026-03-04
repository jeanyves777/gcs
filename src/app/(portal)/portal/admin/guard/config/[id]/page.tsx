import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { TemplateDetailClient } from "./template-detail-client";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = await db.guardConfigTemplate.findUnique({ where: { id }, select: { name: true } });
  return { title: template ? `${template.name} — Config Templates` : "Config Template — GcsGuard" };
}

export default async function TemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["ADMIN", "STAFF"]);
  const { id } = await params;

  const template = await db.guardConfigTemplate.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true } },
      deployments: {
        orderBy: { createdAt: "desc" },
        take: 30,
        include: {
          agent: { select: { id: true, name: true, hostname: true } },
          deployedBy: { select: { name: true } },
        },
      },
    },
  });

  if (!template) notFound();

  const agents = await db.guardAgent.findMany({
    where: { status: { not: "DECOMMISSIONED" } },
    select: { id: true, name: true, hostname: true },
    orderBy: { name: "asc" },
  });

  return (
    <TemplateDetailClient
      template={JSON.parse(JSON.stringify(template))}
      agents={agents}
    />
  );
}
