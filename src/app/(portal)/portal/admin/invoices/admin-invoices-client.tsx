"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Receipt, Plus } from "lucide-react";
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

export function AdminInvoicesClient({ invoices }: { invoices: Invoice[] }) {
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");

  const filtered =
    activeTab === "ALL" ? invoices : invoices.filter((inv) => inv.status === activeTab);

  return (
    <div className="space-y-4">
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
                      <Link href={`/portal/admin/invoices/${inv.id}/edit`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                        >
                          Edit
                        </Button>
                      </Link>
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
