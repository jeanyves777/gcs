"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Receipt, Plus, Eye, Pencil, DollarSign, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

type Invoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  amount: number;
  tax: number;
  currency: string;
  dueDate: Date | null;
  notes: string | null;
  createdAt: Date;
  organization: { name: string };
};

type FilterTab = "ALL" | "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";

const TABS: FilterTab[] = ["ALL", "DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"];

const statusStyle: Record<string, { bg: string; color: string }> = {
  DRAFT: { bg: "var(--bg-tertiary)", color: "var(--text-muted)" },
  SENT: { bg: "var(--info-bg)", color: "var(--info)" },
  PAID: { bg: "var(--success-bg)", color: "var(--success)" },
  OVERDUE: { bg: "var(--error-bg)", color: "var(--error)" },
  CANCELLED: { bg: "var(--bg-tertiary)", color: "var(--text-muted)" },
};

type Stats = {
  totalRevenue: number;
  unpaidAmount: number;
  overdueCount: number;
  paidThisMonth: number;
  totalCount: number;
};

export function AdminInvoicesClient({ invoices, stats }: { invoices: Invoice[]; stats: Stats }) {
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");

  const filtered =
    activeTab === "ALL" ? invoices : invoices.filter((inv) => inv.status === activeTab);

  const statCards = [
    {
      label: "Total Revenue",
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      color: "var(--success)",
      bg: "var(--success-bg)",
    },
    {
      label: "Unpaid Amount",
      value: formatCurrency(stats.unpaidAmount),
      icon: TrendingUp,
      color: "var(--warning)",
      bg: "var(--warning-bg)",
    },
    {
      label: "Overdue",
      value: stats.overdueCount,
      icon: AlertTriangle,
      color: "var(--error)",
      bg: "var(--error-bg)",
    },
    {
      label: "Paid This Month",
      value: formatCurrency(stats.paidThisMonth),
      icon: CheckCircle2,
      color: "var(--info)",
      bg: "var(--info-bg)",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1
          className="text-2xl font-bold flex items-center gap-2.5"
          style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
        >
          <div
            className="p-1.5 rounded-lg"
            style={{ background: "var(--brand-primary)", color: "white" }}
          >
            <Receipt className="h-5 w-5" />
          </div>
          Invoices
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          {stats.totalCount} total invoice{stats.totalCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => (
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

      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        {/* Filter tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          {TABS.map((tab) => {
            const count =
              tab === "ALL"
                ? invoices.length
                : invoices.filter((inv) => inv.status === tab).length;
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                style={{
                  background: isActive ? "var(--brand-primary)" : "var(--bg-secondary)",
                  color: isActive ? "#fff" : "var(--text-secondary)",
                  border: "1px solid",
                  borderColor: isActive ? "var(--brand-primary)" : "var(--border)",
                }}
              >
                {tab}
                <span
                  className="ml-1.5 tabular-nums"
                  style={{ opacity: isActive ? 0.85 : 0.6 }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Create button */}
        <Link href="/portal/admin/invoices/new" className="flex-shrink-0">
          <Button
            size="sm"
            className="gap-1.5 text-white"
            style={{ background: "var(--brand-primary)" }}
          >
            <Plus className="h-4 w-4" />
            Create invoice
          </Button>
        </Link>
      </div>

      {/* Invoice list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Receipt
            className="h-10 w-10 mx-auto mb-3 opacity-30"
            style={{ color: "var(--text-muted)" }}
          />
          <p style={{ color: "var(--text-muted)" }}>
            {activeTab === "ALL" ? "No invoices yet." : `No ${activeTab.toLowerCase()} invoices.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((inv) => {
            const style = statusStyle[inv.status] ?? statusStyle.DRAFT;
            const total = inv.amount + inv.tax;
            return (
              <Card key={inv.id} className="card-base">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className="text-xs font-mono font-medium"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {inv.invoiceNumber}
                        </span>
                        <Badge
                          className="text-xs border-0"
                          style={{ background: style.bg, color: style.color }}
                        >
                          {inv.status}
                        </Badge>
                      </div>
                      <p
                        className="font-medium text-sm mb-0.5"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {inv.organization.name}
                      </p>
                      {inv.notes && (
                        <p
                          className="text-xs truncate"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {inv.notes}
                        </p>
                      )}
                      {inv.dueDate && (
                        <p
                          className="text-xs mt-1"
                          style={{
                            color:
                              inv.status === "OVERDUE" ? "var(--error)" : "var(--text-muted)",
                          }}
                        >
                          Due {formatDate(inv.dueDate)}
                        </p>
                      )}
                    </div>

                    {/* Amount + actions */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <p
                        className="font-semibold text-sm tabular-nums"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {formatCurrency(total, inv.currency)}
                      </p>
                      {inv.tax > 0 && (
                        <p
                          className="text-xs tabular-nums"
                          style={{ color: "var(--text-muted)" }}
                        >
                          incl. {formatCurrency(inv.tax, inv.currency)} tax
                        </p>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Link href={`/portal/admin/invoices/${inv.id}`}>
                          <Button size="sm" variant="outline" className="text-xs h-7 gap-1"
                            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                            <Eye className="h-3 w-3" /> View
                          </Button>
                        </Link>
                        <Link href={`/portal/admin/invoices/${inv.id}/edit`}>
                          <Button size="sm" variant="outline" className="text-xs h-7 gap-1"
                            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                            <Pencil className="h-3 w-3" /> Edit
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
