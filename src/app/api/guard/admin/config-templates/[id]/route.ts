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

  const template = await db.guardConfigTemplate.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { deployments: true } },
    },
  });

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json(template);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !isGCSStaff(session.user.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { name, filePath, content, description, restartService } = body;

  const existing = await db.guardConfigTemplate.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const template = await db.guardConfigTemplate.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(filePath !== undefined && { filePath }),
      ...(content !== undefined && { content }),
      ...(description !== undefined && { description }),
      ...(restartService !== undefined && { restartService }),
      // Increment version when content changes
      ...(content !== undefined && content !== existing.content
        ? { version: existing.version + 1 }
        : {}),
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(template);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !isGCSStaff(session.user.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  const template = await db.guardConfigTemplate.findUnique({
    where: { id },
    include: { _count: { select: { deployments: true } } },
  });

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  if (template._count.deployments > 0) {
    return NextResponse.json(
      { error: `Cannot delete template with ${template._count.deployments} existing deployment(s). Remove deployments first.` },
      { status: 409 }
    );
  }

  await db.guardConfigTemplate.delete({ where: { id } });

  return NextResponse.json({ status: "deleted" });
}
