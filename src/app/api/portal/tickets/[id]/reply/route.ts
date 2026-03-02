import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ticket = await db.ticket.findFirst({
      where: {
        id,
        deletedAt: null,
        organization: { users: { some: { id: session.user.id } } },
      },
    });

    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    if (["RESOLVED", "CLOSED"].includes(ticket.status)) {
      return NextResponse.json({ error: "Cannot reply to a closed ticket" }, { status: 400 });
    }

    const { content } = await req.json();
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "Reply content required" }, { status: 400 });
    }

    const message = await db.ticketMessage.create({
      data: {
        ticketId: id,
        authorId: session.user.id,
        content: content.trim(),
        isInternal: false,
      },
      include: { author: { select: { id: true, name: true, role: true } } },
    });

    // Reopen ticket if it was WAITING
    if (ticket.status === "WAITING") {
      await db.ticket.update({ where: { id }, data: { status: "IN_PROGRESS" } });
    }

    // Notify assigned staff + all ADMIN/STAFF
    const staffUsers = await db.user.findMany({
      where: {
        OR: [
          { id: ticket.assignedTo ?? "" },
          { role: { in: ["ADMIN", "STAFF"] }, isActive: true },
        ],
      },
      select: { id: true },
    });

    const uniqueStaff = [...new Map(staffUsers.map((u) => [u.id, u])).values()].filter(
      (u) => u.id !== session.user.id
    );

    if (uniqueStaff.length > 0) {
      await db.notification.createMany({
        data: uniqueStaff.map((u) => ({
          userId: u.id,
          type: "TICKET_REPLY",
          title: `New reply on ${ticket.ticketNumber}`,
          content: content.trim().slice(0, 100),
          link: `/portal/admin/tickets/${id}`,
        })),
      });
    }

    return NextResponse.json(message);
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
