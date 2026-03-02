import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const metadata: Metadata = { title: "Ticket Detail" };

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  const user = await requireAuth();
  const ticket = await db.ticket.findFirst({
    where: { id: params.id, organization: { users: { some: { id: user.id } } }, deletedAt: null },
    include: {
      messages: {
        where: { OR: [{ isInternal: false }, { author: { id: user.id } }] },
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true, role: true } } },
      },
    },
  });
  if (!ticket) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-mono" style={{ color: "var(--text-muted)" }}>{ticket.ticketNumber}</span>
          <Badge style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>{ticket.status}</Badge>
          <Badge style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>{ticket.priority}</Badge>
        </div>
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>{ticket.subject}</h1>
      </div>

      <Card className="card-base">
        <CardHeader className="pb-2"><CardTitle className="text-sm" style={{ color: "var(--text-muted)" }}>Description</CardTitle></CardHeader>
        <CardContent><p className="text-sm" style={{ color: "var(--text-secondary)" }}>{ticket.description}</p></CardContent>
      </Card>

      <Card className="card-base">
        <CardHeader className="pb-2"><CardTitle className="text-sm" style={{ color: "var(--text-muted)" }}>Conversation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {ticket.messages.map((m) => {
            const isStaff = m.author.role === "ADMIN" || m.author.role === "STAFF";
            const initials = m.author.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";
            return (
              <div key={m.id} className={`flex gap-3 ${isStaff ? "" : "flex-row-reverse"}`}>
                <Avatar className="h-7 w-7 flex-shrink-0">
                  <AvatarFallback className="text-xs text-white" style={{ background: isStaff ? "var(--brand-primary)" : "var(--brand-accent)" }}>{initials}</AvatarFallback>
                </Avatar>
                <div className={`max-w-[80%] flex flex-col gap-1 ${isStaff ? "items-start" : "items-end"}`}>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{m.author.name} · {isStaff ? "GCS Support" : "You"}</span>
                  <div className="px-4 py-2.5 rounded-xl text-sm" style={{
                    background: isStaff ? "var(--bg-secondary)" : "var(--brand-primary)",
                    color: isStaff ? "var(--text-primary)" : "white",
                  }}>{m.content}</div>
                </div>
              </div>
            );
          })}
          {ticket.messages.length === 0 && <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>No replies yet. Our team will respond shortly.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
