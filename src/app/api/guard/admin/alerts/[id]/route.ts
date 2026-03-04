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
  const alert = await db.guardAlert.findUnique({
    where: { id },
    include: {
      agent: {
        select: {
          id: true,
          name: true,
          hostname: true,
          ipAddress: true,
          os: true,
          organization: { select: { name: true } },
        },
      },
      resolvedBy: { select: { name: true } },
      incident: { select: { id: true, title: true } },
    },
  });

  if (!alert) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  return NextResponse.json(alert);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !isGCSStaff(session.user.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { status } = body;

  const data: Record<string, unknown> = {};
  if (status) {
    data.status = status;
    if (status === "RESOLVED" || status === "FALSE_POSITIVE") {
      data.resolvedAt = new Date();
      data.resolvedById = session.user.id;
    }
  }

  const alert = await db.guardAlert.update({ where: { id }, data });
  return NextResponse.json(alert);
}
