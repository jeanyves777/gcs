import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const MAX_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large (max 20MB)" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to public/uploads/projects/<projectId>/
    const uploadDir = path.join(process.cwd(), "public", "uploads", "projects", id);
    await mkdir(uploadDir, { recursive: true });

    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filePath = path.join(uploadDir, safeName);
    await writeFile(filePath, buffer);

    const url = `/uploads/projects/${id}/${safeName}`;

    const dbFile = await db.file.create({
      data: {
        name: file.name,
        url,
        size: file.size,
        mimeType: file.type || "application/octet-stream",
        projectId: id,
        uploadedBy: session.user.id,
      },
      include: { uploader: { select: { name: true } } },
    });

    return NextResponse.json(dbFile);
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
