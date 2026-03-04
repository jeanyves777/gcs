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
  const type = url.searchParams.get("type") || "CPU";
  const hours = parseInt(url.searchParams.get("hours") || "24", 10);

  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const metrics = await db.guardMetric.findMany({
    where: {
      agentId: id,
      type: type.toUpperCase(),
      timestamp: { gte: since },
    },
    orderBy: { timestamp: "asc" },
    select: { value: true, timestamp: true, metadata: true },
  });

  return NextResponse.json(metrics);
}
