"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CheckCircle2, Printer, ArrowLeft, Home, Clock, AlertCircle } from "lucide-react";

type Props = {
  invoice: {
    id: string;
    invoiceNumber: string;
    status: string;
    amount: number;
    tax: number;
    currency: string;
    paidAt: Date | null;
    notes: string | null;
    stripePaymentIntentId: string | null;
    createdAt: Date;
    organization: { name: string; domain: string | null; address: string | null };
  };
  paymentIntentId: string | null;
  redirectStatus: string | null;
};

export function ReceiptClient({ invoice, redirectStatus }: Props) {
  const [paymentStatus, setPaymentStatus] = useState<"succeeded" | "processing" | "failed" | "unknown">("unknown");

  const total = invoice.amount + invoice.tax;

  useEffect(() => {
    if (redirectStatus === "succeeded") setPaymentStatus("succeeded");
    else if (redirectStatus === "processing") setPaymentStatus("processing");
    else if (redirectStatus === "requires_payment_method") setPaymentStatus("failed");
    else if (invoice.status === "PAID") setPaymentStatus("succeeded");
    else setPaymentStatus("unknown");
  }, [redirectStatus, invoice.status]);

  const isSuccess = paymentStatus === "succeeded" || invoice.status === "PAID";

  const GCS = {
    name: "Global Computing Solutions",
    email: "billing@itatgcs.com",
    website: "www.itatgcs.com",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Back nav */}
      <div className="flex items-center gap-3 no-print">
        <Link href="/portal/invoices">
          <Button variant="ghost" size="sm" className="gap-1.5" style={{ color: "var(--text-muted)" }}>
            <ArrowLeft className="h-4 w-4" /> Invoices
          </Button>
        </Link>
      </div>

      {/* Status banner */}
      {paymentStatus === "processing" && (
        <div
          className="rounded-xl px-5 py-4 flex items-center gap-3"
          style={{ background: "var(--warning-bg)", border: "1px solid var(--warning)", color: "var(--warning)" }}
        >
          <Clock className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Payment Processing</p>
            <p className="text-sm opacity-80">Your payment is being processed. We'll notify you once confirmed.</p>
          </div>
        </div>
      )}
      {paymentStatus === "failed" && (
        <div
          className="rounded-xl px-5 py-4 flex items-center gap-3"
          style={{ background: "var(--error-bg)", border: "1px solid var(--error)", color: "var(--error)" }}
        >
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Payment Failed</p>
            <p className="text-sm opacity-80">Your payment was not completed. Please try again.</p>
          </div>
          <Link href={`/portal/invoices/${invoice.id}/pay`} className="ml-auto">
            <Button size="sm" style={{ background: "var(--error)", color: "white" }}>Try again</Button>
          </Link>
        </div>
      )}

      {/* Receipt Document */}
      <div
        id="receipt-document"
        className="rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
      >
        {/* Header */}
        <div
          className="px-8 pt-8 pb-6 text-center"
          style={{ background: isSuccess ? "var(--success)" : "var(--brand-primary)", color: "white" }}
        >
          <div className="flex justify-center mb-3">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.2)" }}
            >
              {isSuccess ? <CheckCircle2 className="h-8 w-8" /> : <Clock className="h-8 w-8" />}
            </div>
          </div>
          <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
            {isSuccess ? "Payment Received!" : "Payment Receipt"}
          </p>
          <p className="text-sm opacity-80 mt-1">
            {isSuccess
              ? "Thank you — your invoice has been paid."
              : "Your payment is being confirmed."}
          </p>
        </div>

        {/* GCS branding strip */}
        <div
          className="px-8 py-3 flex items-center justify-between text-sm border-b"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded flex items-center justify-center font-black text-xs text-white"
              style={{ background: "var(--brand-primary)" }}
            >G</div>
            <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{GCS.name}</span>
          </div>
          <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>RECEIPT</span>
        </div>

        {/* Receipt details */}
        <div className="px-8 py-6 space-y-5">
          {/* Reference + status */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Invoice Number</p>
              <p className="font-mono font-bold" style={{ color: "var(--text-primary)" }}>{invoice.invoiceNumber}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Status</p>
              <Badge
                style={{
                  background: isSuccess ? "var(--success-bg)" : "var(--warning-bg)",
                  color: isSuccess ? "var(--success)" : "var(--warning)",
                  border: "none",
                }}
              >
                {isSuccess ? "Paid" : "Processing"}
              </Badge>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Bill To</p>
              <p className="font-medium" style={{ color: "var(--text-primary)" }}>{invoice.organization.name}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                {invoice.paidAt ? "Date Paid" : "Invoice Date"}
              </p>
              <p className="font-medium" style={{ color: "var(--text-primary)" }}>
                {formatDate(invoice.paidAt ?? invoice.createdAt)}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: "1px dashed var(--border)" }} />

          {/* Amount breakdown */}
          <div className="space-y-2 text-sm">
            {invoice.notes && (
              <div className="flex justify-between">
                <span style={{ color: "var(--text-secondary)" }}>{invoice.notes}</span>
                <span style={{ color: "var(--text-primary)" }}>{formatCurrency(invoice.amount, invoice.currency)}</span>
              </div>
            )}
            {!invoice.notes && (
              <div className="flex justify-between">
                <span style={{ color: "var(--text-secondary)" }}>Professional Services</span>
                <span style={{ color: "var(--text-primary)" }}>{formatCurrency(invoice.amount, invoice.currency)}</span>
              </div>
            )}
            {invoice.tax > 0 && (
              <div className="flex justify-between" style={{ color: "var(--text-secondary)" }}>
                <span>Tax</span>
                <span>{formatCurrency(invoice.tax, invoice.currency)}</span>
              </div>
            )}
          </div>

          {/* Total box */}
          <div
            className="rounded-xl px-5 py-4 flex items-center justify-between"
            style={{ background: isSuccess ? "var(--success-bg)" : "var(--bg-secondary)", border: `1px solid ${isSuccess ? "var(--success)" : "var(--border)"}` }}
          >
            <span className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>Total Paid</span>
            <span className="text-2xl font-black" style={{ color: isSuccess ? "var(--success)" : "var(--text-primary)", fontFamily: "var(--font-display)" }}>
              {formatCurrency(total, invoice.currency)}
            </span>
          </div>

          {/* Transaction reference */}
          {invoice.stripePaymentIntentId && (
            <div
              className="rounded-lg px-4 py-3 text-xs"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
            >
              <p className="font-semibold mb-0.5" style={{ color: "var(--text-muted)" }}>Transaction Reference</p>
              <p className="font-mono" style={{ color: "var(--text-primary)" }}>{invoice.stripePaymentIntentId}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-8 py-5 text-xs text-center border-t space-y-1"
          style={{ borderColor: "var(--border)", background: "var(--bg-secondary)", color: "var(--text-muted)" }}
        >
          <p className="font-medium" style={{ color: "var(--text-primary)" }}>
            {GCS.name} · {GCS.website}
          </p>
          <p>For questions about this receipt, contact {GCS.email}</p>
          <p>This is your official payment receipt. Please keep it for your records.</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 no-print">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => window.print()}
        >
          <Printer className="h-4 w-4" /> Print Receipt
        </Button>
        <Link href={`/portal/invoices/${invoice.id}`}>
          <Button variant="outline" size="sm" className="gap-1.5">
            View Invoice
          </Button>
        </Link>
        <Link href="/portal" className="ml-auto">
          <Button size="sm" className="gap-1.5 text-white" style={{ background: "var(--brand-primary)" }}>
            <Home className="h-4 w-4" /> Portal Home
          </Button>
        </Link>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          #receipt-document { border: none !important; box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}
