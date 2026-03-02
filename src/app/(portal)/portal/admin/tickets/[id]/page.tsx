import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { AdminTicketDetailClient } from "./admin-ticket-detail-client";

export const metadata: Metadata = { title: "Admin – Ticket Detail" };

export default async function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireRole(["ADMIN", "STAFF"]);

  const [ticket, staffUsers] = await Promise.all([
    db.ticket.findFirst({
      where: { id, deletedAt: null },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          include: {
            author: { select: { id: true, name: true, role: true } },
          },
        },
        organization: { select: { name: true } },
        assignee: { select: { id: true, name: true } },
      },
    }),
    db.user.findMany({
      where: { role: { in: ["ADMIN", "STAFF"] } },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!ticket) notFound();

  return (
    <AdminTicketDetailClient
      ticket={{
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        organization: ticket.organization,
        assignee: ticket.assignee,
        messages: ticket.messages.map((m) => ({
          id: m.id,
          content: m.content,
          isInternal: m.isInternal,
          createdAt: m.createdAt,
          author: m.author,
        })),
      }}
      staffUsers={staffUsers}
    />
  );
}
