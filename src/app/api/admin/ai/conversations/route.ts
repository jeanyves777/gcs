import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isGCSStaff } from "@/lib/auth-utils";
import { verifyToken } from "../pin/route";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
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

  const conversations = await db.aiConversation.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json(conversations);
}

export async function POST(req: NextRequest) {
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

  const { title } = await req.json().catch(() => ({ title: "New conversation" }));

  const conversation = await db.aiConversation.create({
    data: {
      title: title || "New conversation",
      userId: session.user.id,
    },
  });

  return NextResponse.json(conversation);
}
