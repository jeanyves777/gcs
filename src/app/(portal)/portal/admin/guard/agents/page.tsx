import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { AgentsClient } from "./agents-client";

export const metadata = { title: "Agents — GcsGuard" };

export default async function GuardAgentsPage() {
  await requireRole(["ADMIN", "STAFF"]);

  const agents = await db.guardAgent.findMany({
    where: { status: { not: "DECOMMISSIONED" } },
    include: {
      organization: { select: { id: true, name: true } },
      _count: {
        select: {
          alerts: { where: { status: "OPEN" } },
          devices: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return <AgentsClient agents={JSON.parse(JSON.stringify(agents))} />;
}
