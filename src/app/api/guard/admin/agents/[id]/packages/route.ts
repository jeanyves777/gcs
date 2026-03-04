import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isGCSStaff } from "@/lib/auth-utils";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !isGCSStaff(session.user.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const source = url.searchParams.get("source");

  const agent = await db.guardAgent.findUnique({ where: { id } });
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const where: Record<string, unknown> = { agentId: id };
  if (status) where.status = status;
  if (source) where.source = source;

  const packages = await db.guardPackage.findMany({
    where,
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    packages,
    summary: {
      total: packages.length,
      updateAvailable: packages.filter((p) => p.status === "UPDATE_AVAILABLE").length,
      securityUpdates: packages.filter((p) => p.isSecurityUpdate).length,
    },
  });
}

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

  if (body.action !== "refresh") {
    return NextResponse.json({ error: "Invalid action. Use 'refresh'." }, { status: 400 });
  }

  const agent = await db.guardAgent.findUnique({ where: { id } });
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const command = await db.guardCommand.create({
    data: {
      type: "COLLECT_PACKAGES",
      payload: JSON.stringify({}),
      agentId: id,
      createdById: session.user.id,
    },
  });

  return NextResponse.json(command);
}
