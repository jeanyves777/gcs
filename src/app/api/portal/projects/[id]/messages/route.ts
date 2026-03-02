import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { content } = await req.json();
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "Message content required" }, { status: 400 });
    }

    // Verify user has access to this project
    const project = await db.project.findFirst({
      where: {
        id,
        deletedAt: null,
        organization: { users: { some: { id: session.user.id } } },
      },
    });

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const message = await db.message.create({
      data: {
        content: content.trim(),
        projectId: id,
        authorId: session.user.id,
        type: "TEXT",
      },
      include: { author: { select: { id: true, name: true, role: true } } },
    });

    return NextResponse.json(message);
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const project = await db.project.findFirst({
      where: {
        id,
        deletedAt: null,
        organization: { users: { some: { id: session.user.id } } },
      },
    });

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const messages = await db.message.findMany({
      where: { projectId: id, deletedAt: null, parentId: null },
      orderBy: { createdAt: "asc" },
      include: { author: { select: { id: true, name: true, role: true } } },
      take: 100,
    });

    return NextResponse.json(messages);
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
