import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isGCSStaff } from "@/lib/auth-utils";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !isGCSStaff(session.user.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  const agent = await db.guardAgent.findUnique({ where: { id } });
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const services = await db.guardServiceStatus.findMany({
    where: { agentId: id },
    orderBy: { serviceName: "asc" },
  });

  return NextResponse.json({
    services,
    summary: {
      total: services.length,
      active: services.filter((s) => s.isActive).length,
      inactive: services.filter((s) => !s.isActive).length,
      enabled: services.filter((s) => s.isEnabled).length,
      disabled: services.filter((s) => !s.isEnabled).length,
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
      type: "COLLECT_SERVICES",
      payload: JSON.stringify({}),
      agentId: id,
      createdById: session.user.id,
    },
  });

  return NextResponse.json(command);
}
