"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Receipt, Loader2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

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

const statusStyle: Record<string, { bg: string; color: string }> = {
  DRAFT: { bg: "var(--bg-tertiary)", color: "var(--text-muted)" },
  SENT: { bg: "var(--info-bg)", color: "var(--info)" },
  PAID: { bg: "var(--success-bg)", color: "var(--success)" },
  OVERDUE: { bg: "var(--error-bg)", color: "var(--error)" },
  CANCELLED: { bg: "var(--bg-tertiary)", color: "var(--text-muted)" },
};

export function InvoicesClient({ invoices }: { invoices: Invoice[] }) {
  const [paying, setPaying] = useState<string | null>(null);

  const handlePay = async (id: string) => {
    setPaying(id);
    const res = await fetch(`/api/portal/invoices/${id}/checkout`, { method: "POST" });
    const json = await res.json();
    setPaying(null);
    if (!res.ok || !json.url) {
      toast.error(json.error ?? "Failed to start payment");
      return;
    }
    window.location.href = json.url;
  };

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
        return (
          <Card key={inv.id} className="card-base">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{inv.invoiceNumber}</span>
                  <Badge className="text-xs" style={{ background: style.bg, color: style.color }}>{inv.status}</Badge>
                </div>
                {inv.notes && <p className="text-sm truncate" style={{ color: "var(--text-secondary)" }}>{inv.notes}</p>}
                {inv.dueDate && (
                  <p className="text-xs" style={{ color: inv.status === "OVERDUE" ? "var(--error)" : "var(--text-muted)" }}>
                    Due {formatDate(inv.dueDate)}
                  </p>
                )}
                {inv.paidAt && <p className="text-xs" style={{ color: "var(--success)" }}>Paid {formatDate(inv.paidAt)}</p>}
              </div>
              <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
                <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{formatCurrency(inv.amount + inv.tax, inv.currency)}</p>
                {inv.tax > 0 && <p className="text-xs" style={{ color: "var(--text-muted)" }}>incl. {formatCurrency(inv.tax)} tax</p>}
                {payable && (
                  <Button
                    size="sm"
                    className="text-xs h-7 text-white"
                    disabled={paying === inv.id}
                    onClick={() => handlePay(inv.id)}
                    style={{ background: "var(--brand-primary)" }}
                  >
                    {paying === inv.id ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Processing…</> : "Pay now"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
