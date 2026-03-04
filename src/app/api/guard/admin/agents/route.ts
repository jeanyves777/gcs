import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isGCSStaff } from "@/lib/auth-utils";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user || !isGCSStaff(session.user.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const agents = await db.guardAgent.findMany({
    include: {
      organization: { select: { id: true, name: true } },
      _count: {
        select: {
          alerts: { where: { status: "OPEN" } },
          devices: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(agents);
}
