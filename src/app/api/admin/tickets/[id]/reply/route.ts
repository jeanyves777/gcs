import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isGCSStaff } from "@/lib/auth-utils";
import { z } from "zod";

const schema = z.object({
  content: z.string().min(1).max(10000),
  isInternal: z.boolean().default(false),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user || !isGCSStaff(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message ?? "Invalid data" }, { status: 400 });
    }

    const { content, isInternal } = result.data;

    const ticket = await db.ticket.findUnique({ where: { id } });
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    const message = await db.ticketMessage.create({
      data: {
        ticketId: id,
        authorId: session.user.id,
        content,
        isInternal,
      },
      include: { author: { select: { id: true, name: true, role: true } } },
    });

    // Update ticket to WAITING (waiting for client response) if not internal
    if (!isInternal && ticket.status === "IN_PROGRESS") {
      await db.ticket.update({ where: { id }, data: { status: "WAITING" } });
    }

    // Notify org users (if not internal)
    if (!isInternal) {
      const orgUsers = await db.user.findMany({
        where: { organizationId: ticket.organizationId, isActive: true, role: { in: ["CLIENT_ADMIN", "CLIENT_USER"] } },
        select: { id: true },
      });
      await db.notification.createMany({
        data: orgUsers.map((u) => ({
          userId: u.id,
          type: "TICKET_REPLY",
          title: `GCS replied on ${ticket.ticketNumber}`,
          content: content.slice(0, 100),
          link: `/portal/support/${id}`,
        })),
      });
    }

    return NextResponse.json(message);
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
