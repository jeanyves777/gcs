import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isGCSStaff } from "@/lib/auth-utils";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || !isGCSStaff(session.user.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const severity = url.searchParams.get("severity");
  const agentId = url.searchParams.get("agentId");
  const limit = parseInt(url.searchParams.get("limit") || "50", 10);

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (severity) where.severity = severity;
  if (agentId) where.agentId = agentId;

  const alerts = await db.guardAlert.findMany({
    where,
    include: {
      agent: {
        select: {
          id: true,
          name: true,
          hostname: true,
          organization: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 100),
  });

  return NextResponse.json(alerts);
}
