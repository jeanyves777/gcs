import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isGCSStaff } from "@/lib/auth-utils";
import { db } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !isGCSStaff(session.user.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { action } = body;

  const agent = await db.guardAgent.findUnique({ where: { id } });
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  if (action === "install") {
    const { packages } = body;
    if (!Array.isArray(packages) || packages.length === 0) {
      return NextResponse.json({ error: "packages array is required" }, { status: 400 });
    }

    // Create INSTALL_PACKAGES command
    const command = await db.guardCommand.create({
      data: {
        type: "INSTALL_PACKAGES",
        payload: JSON.stringify({ packages }),
        agentId: id,
        createdById: session.user.id,
      },
    });

    // Create patch history records for each package
    const histories = [];
    for (const pkgName of packages) {
      // Look up current package info for version details
      const pkg = await db.guardPackage.findFirst({
        where: { agentId: id, name: pkgName },
      });

      const history = await db.guardPatchHistory.create({
        data: {
          packageName: pkgName,
          fromVersion: pkg?.version || "unknown",
          toVersion: pkg?.newVersion || "latest",
          source: pkg?.source || agent.packageManager || "apt",
          status: "PENDING",
          agentId: id,
          approvedById: session.user.id,
          approvedAt: new Date(),
        },
      });
      histories.push(history);
    }

    return NextResponse.json({ command, histories });
  }

  if (action === "upgrade") {
    const { type, dryRun } = body;
    if (!type || !["security", "all"].includes(type)) {
      return NextResponse.json({ error: "type must be 'security' or 'all'" }, { status: 400 });
    }

    const command = await db.guardCommand.create({
      data: {
        type: "SYSTEM_UPGRADE",
        payload: JSON.stringify({ type, dryRun: dryRun ?? false }),
        agentId: id,
        createdById: session.user.id,
      },
    });

    return NextResponse.json({ command });
  }

  return NextResponse.json({ error: "Invalid action. Use 'install' or 'upgrade'." }, { status: 400 });
}
