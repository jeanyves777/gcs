import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { AdminTicketsClient } from "./admin-tickets-client";

export const metadata: Metadata = { title: "Admin – Tickets" };

export default async function AdminTicketsPage() {
  await requireRole(["ADMIN", "STAFF"]);

  const [tickets, staffUsers] = await Promise.all([
    db.ticket.findMany({
      include: {
        organization: { select: { name: true } },
        assignee: { select: { name: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    db.user.findMany({
      where: { role: { in: ["ADMIN", "STAFF"] } },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <AdminTicketsClient
      tickets={tickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        updatedAt: t.updatedAt,
        organization: t.organization,
        assignee: t.assignee,
        messageCount: t._count.messages,
      }))}
      staffUsers={staffUsers}
    />
  );
}
