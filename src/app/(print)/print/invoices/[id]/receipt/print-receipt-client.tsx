"use client";

import { useEffect } from "react";

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
};

const fmt = (n: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);

const fmtDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

const GCS = { name: "General Computing Solutions", email: "billing@itatgcs.com", website: "www.itatgcs.com" };

export function PrintReceiptClient({ invoice }: Props) {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 800);
    return () => clearTimeout(t);
  }, []);

  const total = invoice.amount + invoice.tax;
  const isPaid = invoice.status === "PAID";

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: white; font-family: Inter, system-ui, sans-serif; color: #111827; }
        @page { size: A4; margin: 0; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        .wrap { max-width: 600px; margin: 48px auto; background: white; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; }
        .header { background: ${isPaid ? "#16a34a" : "#4f46e5"}; padding: 32px; text-align: center; color: white; }
        .header .icon { width: 56px; height: 56px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; font-size: 28px; }
        .header h1 { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
        .header p { font-size: 13px; opacity: 0.8; }
        .brand-bar { background: #f9fafb; padding: 12px 32px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e5e7eb; }
        .logo-img { height: 28px; width: auto; }
        .receipt-label { font-size: 11px; font-weight: 700; color: #9ca3af; letter-spacing: 0.1em; text-transform: uppercase; }
        .body { padding: 28px 32px; }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
        .field label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; display: block; margin-bottom: 4px; }
        .field p { font-size: 13px; font-weight: 500; color: #111827; }
        .divider { border: none; border-top: 1px dashed #e5e7eb; margin: 20px 0; }
        .amount-row { display: flex; justify-content: space-between; font-size: 13px; padding: 3px 0; color: #6b7280; }
        .amount-row span:last-child { color: #374151; }
        .total-box { background: ${isPaid ? "#f0fdf4" : "#f9fafb"}; border: 1px solid ${isPaid ? "#bbf7d0" : "#e5e7eb"}; border-radius: 12px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; margin-top: 16px; }
        .total-box .label { font-weight: 600; font-size: 16px; color: #111827; }
        .total-box .amount { font-size: 24px; font-weight: 900; color: ${isPaid ? "#16a34a" : "#4f46e5"}; }
        .txn { margin-top: 16px; padding: 10px 14px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 11px; }
        .txn strong { color: #6b7280; }
        .txn span { font-family: monospace; color: #374151; }
        .footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 16px 32px; text-align: center; font-size: 11px; color: #9ca3af; }
      `}</style>

      <div className="wrap">
        {/* Header */}
        <div className="header">
          <div className="icon">{isPaid ? "✓" : "⏳"}</div>
          <h1>{isPaid ? "Payment Received!" : "Payment Receipt"}</h1>
          <p>{isPaid ? "Thank you — your invoice has been paid." : "Your payment is being confirmed."}</p>
        </div>

        {/* Brand bar */}
        <div className="brand-bar">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="GCS" className="logo-img" />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{GCS.name}</span>
          </div>
          <span className="receipt-label">Receipt</span>
        </div>

        {/* Body */}
        <div className="body">
          <div className="grid2">
            <div className="field">
              <label>Invoice Number</label>
              <p style={{ fontFamily: "monospace" }}>{invoice.invoiceNumber}</p>
            </div>
            <div className="field">
              <label>Status</label>
              <p style={{ color: isPaid ? "#16a34a" : "#4f46e5" }}>{isPaid ? "Paid" : "Processing"}</p>
            </div>
            <div className="field">
              <label>Bill To</label>
              <p>{invoice.organization.name}</p>
            </div>
            <div className="field">
              <label>{invoice.paidAt ? "Date Paid" : "Invoice Date"}</label>
              <p>{fmtDate(invoice.paidAt ?? invoice.createdAt)}</p>
            </div>
          </div>

          <hr className="divider" />

          {invoice.notes && <div className="amount-row"><span>{invoice.notes}</span><span>{fmt(invoice.amount, invoice.currency)}</span></div>}
          {!invoice.notes && <div className="amount-row"><span>Professional Services</span><span>{fmt(invoice.amount, invoice.currency)}</span></div>}
          {invoice.tax > 0 && <div className="amount-row"><span>Tax</span><span>{fmt(invoice.tax, invoice.currency)}</span></div>}

          <div className="total-box">
            <span className="label">Total Paid</span>
            <span className="amount">{fmt(total, invoice.currency)}</span>
          </div>

          {invoice.stripePaymentIntentId && (
            <div className="txn">
              <strong>Transaction Reference: </strong>
              <span>{invoice.stripePaymentIntentId}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="footer">
          <div style={{ fontWeight: 600, color: "#374151", marginBottom: 4 }}>{GCS.name} · {GCS.website}</div>
          <div>For questions about this receipt, contact {GCS.email}</div>
          <div style={{ marginTop: 4 }}>This is your official payment receipt. Please keep it for your records.</div>
        </div>
      </div>
    </>
  );
}
