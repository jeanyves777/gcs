import type { Metadata } from "next";
import { requireRole, getCurrentUser } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  FolderOpen,
  MessageCircle,
  Receipt,
  Users,
  LayoutDashboard,
  Building2,
  ChevronRight,
  Clock,
  AlertTriangle,
} from "lucide-react";

export const metadata: Metadata = { title: "Admin Overview" };

export default async function AdminOverviewPage() {
  const user = await requireRole(["ADMIN", "STAFF"]);

  const currentUser = await getCurrentUser();
  const fullUser = currentUser
    ? await db.user.findUnique({ where: { id: currentUser.id }, select: { name: true } })
    : null;

  const [
    openTickets,
    unpaidInvoices,
    activeProjects,
    totalUsers,
    totalOrgs,
    overdueInvoices,
    recentTickets,
    recentProjects,
  ] = await Promise.all([
    db.ticket.count({
      where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING"] }, deletedAt: null },
    }),
    db.invoice.count({
      where: { status: { in: ["SENT", "OVERDUE"] } },
    }),
    db.project.count({
      where: { status: { in: ["PLANNING", "ACTIVE"] }, deletedAt: null },
    }),
    db.user.count({
      where: { isActive: true },
    }),
    db.organization.count({
      where: { deletedAt: null },
    }),
    db.invoice.count({
      where: { status: "OVERDUE" },
    }),
    db.ticket.findMany({
      where: { deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        ticketNumber: true,
        subject: true,
        status: true,
        priority: true,
        updatedAt: true,
        organization: { select: { name: true } },
      },
    }),
    db.project.findMany({
      where: { deletedAt: null, status: { in: ["PLANNING", "ACTIVE"] } },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        status: true,
        organization: { select: { name: true } },
        _count: { select: { tasks: true } },
      },
    }),
  ]);

  const stats = [
    {
      label: "Open Tickets",
      value: openTickets,
      icon: MessageCircle,
      color: "var(--info)",
      bg: "var(--info-bg)",
      href: "/portal/admin/tickets",
    },
    {
      label: "Unpaid Invoices",
      value: unpaidInvoices,
      icon: Receipt,
      color: "var(--warning)",
      bg: "var(--warning-bg)",
      href: "/portal/admin/invoices",
    },
    {
      label: "Active Projects",
      value: activeProjects,
      icon: FolderOpen,
      color: "var(--brand-primary)",
      bg: "color-mix(in srgb, var(--brand-primary) 12%, transparent)",
      href: "/portal/admin/projects",
    },
    {
      label: "Active Users",
      value: totalUsers,
      icon: Users,
      color: "var(--success)",
      bg: "var(--success-bg)",
      href: "/portal/admin/users",
    },
    {
      label: "Organizations",
      value: totalOrgs,
      icon: Building2,
      color: "var(--text-secondary)",
      bg: "var(--bg-tertiary)",
      href: "/portal/admin/organizations",
    },
    {
      label: "Overdue Invoices",
      value: overdueInvoices,
      icon: AlertTriangle,
      color: "var(--error)",
      bg: "var(--error-bg)",
      href: "/portal/admin/invoices",
    },
  ];

  const ticketStatusStyle: Record<string, { bg: string; color: string }> = {
    OPEN: { bg: "var(--info-bg)", color: "var(--info)" },
    IN_PROGRESS: { bg: "color-mix(in srgb, var(--brand-primary) 12%, transparent)", color: "var(--brand-primary)" },
    WAITING: { bg: "var(--warning-bg)", color: "var(--warning)" },
    RESOLVED: { bg: "var(--success-bg)", color: "var(--success)" },
    CLOSED: { bg: "var(--bg-tertiary)", color: "var(--text-muted)" },
  };

  const projectStatusStyle: Record<string, { bg: string; color: string }> = {
    PLANNING: { bg: "var(--info-bg)", color: "var(--info)" },
    ACTIVE: { bg: "var(--success-bg)", color: "var(--success)" },
    ON_HOLD: { bg: "var(--warning-bg)", color: "var(--warning)" },
  };

  const priorityStyle: Record<string, { bg: string; color: string }> = {
    CRITICAL: { bg: "var(--error-bg)", color: "var(--error)" },
    HIGH: { bg: "var(--warning-bg)", color: "var(--warning)" },
    MEDIUM: { bg: "var(--info-bg)", color: "var(--info)" },
    LOW: { bg: "var(--bg-tertiary)", color: "var(--text-muted)" },
  };

  const firstName = fullUser?.name?.split(" ")[0] ?? "Admin";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div
        className="rounded-xl p-6 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, var(--brand-primary), color-mix(in srgb, var(--brand-primary) 70%, #000))",
        }}
      >
        <div className="relative z-10">
          <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
            {greeting},
          </p>
          <h1
            className="text-2xl font-bold mt-0.5"
            style={{ color: "white", fontFamily: "var(--font-display)" }}
          >
            {firstName}
          </h1>
          <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.7)" }}>
            Here&apos;s what&apos;s happening across your platform today.
          </p>
        </div>
        {/* Decorative circles */}
        <div
          className="absolute -top-10 -right-10 w-40 h-40 rounded-full"
          style={{ background: "rgba(255,255,255,0.08)" }}
        />
        <div
          className="absolute -bottom-6 -right-2 w-24 h-24 rounded-full"
          style={{ background: "rgba(255,255,255,0.05)" }}
        />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="card-base hover:shadow-md transition-shadow cursor-pointer group h-full">
              <CardContent className="p-4 flex flex-col gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: s.bg }}
                >
                  <s.icon className="h-4 w-4" style={{ color: s.color }} />
                </div>
                <div>
                  <p
                    className="text-2xl font-bold tabular-nums"
                    style={{
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    {s.value}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {s.label}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Two-column: Recent Tickets + Active Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tickets */}
        <Card className="card-base">
          <CardContent className="p-0">
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-2">
                <MessageCircle
                  className="h-4 w-4"
                  style={{ color: "var(--info)" }}
                />
                <h2
                  className="font-semibold text-sm"
                  style={{ color: "var(--text-primary)" }}
                >
                  Recent Tickets
                </h2>
              </div>
              <Link
                href="/portal/admin/tickets"
                className="text-xs font-medium flex items-center gap-0.5 hover:underline"
                style={{ color: "var(--brand-primary)" }}
              >
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {recentTickets.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  No tickets yet
                </p>
              </div>
            ) : (
              <div
                className="divide-y"
                style={{ borderColor: "var(--border)" }}
              >
                {recentTickets.map((t) => {
                  const ts = ticketStatusStyle[t.status] ?? ticketStatusStyle.OPEN;
                  const ps = priorityStyle[t.priority] ?? priorityStyle.LOW;
                  return (
                    <Link
                      key={t.id}
                      href={`/portal/admin/tickets/${t.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {t.subject}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className="text-[11px] font-mono"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {t.ticketNumber}
                          </span>
                          <span
                            className="text-[11px]"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {t.organization?.name ?? "—"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Badge
                          className="text-[10px] border-0"
                          style={{ background: ps.bg, color: ps.color }}
                        >
                          {t.priority}
                        </Badge>
                        <Badge
                          className="text-[10px] border-0"
                          style={{ background: ts.bg, color: ts.color }}
                        >
                          {t.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Projects */}
        <Card className="card-base">
          <CardContent className="p-0">
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-2">
                <FolderOpen
                  className="h-4 w-4"
                  style={{ color: "var(--brand-primary)" }}
                />
                <h2
                  className="font-semibold text-sm"
                  style={{ color: "var(--text-primary)" }}
                >
                  Active Projects
                </h2>
              </div>
              <Link
                href="/portal/admin/projects"
                className="text-xs font-medium flex items-center gap-0.5 hover:underline"
                style={{ color: "var(--brand-primary)" }}
              >
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {recentProjects.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  No active projects
                </p>
              </div>
            ) : (
              <div
                className="divide-y"
                style={{ borderColor: "var(--border)" }}
              >
                {recentProjects.map((p) => {
                  const ps =
                    projectStatusStyle[p.status] ?? projectStatusStyle.PLANNING;
                  return (
                    <Link
                      key={p.id}
                      href={`/portal/admin/projects/${p.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {p.name}
                        </p>
                        <p
                          className="text-[11px] mt-0.5"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {p.organization?.name ?? "—"} &middot;{" "}
                          {p._count.tasks} task{p._count.tasks !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <Badge
                        className="text-[10px] border-0 flex-shrink-0"
                        style={{ background: ps.bg, color: ps.color }}
                      >
                        {p.status.replace("_", " ")}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          {
            href: "/portal/admin/users",
            icon: Users,
            label: "Manage Users",
            desc: "View, activate/deactivate and change roles",
            color: "var(--success)",
            bg: "var(--success-bg)",
          },
          {
            href: "/portal/admin/organizations",
            icon: Building2,
            label: "Manage Organizations",
            desc: "Browse all client organizations",
            color: "var(--brand-primary)",
            bg: "color-mix(in srgb, var(--brand-primary) 12%, transparent)",
          },
          {
            href: "/portal/admin/projects",
            icon: FolderOpen,
            label: "Manage Projects",
            desc: "Oversee all active and planned projects",
            color: "var(--info)",
            bg: "var(--info-bg)",
          },
          {
            href: "/portal/admin/tickets",
            icon: MessageCircle,
            label: "Manage Tickets",
            desc: "Assign and resolve support tickets",
            color: "var(--warning)",
            bg: "var(--warning-bg)",
          },
          {
            href: "/portal/admin/invoices",
            icon: Receipt,
            label: "Manage Invoices",
            desc: "Create, send and track invoices",
            color: "var(--error)",
            bg: "var(--error-bg)",
          },
          {
            href: "/portal/admin/guard/internal",
            icon: Clock,
            label: "Internal Monitor",
            desc: "Security scanning and server health",
            color: "var(--text-secondary)",
            bg: "var(--bg-tertiary)",
          },
        ].map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="card-base h-full hover:border-[var(--brand-primary)] hover:shadow-sm transition-all cursor-pointer group">
              <CardContent className="p-4 flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: link.bg }}
                >
                  <link.icon
                    className="h-5 w-5"
                    style={{ color: link.color }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="font-medium text-sm group-hover:text-[var(--brand-primary)] transition-colors"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {link.label}
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {link.desc}
                  </p>
                </div>
                <ChevronRight
                  className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  style={{ color: "var(--brand-primary)" }}
                />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
