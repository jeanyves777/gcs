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
import { Loader2 } from "lucide-react";

type Org = { id: string; name: string };

interface InvoiceFormProps {
  organizations: Org[];
}

const CURRENCIES = ["USD", "EUR", "GBP", "CAD"] as const;

export function InvoiceForm({ organizations }: InvoiceFormProps) {
  const router = useRouter();

  const [organizationId, setOrganizationId] = useState("");
  const [notes, setNotes] = useState("");
  const [amount, setAmount] = useState("");
  const [tax, setTax] = useState("0");
  const [currency, setCurrency] = useState("USD");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organizationId) {
      toast.error("Please select an organization");
      return;
    }

    const parsedAmount = parseFloat(amount);
    const parsedTax = parseFloat(tax || "0");

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Amount must be a positive number");
      return;
    }

    if (isNaN(parsedTax) || parsedTax < 0) {
      toast.error("Tax must be zero or a positive number");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          notes: notes.trim() || undefined,
          amount: parsedAmount,
          tax: parsedTax,
          currency,
          dueDate: dueDate || undefined,
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
        <CardTitle
          className="text-base font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Invoice Details
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Organization */}
          <div className="space-y-1.5">
            <Label
              htmlFor="organization"
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              Organization <span style={{ color: "var(--error)" }}>*</span>
            </Label>
            <Select value={organizationId} onValueChange={setOrganizationId}>
              <SelectTrigger
                id="organization"
                className="w-full"
                style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
              >
                <SelectValue placeholder="Select a client organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount and Tax */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="amount"
                className="text-sm font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                Amount <span style={{ color: "var(--error)" }}>*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="tax"
                className="text-sm font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                Tax
              </Label>
              <Input
                id="tax"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={tax}
                onChange={(e) => setTax(e.target.value)}
                style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
              />
            </div>
          </div>

          {/* Currency and Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="currency"
                className="text-sm font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                Currency
              </Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger
                  id="currency"
                  style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="dueDate"
                className="text-sm font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                Due Date
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label
              htmlFor="notes"
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Add any notes or description for this invoice..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={2000}
              style={{ borderColor: "var(--border)", color: "var(--text-primary)", resize: "vertical" }}
            />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {notes.length}/2000
            </p>
          </div>

          {/* Summary */}
          {amount && (
            <div
              className="rounded-lg p-4"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
            >
              <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                Invoice Summary
              </p>
              <div className="flex justify-between text-sm" style={{ color: "var(--text-secondary)" }}>
                <span>Subtotal</span>
                <span className="tabular-nums">
                  {currency} {parseFloat(amount || "0").toFixed(2)}
                </span>
              </div>
              {parseFloat(tax || "0") > 0 && (
                <div className="flex justify-between text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                  <span>Tax</span>
                  <span className="tabular-nums">
                    {currency} {parseFloat(tax || "0").toFixed(2)}
                  </span>
                </div>
              )}
              <div
                className="flex justify-between font-semibold text-sm mt-2 pt-2"
                style={{ borderTop: "1px solid var(--border)", color: "var(--text-primary)" }}
              >
                <span>Total</span>
                <span className="tabular-nums">
                  {currency} {(parseFloat(amount || "0") + parseFloat(tax || "0")).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <Button
              type="submit"
              disabled={submitting}
              className="text-white"
              style={{ background: "var(--brand-primary)" }}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating…
                </>
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
