import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { FolderOpen, MessageCircle, Receipt, Users, LayoutDashboard } from "lucide-react";

export const metadata: Metadata = { title: "Admin Overview" };

export default async function AdminOverviewPage() {
  await requireRole(["ADMIN", "STAFF"]);

  const [openTickets, unpaidInvoices, activeProjects, totalUsers] = await Promise.all([
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
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2.5" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
          <div className="p-1.5 rounded-lg" style={{ background: "var(--brand-primary)", color: "white" }}>
            <LayoutDashboard className="h-5 w-5" />
          </div>
          Admin Overview
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          System-wide statistics at a glance
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="card-base hover:shadow-md transition-shadow cursor-pointer group">
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
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { href: "/portal/admin/users", label: "Manage Users", desc: "View, activate/deactivate and change roles" },
          { href: "/portal/admin/organizations", label: "Manage Organizations", desc: "Browse all client organizations" },
          { href: "/portal/admin/projects", label: "Manage Projects", desc: "Oversee all active and planned projects" },
          { href: "/portal/admin/tickets", label: "Manage Tickets", desc: "Assign and resolve support tickets" },
          { href: "/portal/admin/invoices", label: "Manage Invoices", desc: "Create, send and track invoices" },
        ].map((link) => (
          <Link key={link.href} href={link.href}>
            <Card
              className="card-base hover:border-[var(--brand-primary)] transition-all cursor-pointer group"
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p
                    className="font-medium text-sm group-hover:text-[var(--brand-primary)] transition-colors"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {link.label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {link.desc}
                  </p>
                </div>
                <svg
                  className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  style={{ color: "var(--brand-primary)" }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
