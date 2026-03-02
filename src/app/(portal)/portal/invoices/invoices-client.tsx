"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Receipt, CreditCard, Eye, CheckCircle2 } from "lucide-react";
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
  paidAt: Date | null;
};

const statusStyle: Record<string, { bg: string; color: string; label: string }> = {
  DRAFT:     { bg: "var(--bg-tertiary)",  color: "var(--text-muted)", label: "Draft" },
  SENT:      { bg: "var(--info-bg)",      color: "var(--info)",       label: "Awaiting Payment" },
  PAID:      { bg: "var(--success-bg)",   color: "var(--success)",    label: "Paid" },
  OVERDUE:   { bg: "var(--error-bg)",     color: "var(--error)",      label: "Overdue" },
  CANCELLED: { bg: "var(--bg-tertiary)",  color: "var(--text-muted)", label: "Cancelled" },
};

export function InvoicesClient({ invoices }: { invoices: Invoice[] }) {
  if (invoices.length === 0) {
    return (
      <div className="text-center py-16">
        <Receipt className="h-10 w-10 mx-auto mb-3 opacity-30" style={{ color: "var(--text-muted)" }} />
        <p style={{ color: "var(--text-muted)" }}>No invoices yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {invoices.map((inv) => {
        const style = statusStyle[inv.status] ?? statusStyle.DRAFT;
        const payable = inv.status === "SENT" || inv.status === "OVERDUE";
        const total = inv.amount + inv.tax;

        return (
          <Card key={inv.id} className="card-base hover:shadow-sm transition-shadow">
            <CardContent className="p-4 flex items-center gap-4">
              {/* Left: invoice info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Link
                    href={`/portal/invoices/${inv.id}`}
                    className="text-xs font-mono font-semibold hover:underline"
                    style={{ color: "var(--brand-primary)" }}
                  >
                    {inv.invoiceNumber}
                  </Link>
                  <Badge className="text-xs" style={{ background: style.bg, color: style.color, border: "none" }}>
                    {style.label}
                  </Badge>
                </div>
                {inv.notes && (
                  <p className="text-sm truncate" style={{ color: "var(--text-secondary)" }}>{inv.notes}</p>
                )}
                <div className="flex items-center gap-3 mt-0.5">
                  {inv.dueDate && (
                    <p className="text-xs" style={{ color: inv.status === "OVERDUE" ? "var(--error)" : "var(--text-muted)" }}>
                      Due {formatDate(inv.dueDate)}
                    </p>
                  )}
                  {inv.paidAt && (
                    <p className="text-xs flex items-center gap-1" style={{ color: "var(--success)" }}>
                      <CheckCircle2 className="h-3 w-3" />
                      Paid {formatDate(inv.paidAt)}
                    </p>
                  )}
                </div>
              </div>

              {/* Right: amount + actions */}
              <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
                <p className="font-bold text-base" style={{ color: "var(--text-primary)" }}>
                  {formatCurrency(total, inv.currency)}
                </p>
                {inv.tax > 0 && (
                  <p className="text-xs -mt-1.5" style={{ color: "var(--text-muted)" }}>
                    incl. {formatCurrency(inv.tax, inv.currency)} tax
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <Link href={`/portal/invoices/${inv.id}`}>
                    <Button size="sm" variant="outline" className="text-xs h-7 gap-1">
                      <Eye className="h-3 w-3" /> View
                    </Button>
                  </Link>
                  {payable && (
                    <Link href={`/portal/invoices/${inv.id}/pay`}>
                      <Button
                        size="sm"
                        className="text-xs h-7 gap-1 text-white"
                        style={{ background: "var(--brand-primary)" }}
                      >
                        <CreditCard className="h-3 w-3" /> Pay now
                      </Button>
                    </Link>
                  )}
                  {inv.status === "PAID" && (
                    <Link href={`/portal/invoices/${inv.id}/receipt`}>
                      <Button size="sm" variant="outline" className="text-xs h-7 gap-1" style={{ color: "var(--success)" }}>
                        <Receipt className="h-3 w-3" /> Receipt
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
