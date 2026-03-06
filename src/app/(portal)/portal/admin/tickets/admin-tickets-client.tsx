"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Ticket, MessageSquare, Inbox, Clock, AlertTriangle, UserX } from "lucide-react";
import { formatDate } from "@/lib/utils";

type TicketItem = {
  id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  updatedAt: Date;
  organization: { name: string } | null;
  assignee: { name: string | null } | null;
  messageCount: number;
};

type StaffUser = {
  id: string;
  name: string | null;
  role: string;
};

type Stats = {
  total: number;
  open: number;
  inProgress: number;
  waiting: number;
  critical: number;
  unassigned: number;
};

interface Props {
  tickets: TicketItem[];
  staffUsers: StaffUser[];
  stats: Stats;
}

type FilterTab = "ALL" | "OPEN" | "IN_PROGRESS" | "WAITING" | "RESOLVED" | "CLOSED";

const TABS: FilterTab[] = ["ALL", "OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"];

const statusStyle: Record<string, { bg: string; color: string }> = {
  OPEN: { bg: "var(--info-bg)", color: "var(--info)" },
  IN_PROGRESS: { bg: "rgba(var(--brand-primary-rgb, 79,70,229),0.12)", color: "var(--brand-primary)" },
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

function tabLabel(tab: FilterTab): string {
  if (tab === "ALL") return "All";
  return tab.replace("_", " ");
}

export function AdminTicketsClient({ tickets, stats }: Props) {
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");

  const filtered =
    activeTab === "ALL" ? tickets : tickets.filter((t) => t.status === activeTab);

  const countFor = (tab: FilterTab) =>
    tab === "ALL" ? tickets.length : tickets.filter((t) => t.status === tab).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2.5" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
          <div className="p-1.5 rounded-lg" style={{ background: "var(--brand-primary)", color: "white" }}>
            <Ticket className="h-5 w-5" />
          </div>
          Ticket Management
        </h1>
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>
          {tickets.length} total ticket{tickets.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Open", value: stats.open, icon: Inbox, color: "var(--info)", bg: "var(--info-bg)" },
          { label: "In Progress", value: stats.inProgress, icon: Clock, color: "var(--brand-primary)", bg: "color-mix(in srgb, var(--brand-primary) 12%, transparent)" },
          { label: "Critical", value: stats.critical, icon: AlertTriangle, color: "var(--error)", bg: "var(--error-bg)" },
          { label: "Unassigned", value: stats.unassigned, icon: UserX, color: "var(--warning)", bg: "var(--warning-bg)" },
        ].map((s) => (
          <Card key={s.label} className="card-base">
            <CardContent className="p-5 flex flex-col gap-4">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: s.bg }}
              >
                <s.icon className="h-4 w-4" style={{ color: s.color }} />
              </div>
              <div>
                <p
                  className="text-2xl font-bold tabular-nums"
                  style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
                >
                  {s.value}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {s.label}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((tab) => {
          const isActive = activeTab === tab;
          const count = countFor(tab);
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: isActive ? "var(--brand-primary)" : "var(--bg-secondary)",
                color: isActive ? "white" : "var(--text-secondary)",
                border: `1px solid ${isActive ? "var(--brand-primary)" : "var(--border)"}`,
              }}
            >
              {tabLabel(tab)}
              <span
                className="px-1.5 py-0.5 rounded text-xs"
                style={{
                  background: isActive ? "rgba(255,255,255,0.25)" : "var(--bg-tertiary)",
                  color: isActive ? "white" : "var(--text-muted)",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Ticket list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Ticket className="h-10 w-10 mx-auto mb-3 opacity-30" style={{ color: "var(--text-muted)" }} />
          <p style={{ color: "var(--text-muted)" }}>
            {activeTab === "ALL" ? "No tickets yet." : `No ${tabLabel(activeTab).toLowerCase()} tickets.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((ticket) => {
            const ss = statusStyle[ticket.status] ?? statusStyle.OPEN;
            const ps = priorityStyle[ticket.priority] ?? priorityStyle.LOW;
            return (
              <Link key={ticket.id} href={`/portal/admin/tickets/${ticket.id}`}>
                <Card className="card-base hover:border-[var(--brand-primary)] transition-all cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2 mb-1">
                          <span
                            className="text-xs font-mono flex-shrink-0"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {ticket.ticketNumber}
                          </span>
                          <Badge
                            className="text-xs flex-shrink-0"
                            style={{ background: ss.bg, color: ss.color }}
                          >
                            {ticket.status.replace("_", " ")}
                          </Badge>
                          <Badge
                            className="text-xs flex-shrink-0"
                            style={{ background: ps.bg, color: ps.color }}
                          >
                            {ticket.priority}
                          </Badge>
                        </div>
                        <p
                          className="font-medium text-sm truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {ticket.subject}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                          {ticket.organization?.name ?? "—"} · Updated {formatDate(ticket.updatedAt)}
                        </p>
                      </div>

                      {/* Right side meta */}
                      <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                        <div
                          className="flex items-center gap-1 text-xs"
                          style={{ color: "var(--text-muted)" }}
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          {ticket.messageCount}
                        </div>
                        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                          {ticket.assignee?.name ?? "Unassigned"}
                        </span>
                        <Button
                          asChild
                          size="sm"
                          className="h-7 text-xs text-white"
                          style={{ background: "var(--brand-primary)" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link href={`/portal/admin/tickets/${ticket.id}`}>View</Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
