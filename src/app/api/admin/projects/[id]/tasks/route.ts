import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isGCSStaff } from "@/lib/auth-utils";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(2).max(500),
  description: z.string().max(2000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  assigneeId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  milestoneId: z.string().optional().nullable(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user || !isGCSStaff(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const result = createSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message ?? "Invalid data" }, { status: 400 });
    }

    const { title, description, priority, assigneeId, dueDate, milestoneId } = result.data;

    const task = await db.task.create({
      data: {
        title,
        description: description || null,
        priority,
        projectId: id,
        assigneeId: assigneeId || null,
        milestoneId: milestoneId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: { assignee: { select: { name: true } } },
    });

    return NextResponse.json(task, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
