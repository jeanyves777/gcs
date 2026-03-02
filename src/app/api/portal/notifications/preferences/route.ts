import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const DEFAULT_PREFS = {
  project_updates: true,
  ticket_replies: true,
  invoice_notifications: true,
  chat_messages: false,
  system_announcements: true,
};

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { notificationPrefs: true } });
  const prefs = user?.notificationPrefs ? JSON.parse(user.notificationPrefs) : DEFAULT_PREFS;

  return NextResponse.json({ prefs: { ...DEFAULT_PREFS, ...prefs } });
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { prefs } = await req.json();
    if (!prefs || typeof prefs !== "object") {
      return NextResponse.json({ error: "Invalid preferences" }, { status: 400 });
    }

    const sanitized = {
      project_updates: Boolean(prefs.project_updates),
      ticket_replies: Boolean(prefs.ticket_replies),
      invoice_notifications: Boolean(prefs.invoice_notifications),
      chat_messages: Boolean(prefs.chat_messages),
      system_announcements: Boolean(prefs.system_announcements),
    };

    await db.user.update({
      where: { id: session.user.id },
      data: { notificationPrefs: JSON.stringify(sanitized) },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
