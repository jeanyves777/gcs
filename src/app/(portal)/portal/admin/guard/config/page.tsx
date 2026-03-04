import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { ConfigTemplatesClient } from "./config-templates-client";

export const metadata = { title: "Config Templates — GcsGuard" };

export default async function ConfigTemplatesPage() {
  await requireRole(["ADMIN", "STAFF"]);

  const templates = await db.guardConfigTemplate.findMany({
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { deployments: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return <ConfigTemplatesClient templates={JSON.parse(JSON.stringify(templates))} />;
}
