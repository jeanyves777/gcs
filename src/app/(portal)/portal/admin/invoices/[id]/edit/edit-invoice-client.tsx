"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Send, CheckCircle, XCircle, Plus, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

type Org = { id: string; name: string };

type Invoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  amount: number;
  tax: number;
  currency: string;
  dueDate: Date | null;
  notes: string | null;
  lineItems: string | null;
  createdAt: Date;
  paidAt: Date | null;
  organization: { id: string; name: string };
};

interface EditInvoiceClientProps {
  invoice: Invoice;
  organizations: Org[];
}

const CURRENCIES = ["USD", "EUR", "GBP", "CAD"] as const;

const CATEGORIES = [
  "Managed IT Services",
  "Software Development",
  "Cybersecurity",
  "Cloud Services",
  "Consulting",
  "Hardware",
  "Web Design",
  "Support & Maintenance",
  "AI Integration",
  "Training",
  "Other",
] as const;

type LineItem = {
  id: string;
  description: string;
  category: string;
  quantity: string;
  unitPrice: string;
};

function newItem(): LineItem {
  return { id: crypto.randomUUID(), description: "", category: "", quantity: "1", unitPrice: "" };
}

function itemTotal(item: LineItem): number {
  const qty = parseFloat(item.quantity) || 0;
  const price = parseFloat(item.unitPrice) || 0;
  return qty * price;
}

function parseExistingLineItems(json: string | null, fallbackAmount: number, fallbackNotes: string | null): LineItem[] {
  if (json) {
    try {
      const arr = JSON.parse(json);
      if (Array.isArray(arr) && arr.length > 0) {
        return arr.map((it: { description?: string; category?: string; quantity?: number; unitPrice?: number }) => ({
          id: crypto.randomUUID(),
          description: it.description || "",
          category: it.category || "",
          quantity: String(it.quantity ?? 1),
          unitPrice: String(it.unitPrice ?? 0),
        }));
      }
    } catch { /* fall through */ }
  }
  // Fallback: create a single line item from the invoice amount
  return [{
    id: crypto.randomUUID(),
    description: fallbackNotes || "Professional Services",
    category: "",
    quantity: "1",
    unitPrice: String(fallbackAmount),
  }];
}

const statusStyle: Record<string, { bg: string; color: string }> = {
  DRAFT: { bg: "var(--bg-tertiary)", color: "var(--text-muted)" },
  SENT: { bg: "var(--info-bg)", color: "var(--info)" },
  PAID: { bg: "var(--success-bg)", color: "var(--success)" },
  OVERDUE: { bg: "var(--error-bg)", color: "var(--error)" },
  CANCELLED: { bg: "var(--bg-tertiary)", color: "var(--text-muted)" },
};

function toDateInputValue(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function EditInvoiceClient({ invoice, organizations }: EditInvoiceClientProps) {
  const router = useRouter();

  const [organizationId] = useState(invoice.organization.id);
  const [notes, setNotes] = useState(invoice.notes ?? "");
  const [tax, setTax] = useState(String(invoice.tax));
  const [currency] = useState(invoice.currency);
  const [dueDate, setDueDate] = useState(toDateInputValue(invoice.dueDate));
  const [currentStatus, setCurrentStatus] = useState(invoice.status);
  const [items, setItems] = useState<LineItem[]>(() =>
    parseExistingLineItems(invoice.lineItems, invoice.amount, invoice.notes)
  );

  const [saving, setSaving] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);

  const subtotal = items.reduce((sum, i) => sum + itemTotal(i), 0);
  const parsedTax = parseFloat(tax || "0") || 0;
  const total = subtotal + parsedTax;

  const style = statusStyle[currentStatus] ?? statusStyle.DRAFT;
  const isEditable = currentStatus !== "PAID" && currentStatus !== "CANCELLED";

  const updateItem = (id: string, field: keyof LineItem, value: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const addItem = () => setItems((prev) => [...prev, newItem()]);

  const removeItem = (id: string) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const patchStatus = async (newStatus: string, label: string, successMsg: string) => {
    setActioning(label);
    try {
      const res = await fetch(`/api/admin/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? `Failed to ${label.toLowerCase()}`);
        return;
      }
      toast.success(successMsg);
      setCurrentStatus(newStatus);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setActioning(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const validItems = items.filter((i) => i.description.trim());
    if (validItems.length === 0) {
      toast.error("Add at least one line item");
      return;
    }

    for (const item of validItems) {
      const qty = parseFloat(item.quantity);
      const price = parseFloat(item.unitPrice);
      if (isNaN(qty) || qty <= 0) {
        toast.error(`Invalid quantity for "${item.description}"`);
        return;
      }
      if (isNaN(price) || price < 0) {
        toast.error(`Invalid price for "${item.description}"`);
        return;
      }
    }

    if (parsedTax < 0) {
      toast.error("Tax must be zero or positive");
      return;
    }

    setSaving(true);
    try {
      const lineItems = validItems.map((i) => ({
        description: i.description.trim(),
        category: i.category || undefined,
        quantity: parseFloat(i.quantity),
        unitPrice: parseFloat(i.unitPrice),
      }));

      const res = await fetch(`/api/admin/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: subtotal,
          tax: parsedTax,
          notes: notes.trim() || null,
          dueDate: dueDate || null,
          lineItems: JSON.stringify(lineItems),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to save changes");
        return;
      }
      toast.success("Invoice updated successfully");
      router.push("/portal/admin/invoices");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Status actions card */}
      <Card className="card-base">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Badge className="text-xs border-0" style={{ background: style.bg, color: style.color }}>
                {currentStatus}
              </Badge>
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {invoice.paidAt
                  ? `Paid on ${formatDate(invoice.paidAt)}`
                  : invoice.dueDate
                  ? `Due ${formatDate(invoice.dueDate)}`
                  : `Created ${formatDate(invoice.createdAt)}`}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {currentStatus === "DRAFT" && (
                <Button
                  size="sm"
                  className="gap-1.5 text-white text-xs"
                  disabled={actioning !== null}
                  onClick={() => patchStatus("SENT", "Send", "Invoice sent!")}
                  style={{ background: "var(--info)" }}
                >
                  {actioning === "Send" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Send to client
                </Button>
              )}
              {(currentStatus === "SENT" || currentStatus === "OVERDUE") && (
                <Button
                  size="sm"
                  className="gap-1.5 text-white text-xs"
                  disabled={actioning !== null}
                  onClick={() => patchStatus("PAID", "MarkPaid", "Invoice marked paid!")}
                  style={{ background: "var(--success)" }}
                >
                  {actioning === "MarkPaid" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                  Mark as paid
                </Button>
              )}
              {(currentStatus === "DRAFT" || currentStatus === "SENT") && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  disabled={actioning !== null}
                  onClick={() => patchStatus("CANCELLED", "Cancel", "Invoice cancelled.")}
                  style={{ borderColor: "var(--error)", color: "var(--error)" }}
                >
                  {actioning === "Cancel" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                  Cancel invoice
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit form card */}
      <Card className="card-base">
        <CardHeader style={{ borderBottom: "1px solid var(--border)" }}>
          <CardTitle className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            Invoice Details — {invoice.invoiceNumber}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSave} className="space-y-6">
            {/* Organization + Currency + Due Date */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Organization</Label>
                <div
                  className="px-3 py-2 rounded-md text-sm"
                  style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
                >
                  {invoice.organization.name}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Currency</Label>
                <div
                  className="px-3 py-2 rounded-md text-sm"
                  style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
                >
                  {currency}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={!isEditable}
                  style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Line Items
                </Label>
                {isEditable && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addItem}
                    className="gap-1.5 text-xs"
                    style={{ borderColor: "var(--brand-primary)", color: "var(--brand-primary)" }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Item
                  </Button>
                )}
              </div>

              {/* Header row */}
              <div className="hidden md:grid md:grid-cols-[1fr_160px_80px_100px_100px_36px] gap-2 px-1">
                <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Description</span>
                <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Category</span>
                <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Qty</span>
                <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Unit Price</span>
                <span className="text-[11px] font-medium uppercase tracking-wider text-right" style={{ color: "var(--text-muted)" }}>Amount</span>
                <span />
              </div>

              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="grid grid-cols-1 md:grid-cols-[1fr_160px_80px_100px_100px_36px] gap-2 p-3 rounded-lg"
                  style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
                >
                  <div>
                    <label className="text-[11px] font-medium md:hidden mb-1 block" style={{ color: "var(--text-muted)" }}>Description</label>
                    <Input
                      placeholder={`Item ${idx + 1}`}
                      value={item.description}
                      onChange={(e) => updateItem(item.id, "description", e.target.value)}
                      disabled={!isEditable}
                      className="text-sm h-9"
                      style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium md:hidden mb-1 block" style={{ color: "var(--text-muted)" }}>Category</label>
                    <Select value={item.category} onValueChange={(v) => updateItem(item.id, "category", v)} disabled={!isEditable}>
                      <SelectTrigger className="text-sm h-9" style={{ borderColor: "var(--border)", color: item.category ? "var(--text-primary)" : "var(--text-muted)" }}>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium md:hidden mb-1 block" style={{ color: "var(--text-muted)" }}>Qty</label>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, "quantity", e.target.value)}
                      disabled={!isEditable}
                      className="text-sm h-9 tabular-nums"
                      style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium md:hidden mb-1 block" style={{ color: "var(--text-muted)" }}>Unit Price</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(item.id, "unitPrice", e.target.value)}
                      disabled={!isEditable}
                      className="text-sm h-9 tabular-nums"
                      style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
                    />
                  </div>
                  <div className="flex items-center justify-end">
                    <label className="text-[11px] font-medium md:hidden mr-auto" style={{ color: "var(--text-muted)" }}>Amount</label>
                    <span className="text-sm font-medium tabular-nums" style={{ color: "var(--text-primary)" }}>
                      {currency} {itemTotal(item).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-center">
                    {isEditable && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        disabled={items.length === 1}
                        className="h-9 w-9 p-0"
                        style={{ color: items.length === 1 ? "var(--text-muted)" : "var(--error)" }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Tax */}
            <div className="space-y-1.5 max-w-[200px] ml-auto">
              <Label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Tax Amount</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={tax}
                onChange={(e) => setTax(e.target.value)}
                disabled={!isEditable}
                className="tabular-nums text-right"
                style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Notes</Label>
              <Textarea
                placeholder="Payment terms, additional details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                maxLength={2000}
                disabled={!isEditable}
                style={{ borderColor: "var(--border)", color: "var(--text-primary)", resize: "vertical" }}
              />
            </div>

            {/* Summary */}
            <div
              className="rounded-lg p-4 ml-auto max-w-xs w-full"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
            >
              <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                Invoice Summary
              </p>
              <div className="flex justify-between text-sm" style={{ color: "var(--text-secondary)" }}>
                <span>Subtotal</span>
                <span className="tabular-nums">{currency} {subtotal.toFixed(2)}</span>
              </div>
              {parsedTax > 0 && (
                <div className="flex justify-between text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                  <span>Tax</span>
                  <span className="tabular-nums">{currency} {parsedTax.toFixed(2)}</span>
                </div>
              )}
              <div
                className="flex justify-between font-semibold text-sm mt-2 pt-2"
                style={{ borderTop: "1px solid var(--border)", color: "var(--text-primary)" }}
              >
                <span>Total</span>
                <span className="tabular-nums">{currency} {total.toFixed(2)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              {isEditable ? (
                <>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="text-white"
                    style={{ background: "var(--brand-primary)" }}
                  >
                    {saving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>) : "Save Changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/portal/admin/invoices")}
                    disabled={saving}
                    style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/portal/admin/invoices")}
                  style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                >
                  Back to invoices
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
