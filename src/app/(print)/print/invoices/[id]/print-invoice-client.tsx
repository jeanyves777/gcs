"use client";

import { useEffect } from "react";

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

const fmt = (n: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);

const fmtDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

const GCS = { name: "General Computing Solutions", email: "billing@itatgcs.com", website: "www.itatgcs.com" };

export function PrintInvoiceClient({ invoice }: Props) {
  useEffect(() => {
    // Give images time to load before triggering print
    const t = setTimeout(() => window.print(), 800);
    return () => clearTimeout(t);
  }, []);

  let lineItems: LineItem[] = [];
  if (invoice.lineItems) {
    try { lineItems = JSON.parse(invoice.lineItems); } catch { /* */ }
  }
  if (lineItems.length === 0) {
    lineItems = [{ description: invoice.notes ?? `Professional Services — ${invoice.invoiceNumber}`, quantity: 1, unitPrice: invoice.amount, amount: invoice.amount }];
  }

  const total = invoice.amount + invoice.tax;
  const isPaid = invoice.status === "PAID";

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: white; font-family: Inter, system-ui, sans-serif; color: #111827; }
        @page { size: A4; margin: 0; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        .invoice-wrap { max-width: 794px; margin: 0 auto; min-height: 100vh; background: white; }
        .header { background: #4f46e5; color: white; padding: 40px 48px 32px; display: flex; justify-content: space-between; align-items: flex-start; }
        .logo-area { display: flex; align-items: center; gap: 12px; }
        .logo-img { height: 36px; width: auto; filter: brightness(0) invert(1); }
        .tagline { font-size: 11px; opacity: 0.7; margin-top: 2px; }
        .invoice-title { text-align: right; }
        .invoice-title h1 { font-size: 28px; font-weight: 900; letter-spacing: -1px; }
        .invoice-title .num { font-size: 15px; font-family: monospace; opacity: 0.85; margin-top: 2px; }
        .meta-bar { background: #f9fafb; padding: 16px 48px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; border-bottom: 1px solid #e5e7eb; }
        .meta-item label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; display: block; margin-bottom: 4px; }
        .meta-item p { font-size: 13px; font-weight: 500; color: #111827; }
        .status-badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }
        .addresses { padding: 24px 48px; display: grid; grid-template-columns: 1fr 1fr; gap: 32px; border-bottom: 1px solid #e5e7eb; }
        .address-block label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; display: block; margin-bottom: 8px; font-weight: 600; }
        .address-block .name { font-weight: 600; font-size: 14px; margin-bottom: 2px; }
        .address-block p { font-size: 13px; color: #6b7280; line-height: 1.5; }
        .line-items { padding: 24px 48px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        thead tr { border-bottom: 2px solid #e5e7eb; }
        th { padding: 0 0 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; font-weight: 600; }
        th:not(:first-child) { text-align: right; }
        td { padding: 12px 0; color: #374151; }
        td:not(:first-child) { text-align: right; }
        tbody tr { border-bottom: 1px solid #f3f4f6; }
        .totals { display: flex; justify-content: flex-end; margin-top: 16px; }
        .totals-box { width: 240px; }
        .total-row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; color: #6b7280; }
        .total-row span:last-child { color: #111827; }
        .total-final { display: flex; justify-content: space-between; font-size: 16px; font-weight: 800; padding: 10px 0 0; margin-top: 6px; border-top: 2px solid #e5e7eb; color: #111827; }
        .total-final span:last-child { color: #4f46e5; }
        .paid-date { font-size: 11px; color: #16a34a; text-align: right; margin-top: 4px; }
        .footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 16px 48px; text-align: center; font-size: 11px; color: #9ca3af; }
        .footer .paid-msg { color: #16a34a; font-weight: 600; margin-bottom: 4px; }
        .txn-ref { margin: 0 48px 16px; padding: 10px 14px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 11px; }
        .txn-ref span { font-family: monospace; color: #374151; }
      `}</style>

      <div className="invoice-wrap">
        {/* Header */}
        <div className="header">
          <div className="logo-area">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="GCS" className="logo-img" />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{GCS.name}</div>
              <div className="tagline">Managed IT &amp; Software Solutions</div>
            </div>
          </div>
          <div className="invoice-title">
            <h1>INVOICE</h1>
            <div className="num">{invoice.invoiceNumber}</div>
          </div>
        </div>

        {/* Meta bar */}
        <div className="meta-bar">
          <div className="meta-item">
            <label>Invoice Date</label>
            <p>{fmtDate(invoice.createdAt)}</p>
          </div>
          <div className="meta-item">
            <label>Due Date</label>
            <p style={{ color: invoice.status === "OVERDUE" ? "#dc2626" : "#111827" }}>
              {invoice.dueDate ? fmtDate(invoice.dueDate) : "Upon receipt"}
            </p>
          </div>
          <div className="meta-item">
            <label>Status</label>
            <span className="status-badge" style={{
              background: isPaid ? "#dcfce7" : invoice.status === "OVERDUE" ? "#fee2e2" : "#dbeafe",
              color: isPaid ? "#16a34a" : invoice.status === "OVERDUE" ? "#dc2626" : "#1d4ed8",
            }}>
              {isPaid ? "Paid" : invoice.status === "OVERDUE" ? "Overdue" : "Awaiting Payment"}
            </span>
          </div>
        </div>

        {/* Addresses */}
        <div className="addresses">
          <div className="address-block">
            <label>From</label>
            <p className="name">{GCS.name}</p>
            <p>{GCS.email}</p>
            <p>{GCS.website}</p>
          </div>
          <div className="address-block">
            <label>Bill To</label>
            <p className="name">{invoice.organization.name}</p>
            {invoice.organization.domain && <p>{invoice.organization.domain}</p>}
            {invoice.organization.address && <p>{invoice.organization.address}</p>}
            {invoice.organization.phone && <p>{invoice.organization.phone}</p>}
          </div>
        </div>

        {/* Line items */}
        <div className="line-items">
          <table>
            <thead>
              <tr>
                <th style={{ width: "50%" }}>Description</th>
                <th style={{ width: "10%" }}>Qty</th>
                <th style={{ width: "20%" }}>Unit Price</th>
                <th style={{ width: "20%" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, i) => (
                <tr key={i}>
                  <td>{item.description}</td>
                  <td style={{ textAlign: "right", color: "#6b7280" }}>{item.quantity}</td>
                  <td style={{ textAlign: "right", color: "#6b7280" }}>{fmt(item.unitPrice, invoice.currency)}</td>
                  <td style={{ textAlign: "right", fontWeight: 500 }}>{fmt(item.amount, invoice.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="totals">
            <div className="totals-box">
              <div className="total-row"><span>Subtotal</span><span>{fmt(invoice.amount, invoice.currency)}</span></div>
              {invoice.tax > 0 && <div className="total-row"><span>Tax</span><span>{fmt(invoice.tax, invoice.currency)}</span></div>}
              <div className="total-final"><span>Total</span><span>{fmt(total, invoice.currency)}</span></div>
              {invoice.paidAt && <div className="paid-date">✓ Paid on {fmtDate(invoice.paidAt)}</div>}
            </div>
          </div>
        </div>

        {/* Transaction ref */}
        {invoice.stripePaymentIntentId && (
          <div className="txn-ref">
            <strong>Transaction Reference: </strong><span>{invoice.stripePaymentIntentId}</span>
          </div>
        )}

        {/* Footer */}
        <div className="footer">
          {isPaid
            ? <div className="paid-msg">✓ Payment received — Thank you for your business!</div>
            : <div>Payment due {invoice.dueDate ? `by ${fmtDate(invoice.dueDate)}` : "upon receipt"} · {GCS.email}</div>}
          <div>{GCS.name} · {GCS.website}</div>
        </div>
      </div>
    </>
  );
}
