"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, Send, Lock } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  createdAt: Date;
  updatedAt: Date;
  organization: { name: string } | null;
  assignee: { id: string; name: string | null } | null;
  messages: TicketMessage[];
};

type StaffUser = {
  id: string;
  name: string | null;
  role: string;
};

interface Props {
  ticket: Ticket;
  staffUsers: StaffUser[];
}

// ---------------------------------------------------------------------------
// Style maps
// ---------------------------------------------------------------------------

const statusStyle: Record<string, { bg: string; color: string }> = {
  OPEN: { bg: "var(--info-bg)", color: "var(--info)" },
  IN_PROGRESS: { bg: "rgba(79,70,229,0.12)", color: "var(--brand-primary)" },
  WAITING: { bg: "var(--warning-bg)", color: "var(--warning)" },
  RESOLVED: { bg: "var(--success-bg)", color: "var(--success)" },
  CLOSED: { bg: "var(--bg-tertiary)", color: "var(--text-muted)" },
};

const priorityStyle: Record<string, { bg: string; color: string }> = {
  CRITICAL: { bg: "var(--error-bg)", color: "var(--error)" },
  HIGH: { bg: "var(--warning-bg)", color: "var(--warning)" },
  MEDIUM: { bg: "var(--info-bg)", color: "var(--info)" },
  LOW: { bg: "var(--bg-tertiary)", color: "var(--text-muted)" },
};

const STATUS_OPTIONS = ["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AdminTicketDetailClient({ ticket, staffUsers }: Props) {
  const [messages, setMessages] = useState<TicketMessage[]>(ticket.messages);
  const [status, setStatus] = useState(ticket.status);
  const [assigneeId, setAssigneeId] = useState<string>(ticket.assignee?.id ?? "UNASSIGNED");
  const [reply, setReply] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingAssignee, setUpdatingAssignee] = useState(false);

  const ss = statusStyle[status] ?? statusStyle.OPEN;
  const ps = priorityStyle[ticket.priority] ?? priorityStyle.LOW;

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus);
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/admin/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to update status");
        setStatus(status);
        return;
      }
      toast.success("Status updated");
    } catch {
      toast.error("Failed to update status");
      setStatus(status);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAssigneeChange = async (value: string) => {
    setAssigneeId(value);
    setUpdatingAssignee(true);
    try {
      const res = await fetch(`/api/admin/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeId: value === "UNASSIGNED" ? null : value }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to update assignee");
        setAssigneeId(assigneeId);
        return;
      }
      toast.success("Assignee updated");
    } catch {
      toast.error("Failed to update assignee");
      setAssigneeId(assigneeId);
    } finally {
      setUpdatingAssignee(false);
    }
  };

  const handleSendReply = async () => {
    const text = reply.trim();
    if (!text || sending) return;
    setSending(true);
    const prevReply = reply;
    setReply("");

    try {
      const res = await fetch(`/api/admin/tickets/${ticket.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, isInternal }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to send reply");
        setReply(prevReply);
        return;
      }
      // Optimistic append
      setMessages((prev) => [...prev, json]);
      setIsInternal(false);
      toast.success(isInternal ? "Internal note added" : "Reply sent");
    } catch {
      toast.error("Failed to send reply");
      setReply(prevReply);
    } finally {
      setSending(false);
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Back link + header */}
      <div>
        <Link
          href="/portal/admin/tickets"
          className="inline-flex items-center gap-1.5 text-sm mb-3 hover:opacity-80 transition-opacity"
          style={{ color: "var(--text-muted)" }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All tickets
        </Link>

        <div className="flex items-start gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span
                className="text-sm font-mono"
                style={{ color: "var(--text-muted)" }}
              >
                {ticket.ticketNumber}
              </span>
              <Badge style={{ background: ss.bg, color: ss.color }}>
                {status.replace("_", " ")}
              </Badge>
              <Badge style={{ background: ps.bg, color: ps.color }}>
                {ticket.priority}
              </Badge>
            </div>
            <h1
              className="text-xl font-bold"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
            >
              {ticket.subject}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
              {ticket.organization?.name ?? "—"} · Opened {formatDate(ticket.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
        {/* Left: conversation thread */}
        <div className="space-y-4 min-w-0">
          {/* Description card */}
          <Card className="card-base">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm" style={{ color: "var(--text-muted)" }}>
                Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
                {ticket.description}
              </p>
            </CardContent>
          </Card>

          {/* Conversation */}
          <Card className="card-base">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm" style={{ color: "var(--text-muted)" }}>
                Conversation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {messages.length === 0 && (
                <p
                  className="text-sm text-center py-4"
                  style={{ color: "var(--text-muted)" }}
                >
                  No messages yet.
                </p>
              )}
              {messages.map((m) => {
                const isStaff = m.author.role === "ADMIN" || m.author.role === "STAFF";
                const initials =
                  m.author.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() ?? "?";

                return (
                  <div key={m.id}>
                    {/* Internal note wrapper */}
                    {m.isInternal && (
                      <div
                        className="rounded-xl p-3 space-y-2 border"
                        style={{
                          background: "var(--warning-bg)",
                          borderColor: "var(--warning)",
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          <Lock
                            className="h-3 w-3"
                            style={{ color: "var(--warning)" }}
                          />
                          <span
                            className="text-xs font-semibold uppercase tracking-wide"
                            style={{ color: "var(--warning)" }}
                          >
                            Internal note
                          </span>
                        </div>
                        <div className="flex gap-3">
                          <Avatar className="h-7 w-7 flex-shrink-0">
                            <AvatarFallback
                              className="text-xs text-white"
                              style={{ background: "var(--brand-primary)" }}
                            >
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col gap-1 flex-1 min-w-0">
                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                              {m.author.name} · {new Date(m.createdAt).toLocaleString()}
                            </span>
                            <p
                              className="text-sm whitespace-pre-wrap"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {m.content}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Regular message */}
                    {!m.isInternal && (
                      <div className={`flex gap-3 ${isStaff ? "" : "flex-row-reverse"}`}>
                        <Avatar className="h-7 w-7 flex-shrink-0">
                          <AvatarFallback
                            className="text-xs text-white"
                            style={{
                              background: isStaff
                                ? "var(--brand-primary)"
                                : "var(--brand-accent)",
                            }}
                          >
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`max-w-[80%] flex flex-col gap-1 ${
                            isStaff ? "items-start" : "items-end"
                          }`}
                        >
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                            {m.author.name} ·{" "}
                            {isStaff ? "GCS Support" : "Client"} ·{" "}
                            {new Date(m.createdAt).toLocaleString()}
                          </span>
                          <div
                            className="px-4 py-2.5 rounded-xl text-sm whitespace-pre-wrap"
                            style={{
                              background: isStaff
                                ? "var(--bg-secondary)"
                                : "var(--brand-primary)",
                              color: isStaff ? "var(--text-primary)" : "white",
                            }}
                          >
                            {m.content}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Reply form */}
          <Card className="card-base">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                Reply to this ticket
              </p>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder={isInternal ? "Write an internal note…" : "Type your reply…"}
                rows={4}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none resize-none transition-colors"
                style={{
                  background: isInternal ? "var(--warning-bg)" : "var(--bg-secondary)",
                  borderColor: isInternal ? "var(--warning)" : "var(--border)",
                  color: "var(--text-primary)",
                }}
              />
              <div className="flex items-center justify-between gap-3 flex-wrap">
                {/* Internal note toggle */}
                <label
                  className="flex items-center gap-2 cursor-pointer select-none"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                    className="accent-[var(--warning)] w-4 h-4 rounded"
                  />
                  <Lock className="h-3.5 w-3.5" style={{ color: isInternal ? "var(--warning)" : "var(--text-muted)" }} />
                  <span className="text-sm">
                    Internal note{" "}
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      (only visible to staff)
                    </span>
                  </span>
                </label>

                <Button
                  onClick={handleSendReply}
                  disabled={!reply.trim() || sending}
                  className="text-white text-sm gap-1.5"
                  style={{
                    background: isInternal ? "var(--warning)" : "var(--brand-primary)",
                  }}
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      {isInternal ? "Add note" : "Send reply"}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: controls panel */}
        <div className="space-y-4">
          <Card className="card-base">
            <CardHeader className="pb-3">
              <CardTitle
                className="text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Ticket Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Status */}
              <div className="space-y-1.5">
                <Label
                  className="text-xs font-medium"
                  style={{ color: "var(--text-muted)" }}
                >
                  Status
                </Label>
                <div className="relative">
                  <Select
                    value={status}
                    onValueChange={handleStatusChange}
                    disabled={updatingStatus}
                  >
                    <SelectTrigger
                      className="w-full text-sm"
                      style={{
                        background: "var(--bg-secondary)",
                        borderColor: "var(--border)",
                        color: "var(--text-primary)",
                      }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {updatingStatus && (
                    <Loader2
                      className="absolute right-8 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin"
                      style={{ color: "var(--text-muted)" }}
                    />
                  )}
                </div>
              </div>

              {/* Assignee */}
              <div className="space-y-1.5">
                <Label
                  className="text-xs font-medium"
                  style={{ color: "var(--text-muted)" }}
                >
                  Assigned to
                </Label>
                <div className="relative">
                  <Select
                    value={assigneeId}
                    onValueChange={handleAssigneeChange}
                    disabled={updatingAssignee}
                  >
                    <SelectTrigger
                      className="w-full text-sm"
                      style={{
                        background: "var(--bg-secondary)",
                        borderColor: "var(--border)",
                        color: "var(--text-primary)",
                      }}
                    >
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
                      {staffUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name ?? u.id}{" "}
                          <span style={{ color: "var(--text-muted)" }}>
                            ({u.role})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {updatingAssignee && (
                    <Loader2
                      className="absolute right-8 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin"
                      style={{ color: "var(--text-muted)" }}
                    />
                  )}
                </div>
              </div>

              {/* Meta */}
              <div
                className="pt-3 border-t space-y-2"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Organization
                  </span>
                  <span
                    className="text-xs font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {ticket.organization?.name ?? "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Priority
                  </span>
                  <Badge
                    className="text-xs"
                    style={{ background: ps.bg, color: ps.color }}
                  >
                    {ticket.priority}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Created
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {formatDate(ticket.createdAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Last updated
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {formatDate(ticket.updatedAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Messages
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {messages.length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
