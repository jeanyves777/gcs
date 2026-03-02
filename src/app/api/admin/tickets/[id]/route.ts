import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isGCSStaff } from "@/lib/auth-utils";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"]).optional(),
  assignedTo: z.string().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user || !isGCSStaff(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message ?? "Invalid data" }, { status: 400 });
    }

    const data = result.data;
    const ticket = await db.ticket.update({
      where: { id },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.assignedTo !== undefined && { assignedTo: data.assignedTo }),
        ...(data.priority && { priority: data.priority }),
        ...(data.status === "RESOLVED" && { resolvedAt: new Date() }),
        ...(data.status === "CLOSED" && { closedAt: new Date() }),
      },
    });

    return NextResponse.json(ticket);
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
