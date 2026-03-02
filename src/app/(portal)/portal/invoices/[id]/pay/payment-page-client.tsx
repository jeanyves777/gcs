"use client";

import { useEffect, useState, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft, Lock, ShieldCheck, Loader2 } from "lucide-react";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type InvoiceSummary = {
  id: string;
  invoiceNumber: string;
  amount: number;
  tax: number;
  currency: string;
  dueDate: Date | null;
  notes: string | null;
  organization: { name: string };
};

// ─── Inner checkout form (needs stripe/elements context) ──────────────────────
function CheckoutForm({ invoice }: { invoice: InvoiceSummary }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const total = invoice.amount + invoice.tax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError(null);

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/portal/invoices/${invoice.id}/receipt`,
      },
    });

    // confirmPayment only returns here on error (otherwise it redirects)
    if (stripeError) {
      setError(stripeError.message ?? "Payment failed. Please try again.");
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--border)" }}
      >
        <PaymentElement
          options={{
            layout: "tabs",
            defaultValues: {},
          }}
        />
      </div>

      {error && (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{ background: "var(--error-bg)", color: "var(--error)", border: "1px solid var(--error)" }}
        >
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={!stripe || processing}
        className="w-full text-white text-base font-semibold h-12 gap-2"
        style={{ background: "var(--brand-primary)" }}
      >
        {processing ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
        ) : (
          <><Lock className="h-4 w-4" /> Pay {formatCurrency(total, invoice.currency)}</>
        )}
      </Button>

      <div className="flex items-center justify-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
        <ShieldCheck className="h-3.5 w-3.5" />
        <span>Payments are encrypted and secured by Stripe</span>
      </div>
    </form>
  );
}

// ─── Outer page (fetches clientSecret, initializes Elements) ─────────────────
export function PaymentPageClient({ invoice }: { invoice: InvoiceSummary }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const total = invoice.amount + invoice.tax;

  const initPayment = useCallback(async () => {
    setFetchError(null);
    const res = await fetch(`/api/portal/invoices/${invoice.id}/payment-intent`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) { setFetchError(json.error ?? "Failed to initialise payment"); return; }
    setClientSecret(json.clientSecret);
  }, [invoice.id]);

  useEffect(() => { initPayment(); }, [initPayment]);

  const appearance = {
    theme: "stripe" as const,
    variables: {
      colorPrimary: "#6366f1",
      colorBackground: "var(--bg-secondary, #ffffff)",
      colorText: "#1f2937",
      colorDanger: "#ef4444",
      fontFamily: "Inter, system-ui, sans-serif",
      borderRadius: "10px",
      spacingUnit: "4px",
    },
  };

  return (
    <div className="max-w-4xl">
      {/* Back nav */}
      <Link href={`/portal/invoices/${invoice.id}`}>
        <Button variant="ghost" size="sm" className="gap-1.5 mb-4" style={{ color: "var(--text-muted)" }}>
          <ArrowLeft className="h-4 w-4" /> Back to Invoice
        </Button>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 items-start">
        {/* Invoice Summary (left) */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid var(--border)", background: "var(--bg-primary)" }}
        >
          {/* Header */}
          <div className="px-6 py-5" style={{ background: "var(--brand-primary)", color: "white" }}>
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-base"
                style={{ background: "rgba(255,255,255,0.2)" }}
              >
                G
              </div>
              <div>
                <p className="font-bold leading-tight">Global Computing Solutions</p>
                <p className="text-xs opacity-75">Managed IT & Software Solutions</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div>
              <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Invoice</p>
              <p className="text-xl font-mono font-bold" style={{ color: "var(--text-primary)" }}>{invoice.invoiceNumber}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Bill To</p>
                <p className="font-medium" style={{ color: "var(--text-primary)" }}>{invoice.organization.name}</p>
              </div>
              {invoice.dueDate && (
                <div>
                  <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Due Date</p>
                  <p className="font-medium" style={{ color: "var(--text-primary)" }}>{formatDate(invoice.dueDate)}</p>
                </div>
              )}
            </div>

            {invoice.notes && (
              <div className="text-sm">
                <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Description</p>
                <p style={{ color: "var(--text-secondary)" }}>{invoice.notes}</p>
              </div>
            )}

            {/* Amount breakdown */}
            <div
              className="rounded-xl p-4 space-y-2 text-sm"
              style={{ background: "var(--bg-secondary)" }}
            >
              <div className="flex justify-between" style={{ color: "var(--text-secondary)" }}>
                <span>Subtotal</span>
                <span>{formatCurrency(invoice.amount, invoice.currency)}</span>
              </div>
              {invoice.tax > 0 && (
                <div className="flex justify-between" style={{ color: "var(--text-secondary)" }}>
                  <span>Tax</span>
                  <span>{formatCurrency(invoice.tax, invoice.currency)}</span>
                </div>
              )}
              <div
                className="flex justify-between font-bold text-base pt-2 mt-1"
                style={{ borderTop: "1px solid var(--border)", color: "var(--text-primary)" }}
              >
                <span>Total Due</span>
                <span style={{ color: "var(--brand-primary)" }}>{formatCurrency(total, invoice.currency)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment form (right) */}
        <div
          className="rounded-2xl p-6 space-y-5"
          style={{ border: "1px solid var(--border)", background: "var(--bg-primary)" }}
        >
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
              Secure Checkout
            </h2>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
              Your payment information is encrypted
            </p>
          </div>

          {fetchError && (
            <div
              className="rounded-lg px-4 py-3 text-sm"
              style={{ background: "var(--error-bg)", color: "var(--error)" }}
            >
              {fetchError}
              <button className="ml-2 underline" onClick={initPayment}>Retry</button>
            </div>
          )}

          {!clientSecret && !fetchError && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--brand-primary)" }} />
            </div>
          )}

          {clientSecret && (
            <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
              <CheckoutForm invoice={invoice} />
            </Elements>
          )}

          {/* Accepted cards */}
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
            <span>Accepted:</span>
            <span className="font-medium">Visa · Mastercard · Amex · Discover · ACH</span>
          </div>
        </div>
      </div>
    </div>
  );
}
