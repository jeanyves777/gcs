"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2 } from "lucide-react";

type Org = { id: string; name: string };

interface InvoiceFormProps {
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

export function InvoiceForm({ organizations }: InvoiceFormProps) {
  const router = useRouter();

  const [organizationId, setOrganizationId] = useState("");
  const [notes, setNotes] = useState("");
  const [tax, setTax] = useState("0");
  const [currency, setCurrency] = useState("USD");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<LineItem[]>([newItem()]);

  const subtotal = items.reduce((sum, i) => sum + itemTotal(i), 0);
  const parsedTax = parseFloat(tax || "0") || 0;
  const total = subtotal + parsedTax;

  const updateItem = (id: string, field: keyof LineItem, value: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const addItem = () => setItems((prev) => [...prev, newItem()]);

  const removeItem = (id: string) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organizationId) {
      toast.error("Please select an organization");
      return;
    }

    // Validate line items
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

    setSubmitting(true);
    try {
      const lineItems = validItems.map((i) => ({
        description: i.description.trim(),
        category: i.category || undefined,
        quantity: parseFloat(i.quantity),
        unitPrice: parseFloat(i.unitPrice),
      }));

      const res = await fetch("/api/admin/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          notes: notes.trim() || undefined,
          amount: subtotal,
          tax: parsedTax,
          currency,
          dueDate: dueDate || undefined,
          lineItems,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to create invoice");
        return;
      }

      toast.success("Invoice created successfully");
      router.push("/portal/admin/invoices");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="card-base">
      <CardHeader style={{ borderBottom: "1px solid var(--border)" }}>
        <CardTitle className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          Invoice Details
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Organization + Currency + Due Date */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                Organization <span style={{ color: "var(--error)" }}>*</span>
              </Label>
              <Select value={organizationId} onValueChange={setOrganizationId}>
                <SelectTrigger style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Line Items <span style={{ color: "var(--error)" }}>*</span>
              </Label>
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

            {/* Item rows */}
            {items.map((item, idx) => (
              <div
                key={item.id}
                className="grid grid-cols-1 md:grid-cols-[1fr_160px_80px_100px_100px_36px] gap-2 p-3 rounded-lg"
                style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
              >
                {/* Description */}
                <div>
                  <label className="text-[11px] font-medium md:hidden mb-1 block" style={{ color: "var(--text-muted)" }}>Description</label>
                  <Input
                    placeholder={`Item ${idx + 1} description`}
                    value={item.description}
                    onChange={(e) => updateItem(item.id, "description", e.target.value)}
                    className="text-sm h-9"
                    style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
                  />
                </div>
                {/* Category */}
                <div>
                  <label className="text-[11px] font-medium md:hidden mb-1 block" style={{ color: "var(--text-muted)" }}>Category</label>
                  <Select value={item.category} onValueChange={(v) => updateItem(item.id, "category", v)}>
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
                {/* Quantity */}
                <div>
                  <label className="text-[11px] font-medium md:hidden mb-1 block" style={{ color: "var(--text-muted)" }}>Qty</label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, "quantity", e.target.value)}
                    className="text-sm h-9 tabular-nums"
                    style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
                  />
                </div>
                {/* Unit Price */}
                <div>
                  <label className="text-[11px] font-medium md:hidden mb-1 block" style={{ color: "var(--text-muted)" }}>Unit Price</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(item.id, "unitPrice", e.target.value)}
                    className="text-sm h-9 tabular-nums"
                    style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
                  />
                </div>
                {/* Amount (computed) */}
                <div className="flex items-center justify-end">
                  <label className="text-[11px] font-medium md:hidden mr-auto" style={{ color: "var(--text-muted)" }}>Amount</label>
                  <span className="text-sm font-medium tabular-nums" style={{ color: "var(--text-primary)" }}>
                    {currency} {itemTotal(item).toFixed(2)}
                  </span>
                </div>
                {/* Delete */}
                <div className="flex items-center justify-center">
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
              <span>Subtotal ({items.filter((i) => i.description.trim()).length} item{items.filter((i) => i.description.trim()).length !== 1 ? "s" : ""})</span>
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
            <Button
              type="submit"
              disabled={submitting}
              className="text-white"
              style={{ background: "var(--brand-primary)" }}
            >
              {submitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</>
              ) : (
                "Create Invoice"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/portal/admin/invoices")}
              disabled={submitting}
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
