import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isGCSStaff } from "@/lib/auth-utils";
import { verifyToken } from "../../pin/route";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !isGCSStaff(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const aiSession = req.headers.get("x-ai-session");
  if (!aiSession) {
    return NextResponse.json({ error: "PIN required" }, { status: 401 });
  }
  const tokenCheck = verifyToken(aiSession);
  if (!tokenCheck.valid || tokenCheck.userId !== session.user.id) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const { id } = await params;

  const conversation = await db.aiConversation.findFirst({
    where: { id, userId: session.user.id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(conversation);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !isGCSStaff(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const aiSession = req.headers.get("x-ai-session");
  if (!aiSession) {
    return NextResponse.json({ error: "PIN required" }, { status: 401 });
  }
  const tokenCheck = verifyToken(aiSession);
  if (!tokenCheck.valid || tokenCheck.userId !== session.user.id) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const { id } = await params;
  const { title } = await req.json();

  const conversation = await db.aiConversation.updateMany({
    where: { id, userId: session.user.id },
    data: { title },
  });

  if (conversation.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !isGCSStaff(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const aiSession = req.headers.get("x-ai-session");
  if (!aiSession) {
    return NextResponse.json({ error: "PIN required" }, { status: 401 });
  }
  const tokenCheck = verifyToken(aiSession);
  if (!tokenCheck.valid || tokenCheck.userId !== session.user.id) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const { id } = await params;

  const deleted = await db.aiConversation.deleteMany({
    where: { id, userId: session.user.id },
  });

  if (deleted.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
