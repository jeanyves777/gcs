import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { isGCSStaff } from "@/lib/auth-utils";

const schema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional().or(z.literal("")),
  organizationId: z.string().min(1),
  ownerId: z.string().min(1),
  startDate: z.string().optional(),
  targetDate: z.string().optional(),
  status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]).default("PLANNING"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !isGCSStaff(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message ?? "Invalid data" }, { status: 400 });
    }

    const { name, description, organizationId, ownerId, startDate, targetDate, status } = result.data;

    const project = await db.project.create({
      data: {
        name,
        description: description || null,
        organizationId,
        ownerId,
        status,
        startDate: startDate ? new Date(startDate) : null,
        targetDate: targetDate ? new Date(targetDate) : null,
      },
    });

    // Notify org users
    const orgUsers = await db.user.findMany({
      where: { organizationId, isActive: true },
      select: { id: true },
    });
    await db.notification.createMany({
      data: orgUsers.map((u) => ({
        userId: u.id,
        type: "NEW_PROJECT",
        title: `New project: ${name}`,
        content: "A new project has been created for your organization.",
        link: `/portal/projects/${project.id}`,
      })),
    });

    return NextResponse.json(project, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !isGCSStaff(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const projects = await db.project.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        organization: { select: { name: true } },
        owner: { select: { name: true } },
        _count: { select: { tasks: true, milestones: true } },
      },
    });

    return NextResponse.json(projects);
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
