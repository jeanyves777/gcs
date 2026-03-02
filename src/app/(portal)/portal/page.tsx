import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { FolderKanban, Headphones, Receipt, Bell, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export const metadata: Metadata = { title: "Dashboard" };

export default async function PortalDashboardPage() {
  const user = await requireAuth();

  const [projectCount, openTickets, unpaidInvoices, unreadNotifications] = await Promise.all([
    db.project.count({ where: { organization: { users: { some: { id: user.id } } }, deletedAt: null } }),
    db.ticket.count({ where: { organization: { users: { some: { id: user.id } } }, status: { in: ["OPEN", "IN_PROGRESS"] }, deletedAt: null } }),
    db.invoice.count({ where: { organization: { users: { some: { id: user.id } } }, status: { in: ["SENT", "OVERDUE"] }, deletedAt: null } }),
    db.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);

  const stats = [
    { label: "Active Projects", value: projectCount, icon: FolderKanban, href: "/portal/projects", color: "var(--brand-primary)" },
    { label: "Open Tickets", value: openTickets, icon: Headphones, href: "/portal/support", color: "var(--warning)" },
    { label: "Unpaid Invoices", value: unpaidInvoices, icon: Receipt, href: "/portal/invoices", color: openTickets > 0 ? "var(--error)" : "var(--success)" },
    { label: "Notifications", value: unreadNotifications, icon: Bell, href: "/portal/notifications", color: "var(--brand-accent)" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
          Welcome back, {user.name?.split(" ")[0] ?? "there"} 👋
        </h1>
        <p className="mt-1" style={{ color: "var(--text-secondary)" }}>Here&apos;s an overview of your account.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, href, color }) => (
          <Link key={label} href={href}>
            <Card className="card-base hover:shadow-md transition-all cursor-pointer group">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                    <Icon className="h-4.5 w-4.5" style={{ color }} />
                  </div>
                  <TrendingUp className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color }} />
                </div>
                <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{value}</p>
                <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>{label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick links */}
      <Card className="card-base">
        <CardHeader className="pb-3">
          <CardTitle className="text-base" style={{ color: "var(--text-primary)" }}>Quick actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { href: "/portal/projects", label: "View projects", desc: "Track progress and milestones" },
              { href: "/portal/support/new", label: "Open a ticket", desc: "Report an issue or request" },
              { href: "/portal/invoices", label: "View invoices", desc: "Check billing and payments" },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="p-4 rounded-lg border transition-colors hover:border-[var(--brand-primary)] hover:bg-[var(--bg-secondary)]" style={{ borderColor: "var(--border)" }}>
                <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{item.label}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{item.desc}</p>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
