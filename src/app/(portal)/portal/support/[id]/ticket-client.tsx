"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

type TicketMessage = {
  id: string;
  content: string;
  isInternal: boolean;
  createdAt: Date;
  author: { id: string; name: string | null; role: string };
};

type Ticket = {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
};

interface Props {
  ticket: Ticket;
  initialMessages: TicketMessage[];
  currentUserId: string;
}

export function TicketClient({ ticket, initialMessages, currentUserId }: Props) {
  const [messages, setMessages] = useState<TicketMessage[]>(initialMessages);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const closed = ["RESOLVED", "CLOSED"].includes(ticket.status);

  const sendReply = async () => {
    const text = reply.trim();
    if (!text || sending) return;
    setSending(true);
    setReply("");

    const res = await fetch(`/api/portal/tickets/${ticket.id}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });
    const json = await res.json();
    setSending(false);

    if (!res.ok) {
      toast.error(json.error ?? "Failed to send reply");
      setReply(text);
      return;
    }
    setMessages((prev) => [...prev, json]);
  };

  const statusColor: Record<string, { bg: string; color: string }> = {
    OPEN: { bg: "var(--info-bg)", color: "var(--info)" },
    IN_PROGRESS: { bg: "var(--brand-primary)18", color: "var(--brand-primary)" },
    WAITING: { bg: "var(--warning-bg)", color: "var(--warning)" },
    RESOLVED: { bg: "var(--success-bg)", color: "var(--success)" },
    CLOSED: { bg: "var(--bg-tertiary)", color: "var(--text-muted)" },
  };

  const sc = statusColor[ticket.status] ?? statusColor.OPEN;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-mono" style={{ color: "var(--text-muted)" }}>{ticket.ticketNumber}</span>
          <Badge style={{ background: sc.bg, color: sc.color }}>{ticket.status.replace("_", " ")}</Badge>
          <Badge style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>{ticket.priority}</Badge>
        </div>
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
          {ticket.subject}
        </h1>
      </div>

      <Card className="card-base">
        <CardHeader className="pb-2"><CardTitle className="text-sm" style={{ color: "var(--text-muted)" }}>Description</CardTitle></CardHeader>
        <CardContent><p className="text-sm" style={{ color: "var(--text-secondary)" }}>{ticket.description}</p></CardContent>
      </Card>

      <Card className="card-base">
        <CardHeader className="pb-2"><CardTitle className="text-sm" style={{ color: "var(--text-muted)" }}>Conversation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {messages.map((m) => {
            const isStaff = m.author.role === "ADMIN" || m.author.role === "STAFF";
            const isMe = m.author.id === currentUserId;
            const initials = m.author.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";
            return (
              <div key={m.id} className={`flex gap-3 ${isStaff ? "" : "flex-row-reverse"}`}>
                <Avatar className="h-7 w-7 flex-shrink-0">
                  <AvatarFallback className="text-xs text-white" style={{ background: isStaff ? "var(--brand-primary)" : "var(--brand-accent)" }}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className={`max-w-[80%] flex flex-col gap-1 ${isStaff ? "items-start" : "items-end"}`}>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {m.author.name} · {isStaff ? "GCS Support" : isMe ? "You" : "Client"}
                  </span>
                  <div className="px-4 py-2.5 rounded-xl text-sm" style={{
                    background: isStaff ? "var(--bg-secondary)" : "var(--brand-primary)",
                    color: isStaff ? "var(--text-primary)" : "white",
                  }}>
                    {m.content}
                  </div>
                </div>
              </div>
            );
          })}
          {messages.length === 0 && (
            <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>
              No replies yet. Our team will respond shortly.
            </p>
          )}
        </CardContent>
      </Card>

      {!closed && (
        <Card className="card-base">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Reply to this ticket</p>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Type your reply…"
              rows={4}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none resize-none"
              style={{
                background: "var(--bg-secondary)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            />
            <div className="flex justify-end">
              <Button
                onClick={sendReply}
                disabled={!reply.trim() || sending}
                className="text-white text-sm gap-1.5"
                style={{ background: "var(--brand-primary)" }}
              >
                {sending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Sending…</> : <><Send className="h-3.5 w-3.5" />Send reply</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {closed && (
        <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>
          This ticket is {ticket.status.toLowerCase()}. Open a new ticket if you need further assistance.
        </p>
      )}
    </div>
  );
}
