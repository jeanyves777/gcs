import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isGCSStaff } from "@/lib/auth-utils";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user || !isGCSStaff(session.user.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Cross-agent view: all agents with pending updates
  const agents = await db.guardAgent.findMany({
    where: {
      pendingUpdates: { gt: 0 },
      status: { not: "DECOMMISSIONED" },
    },
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
      lastInventorySync: true,
      lastPatchCheck: true,
      organization: { select: { id: true, name: true } },
      _count: {
        select: {
          packages: { where: { status: "UPDATE_AVAILABLE" } },
        },
      },
    },
    orderBy: { securityUpdates: "desc" },
  });

  const totalPending = agents.reduce((sum, a) => sum + a.pendingUpdates, 0);
  const totalSecurity = agents.reduce((sum, a) => sum + a.securityUpdates, 0);

  return NextResponse.json({
    agents,
    summary: {
      agentsWithUpdates: agents.length,
      totalPending,
      totalSecurity,
    },
  });
}
