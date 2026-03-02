"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft, Pencil, Printer, Send, CheckCircle2, Ban, Loader2, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type LineItem = { description: string; quantity: number; unitPrice: number; amount: number };

type Props = {
  invoice: {
    id: string;
    invoiceNumber: string;
    status: string;
    amount: number;
    tax: number;
    currency: string;
    dueDate: Date | null;
    paidAt: Date | null;
    notes: string | null;
    lineItems: string | null;
    stripePaymentIntentId: string | null;
    createdAt: Date;
    organization: { name: string; domain: string | null; address: string | null; phone: string | null };
  };
};

const statusConfig: Record<string, { label: string; bg: string; color: string; icon: React.ElementType }> = {
  DRAFT:     { label: "Draft",            bg: "var(--bg-tertiary)", color: "var(--text-muted)",  icon: Clock },
  SENT:      { label: "Awaiting Payment", bg: "var(--info-bg)",     color: "var(--info)",        icon: Clock },
  OVERDUE:   { label: "Overdue",          bg: "var(--error-bg)",    color: "var(--error)",       icon: AlertCircle },
  PAID:      { label: "Paid",             bg: "var(--success-bg)",  color: "var(--success)",     icon: CheckCircle2 },
  CANCELLED: { label: "Cancelled",        bg: "var(--bg-tertiary)", color: "var(--text-muted)",  icon: Ban },
};

const GCS = {
  name: "Global Computing Solutions",
  tagline: "Managed IT & Software Solutions",
  email: "billing@itatgcs.com",
  website: "www.itatgcs.com",
};

export function AdminInvoiceViewClient({ invoice }: Props) {
  const [status, setStatus] = useState(invoice.status);
  const [actioning, setActioning] = useState<string | null>(null);

  const sc = statusConfig[status] ?? statusConfig.DRAFT;
  const StatusIcon = sc.icon;
  const total = invoice.amount + invoice.tax;

  let lineItems: LineItem[] = [];
  if (invoice.lineItems) {
    try { lineItems = JSON.parse(invoice.lineItems); } catch { /* fall through */ }
  }
  if (lineItems.length === 0) {
    lineItems = [{
      description: invoice.notes ?? `Professional Services — ${invoice.invoiceNumber}`,
      quantity: 1,
      unitPrice: invoice.amount,
      amount: invoice.amount,
    }];
  }

  const doAction = async (newStatus: string, label: string) => {
    setActioning(newStatus);
    const res = await fetch(`/api/admin/invoices/${invoice.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const json = await res.json();
    setActioning(null);
    if (!res.ok) { toast.error(json.error ?? "Failed"); return; }
    setStatus(newStatus);
    toast.success(label);
  };

  return (
    <div className="max-w-4xl space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Link href="/portal/admin/invoices">
          <Button variant="ghost" size="sm" className="gap-1.5" style={{ color: "var(--text-muted)" }}>
            <ArrowLeft className="h-4 w-4" /> All Invoices
          </Button>
        </Link>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Admin quick actions */}
          {status === "DRAFT" && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs"
              disabled={!!actioning} onClick={() => doAction("SENT", "Invoice sent to client!")}>
              {actioning === "SENT" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Send to client
            </Button>
          )}
          {(status === "SENT" || status === "OVERDUE") && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs"
              style={{ color: "var(--success)", borderColor: "var(--success)" }}
              disabled={!!actioning} onClick={() => doAction("PAID", "Invoice marked as paid!")}>
              {actioning === "PAID" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Mark as paid
            </Button>
          )}
          {(status === "DRAFT" || status === "SENT") && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs"
              style={{ color: "var(--error)", borderColor: "var(--error)" }}
              disabled={!!actioning} onClick={() => doAction("CANCELLED", "Invoice cancelled.")}>
              {actioning === "CANCELLED" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
              Cancel
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1.5 text-xs"
            onClick={() => window.open(`/print/invoices/${invoice.id}`, "_blank")}>
            <Printer className="h-4 w-4" /> Download / Print
          </Button>
          <Link href={`/portal/admin/invoices/${invoice.id}/edit`}>
            <Button size="sm" className="gap-1.5 text-xs text-white" style={{ background: "var(--brand-primary)" }}>
              <Pencil className="h-3.5 w-3.5" /> Edit Invoice
            </Button>
          </Link>
        </div>
      </div>

      {/* Invoice Document */}
      <div id="invoice-document" className="rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>

        {/* Header band */}
        <div className="px-10 py-8 flex items-start justify-between"
          style={{ background: "var(--brand-primary)", color: "white" }}>
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="GCS" style={{ height: 36, width: "auto", filter: "brightness(0) invert(1)" }} />
            <div>
              <p className="font-bold text-lg leading-tight" style={{ color: "white" }}>{GCS.name}</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.75)" }}>{GCS.tagline}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black tracking-tight" style={{ fontFamily: "var(--font-display)", color: "white" }}>INVOICE</p>
            <p className="text-lg font-mono font-bold mt-0.5" style={{ color: "rgba(255,255,255,0.9)" }}>{invoice.invoiceNumber}</p>
          </div>
        </div>

        {/* Meta row */}
        <div className="px-10 py-5 grid grid-cols-3 gap-6 border-b text-sm"
          style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
          <div>
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Invoice Date</p>
            <p className="font-medium" style={{ color: "var(--text-primary)" }}>{formatDate(invoice.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Due Date</p>
            <p className="font-medium" style={{ color: status === "OVERDUE" ? "var(--error)" : "var(--text-primary)" }}>
              {invoice.dueDate ? formatDate(invoice.dueDate) : "Upon receipt"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Status</p>
            <Badge className="gap-1 text-xs px-2.5 py-0.5" style={{ background: sc.bg, color: sc.color, border: "none" }}>
              <StatusIcon className="h-3 w-3" />{sc.label}
            </Badge>
          </div>
        </div>

        {/* Addresses */}
        <div className="px-10 py-6 grid grid-cols-2 gap-10 border-b text-sm" style={{ borderColor: "var(--border)" }}>
          <div>
            <p className="text-xs uppercase tracking-wider mb-2 font-semibold" style={{ color: "var(--text-muted)" }}>From</p>
            <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{GCS.name}</p>
            <p style={{ color: "var(--text-secondary)" }}>{GCS.email}</p>
            <p style={{ color: "var(--text-secondary)" }}>{GCS.website}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider mb-2 font-semibold" style={{ color: "var(--text-muted)" }}>Bill To</p>
            <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{invoice.organization.name}</p>
            {invoice.organization.domain && <p style={{ color: "var(--text-secondary)" }}>{invoice.organization.domain}</p>}
            {invoice.organization.address && <p style={{ color: "var(--text-secondary)" }}>{invoice.organization.address}</p>}
            {invoice.organization.phone && <p style={{ color: "var(--text-secondary)" }}>{invoice.organization.phone}</p>}
          </div>
        </div>

        {/* Line items */}
        <div className="px-10 py-6">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)" }}>
                <th className="text-left pb-2 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Description</th>
                <th className="text-right pb-2 font-semibold text-xs uppercase tracking-wider w-16" style={{ color: "var(--text-muted)" }}>Qty</th>
                <th className="text-right pb-2 font-semibold text-xs uppercase tracking-wider w-28" style={{ color: "var(--text-muted)" }}>Unit Price</th>
                <th className="text-right pb-2 font-semibold text-xs uppercase tracking-wider w-28" style={{ color: "var(--text-muted)" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="py-3.5 pr-4" style={{ color: "var(--text-primary)" }}>{item.description}</td>
                  <td className="py-3.5 text-right" style={{ color: "var(--text-secondary)" }}>{item.quantity}</td>
                  <td className="py-3.5 text-right" style={{ color: "var(--text-secondary)" }}>{formatCurrency(item.unitPrice, invoice.currency)}</td>
                  <td className="py-3.5 text-right font-medium" style={{ color: "var(--text-primary)" }}>{formatCurrency(item.amount, invoice.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: "var(--text-muted)" }}>Subtotal</span>
                <span style={{ color: "var(--text-primary)" }}>{formatCurrency(invoice.amount, invoice.currency)}</span>
              </div>
              {invoice.tax > 0 && (
                <div className="flex justify-between">
                  <span style={{ color: "var(--text-muted)" }}>Tax</span>
                  <span style={{ color: "var(--text-primary)" }}>{formatCurrency(invoice.tax, invoice.currency)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 mt-2 font-bold text-base"
                style={{ borderTop: "2px solid var(--border)", color: "var(--text-primary)" }}>
                <span>Total</span>
                <span style={{ color: "var(--brand-primary)" }}>{formatCurrency(total, invoice.currency)}</span>
              </div>
              {invoice.paidAt && (
                <div className="flex justify-between text-xs pt-1" style={{ color: "var(--success)" }}>
                  <span>Paid on</span>
                  <span>{formatDate(invoice.paidAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-10 py-5 text-xs text-center border-t"
          style={{ borderColor: "var(--border)", color: "var(--text-muted)", background: "var(--bg-secondary)" }}>
          {status === "PAID"
            ? <p className="font-medium" style={{ color: "var(--success)" }}>✓ Payment received — Thank you!</p>
            : <p>Payment due {invoice.dueDate ? `by ${formatDate(invoice.dueDate)}` : "upon receipt"} · {GCS.email}</p>}
          <p className="mt-1">{GCS.name} · {GCS.website}</p>
        </div>
      </div>

      {/* Transaction ref */}
      {invoice.stripePaymentIntentId && (
        <div className="rounded-lg px-4 py-3 text-xs" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
          <span className="font-semibold" style={{ color: "var(--text-muted)" }}>Transaction: </span>
          <span className="font-mono" style={{ color: "var(--text-primary)" }}>{invoice.stripePaymentIntentId}</span>
        </div>
      )}

      <style>{`@media print { .no-print { display: none !important; } body { background: white !important; } #invoice-document { border: none !important; } }`}</style>
    </div>
  );
}
