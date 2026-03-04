import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { PatchesClient } from "./patches-client";

export const metadata = { title: "Patch Management — GcsGuard" };

export default async function PatchesPage() {
  await requireRole(["ADMIN", "STAFF"]);

  const agents = await db.guardAgent.findMany({
    where: {
      status: { not: "DECOMMISSIONED" },
      pendingUpdates: { gt: 0 },
    },
    select: {
      id: true,
      name: true,
      hostname: true,
      pendingUpdates: true,
      securityUpdates: true,
      organization: { select: { name: true } },
    },
    orderBy: { securityUpdates: "desc" },
  });

  const allAgents = await db.guardAgent.findMany({
    where: { status: { not: "DECOMMISSIONED" } },
    select: { id: true, pendingUpdates: true, securityUpdates: true },
  });

  const totalPending = allAgents.reduce((sum, a) => sum + a.pendingUpdates, 0);
  const totalSecurity = allAgents.reduce((sum, a) => sum + a.securityUpdates, 0);

  return (
    <PatchesClient
      agents={JSON.parse(JSON.stringify(agents))}
      totalPending={totalPending}
      totalSecurity={totalSecurity}
    />
  );
}
