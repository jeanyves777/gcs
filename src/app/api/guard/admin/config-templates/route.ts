import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isGCSStaff } from "@/lib/auth-utils";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user || !isGCSStaff(session.user.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const templates = await db.guardConfigTemplate.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { deployments: true } },
    },
  });

  return NextResponse.json(templates);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !isGCSStaff(session.user.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { name, filePath, content, description, restartService } = body;

  if (!name || !filePath || !content) {
    return NextResponse.json(
      { error: "name, filePath, and content are required" },
      { status: 400 }
    );
  }

  const template = await db.guardConfigTemplate.create({
    data: {
      name,
      filePath,
      content,
      description: description || null,
      restartService: restartService || null,
      createdById: session.user.id,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(template, { status: 201 });
}
