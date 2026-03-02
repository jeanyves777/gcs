import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { subject, description, category, priority } = await req.json();

    if (!subject || !description || !category || !priority) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    // Generate ticket number: TICK-YYYYMMDD-XXXX
    const count = await db.ticket.count();
    const ticketNumber = `TICK-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}-${String(count + 1).padStart(4, "0")}`;

    // SLA: CRITICAL = 4h, HIGH = 8h, MEDIUM = 24h, LOW = 72h
    const slaHours: Record<string, number> = { CRITICAL: 4, HIGH: 8, MEDIUM: 24, LOW: 72 };
    const slaDeadline = new Date(Date.now() + (slaHours[priority] ?? 24) * 3600 * 1000);

    const ticket = await db.ticket.create({
      data: {
        ticketNumber,
        subject,
        description,
        category,
        priority,
        status: "OPEN",
        organizationId: user.organizationId,
        slaDeadline,
      },
    });

    // Notify GCS admins
    const admins = await db.user.findMany({ where: { role: { in: ["ADMIN", "STAFF"] }, isActive: true } });
    if (admins.length > 0) {
      await db.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: "NEW_TICKET",
          title: `New ticket: ${subject}`,
          content: `From ${user.organization?.name ?? user.name ?? user.email} · Priority: ${priority}`,
          link: `/portal/support/${ticket.id}`,
        })),
      });
    }

    return NextResponse.json({ success: true, ticketId: ticket.id });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
