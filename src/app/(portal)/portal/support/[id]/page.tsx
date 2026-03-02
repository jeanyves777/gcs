import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { TicketClient } from "./ticket-client";

export const metadata: Metadata = { title: "Ticket Detail" };

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth();

  const ticket = await db.ticket.findFirst({
    where: { id, organization: { users: { some: { id: user.id } } }, deletedAt: null },
    include: {
      messages: {
        where: { OR: [{ isInternal: false }, { authorId: user.id }] },
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true, role: true } } },
      },
    },
  });
  if (!ticket) notFound();

  return (
    <TicketClient
      ticket={{
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
      }}
      initialMessages={ticket.messages.map((m) => ({
        id: m.id,
        content: m.content,
        isInternal: m.isInternal,
        createdAt: m.createdAt,
        author: m.author,
      }))}
      currentUserId={user.id}
    />
  );
}
