import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isGCSStaff } from "@/lib/auth-utils";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !isGCSStaff(session.user.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const url = new URL(request.url);
  const view = url.searchParams.get("view") || "overview";

  if (view === "overview") {
    // All agents (not just those with updates)
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
        _count: {
          select: {
            packages: true,
          },
        },
      },
      orderBy: { securityUpdates: "desc" },
    });

    const totalPending = allAgents.reduce((sum, a) => sum + a.pendingUpdates, 0);
    const totalSecurity = allAgents.reduce((sum, a) => sum + a.securityUpdates, 0);
    const totalPackages = allAgents.reduce((sum, a) => sum + a._count.packages, 0);

    // Recent patch history
    const recentHistory = await db.guardPatchHistory.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: {
        agent: { select: { name: true, hostname: true } },
        approvedBy: { select: { name: true } },
      },
    });

    return NextResponse.json({
      agents: allAgents,
      summary: {
        totalAgents: allAgents.length,
        agentsWithUpdates: allAgents.filter(a => a.pendingUpdates > 0).length,
        totalPending,
        totalSecurity,
        totalPackages,
      },
      recentHistory,
    });
  }

  if (view === "packages") {
    const agentId = url.searchParams.get("agentId");
    const status = url.searchParams.get("status");
    const source = url.searchParams.get("source");
    const search = url.searchParams.get("search");
    const securityOnly = url.searchParams.get("securityOnly") === "true";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "50");

    const where: Record<string, unknown> = {};
    if (agentId) where.agentId = agentId;
    if (status) where.status = status;
    if (source) where.source = source;
    if (securityOnly) where.isSecurityUpdate = true;
    if (search) where.name = { contains: search, mode: "insensitive" };

    const [packages, total] = await Promise.all([
      db.guardPackage.findMany({
        where,
        include: {
          agent: { select: { id: true, name: true, hostname: true } },
        },
        orderBy: [{ isSecurityUpdate: "desc" }, { name: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.guardPackage.count({ where }),
    ]);

    return NextResponse.json({
      packages,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  }

  if (view === "history") {
    const agentId = url.searchParams.get("agentId");
    const status = url.searchParams.get("status");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "50");

    const where: Record<string, unknown> = {};
    if (agentId) where.agentId = agentId;
    if (status) where.status = status;

    const [history, total] = await Promise.all([
      db.guardPatchHistory.findMany({
        where,
        include: {
          agent: { select: { id: true, name: true, hostname: true } },
          approvedBy: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.guardPatchHistory.count({ where }),
    ]);

    return NextResponse.json({
      history,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  }

  return NextResponse.json({ error: "Invalid view parameter" }, { status: 400 });
}
