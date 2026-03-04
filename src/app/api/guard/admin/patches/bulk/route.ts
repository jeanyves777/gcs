import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isGCSStaff } from "@/lib/auth-utils";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !isGCSStaff(session.user.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { agentIds, packages, action } = body;

  if (action !== "install") {
    return NextResponse.json({ error: "Only 'install' action is supported for bulk operations" }, { status: 400 });
  }

  if (!Array.isArray(agentIds) || agentIds.length === 0) {
    return NextResponse.json({ error: "agentIds array is required" }, { status: 400 });
  }

  if (!Array.isArray(packages) || packages.length === 0) {
    return NextResponse.json({ error: "packages array is required" }, { status: 400 });
  }

  // Verify all agents exist
  const agents = await db.guardAgent.findMany({
    where: { id: { in: agentIds }, status: { not: "DECOMMISSIONED" } },
  });

  if (agents.length === 0) {
    return NextResponse.json({ error: "No valid agents found" }, { status: 404 });
  }

  const results = [];

  for (const agent of agents) {
    const command = await db.guardCommand.create({
      data: {
        type: "INSTALL_PACKAGES",
        payload: JSON.stringify({ packages }),
        agentId: agent.id,
        createdById: session.user.id,
      },
    });

    // Create patch history records for each package on this agent
    for (const pkgName of packages) {
      const pkg = await db.guardPackage.findFirst({
        where: { agentId: agent.id, name: pkgName },
      });

      await db.guardPatchHistory.create({
        data: {
          packageName: pkgName,
          fromVersion: pkg?.version || "unknown",
          toVersion: pkg?.newVersion || "latest",
          source: pkg?.source || agent.packageManager || "apt",
          status: "PENDING",
          agentId: agent.id,
          approvedById: session.user.id,
          approvedAt: new Date(),
        },
      });
    }

    results.push({
      agentId: agent.id,
      agentName: agent.name,
      commandId: command.id,
      packages: packages.length,
    });
  }

  return NextResponse.json({
    dispatched: results.length,
    skipped: agentIds.length - agents.length,
    results,
  });
}
