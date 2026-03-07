import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { PatchesClient } from "./patches-client";

export const metadata = { title: "Patch Management — GcsGuard" };

export default async function PatchesPage() {
  await requireRole(["ADMIN", "STAFF"]);

  const allAgents = await db.guardAgent.findMany({
    where: { status: { not: "DECOMMISSIONED" } },
    select: {
      id: true,
      name: true,
      hostname: true,
      ipAddress: true,
      os: true,
      distro: true,
      distroVersion: true,
      packageManager: true,
      status: true,
      pendingUpdates: true,
      securityUpdates: true,
      lastPatchCheck: true,
      organization: { select: { id: true, name: true } },
      _count: { select: { packages: true } },
    },
    orderBy: { securityUpdates: "desc" },
  });

  const totalPending = allAgents.reduce((sum, a) => sum + a.pendingUpdates, 0);
  const totalSecurity = allAgents.reduce((sum, a) => sum + a.securityUpdates, 0);

  return (
    <PatchesClient
      agents={JSON.parse(JSON.stringify(allAgents))}
      totalPending={totalPending}
      totalSecurity={totalSecurity}
    />
  );
}
