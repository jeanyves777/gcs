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
import { Loader2, Send, CheckCircle, XCircle } from "lucide-react";
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
  createdAt: Date;
  paidAt: Date | null;
  organization: { id: string; name: string };
};

interface EditInvoiceClientProps {
  invoice: Invoice;
  organizations: Org[];
}

const CURRENCIES = ["USD", "EUR", "GBP", "CAD"] as const;

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
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function EditInvoiceClient({ invoice, organizations }: EditInvoiceClientProps) {
  const router = useRouter();

  const [organizationId, setOrganizationId] = useState(invoice.organization.id);
  const [notes, setNotes] = useState(invoice.notes ?? "");
  const [amount, setAmount] = useState(String(invoice.amount));
  const [tax, setTax] = useState(String(invoice.tax));
  const [currency, setCurrency] = useState(invoice.currency);
  const [dueDate, setDueDate] = useState(toDateInputValue(invoice.dueDate));
  const [currentStatus, setCurrentStatus] = useState(invoice.status);

  const [saving, setSaving] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);

  const style = statusStyle[currentStatus] ?? statusStyle.DRAFT;

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

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parsedAmount,
          tax: parsedTax,
          notes: notes.trim() || null,
          dueDate: dueDate || null,
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

  const isEditable = currentStatus !== "PAID" && currentStatus !== "CANCELLED";

  return (
    <div className="space-y-4">
      {/* Status actions card */}
      <Card className="card-base">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Badge
                className="text-xs border-0"
                style={{ background: style.bg, color: style.color }}
              >
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
              {/* Send to client – shown for DRAFT */}
              {currentStatus === "DRAFT" && (
                <Button
                  size="sm"
                  className="gap-1.5 text-white text-xs"
                  disabled={actioning !== null}
                  onClick={() => patchStatus("SENT", "Send", "Invoice sent!")}
                  style={{ background: "var(--info)" }}
                >
                  {actioning === "Send" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Send to client
                </Button>
              )}

              {/* Mark as paid – shown for SENT or OVERDUE */}
              {(currentStatus === "SENT" || currentStatus === "OVERDUE") && (
                <Button
                  size="sm"
                  className="gap-1.5 text-white text-xs"
                  disabled={actioning !== null}
                  onClick={() => patchStatus("PAID", "MarkPaid", "Invoice marked paid!")}
                  style={{ background: "var(--success)" }}
                >
                  {actioning === "MarkPaid" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle className="h-3.5 w-3.5" />
                  )}
                  Mark as paid
                </Button>
              )}

              {/* Cancel invoice – shown for DRAFT or SENT */}
              {(currentStatus === "DRAFT" || currentStatus === "SENT") && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  disabled={actioning !== null}
                  onClick={() =>
                    patchStatus("CANCELLED", "Cancel", "Invoice cancelled.")
                  }
                  style={{ borderColor: "var(--error)", color: "var(--error)" }}
                >
                  {actioning === "Cancel" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5" />
                  )}
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
          <CardTitle
            className="text-base font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Invoice Details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSave} className="space-y-5">
            {/* Organization (read-only display – not editable to prevent accidental reassignment) */}
            <div className="space-y-1.5">
              <Label
                className="text-sm font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                Organization
              </Label>
              {isEditable ? (
                <Select value={organizationId} onValueChange={setOrganizationId} disabled>
                  <SelectTrigger
                    style={{
                      borderColor: "var(--border)",
                      color: "var(--text-muted)",
                      opacity: 0.7,
                    }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div
                  className="px-3 py-2 rounded-md text-sm"
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    color: "var(--text-muted)",
                  }}
                >
                  {invoice.organization.name}
                </div>
              )}
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Organization cannot be changed after creation.
              </p>
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
                  disabled={!isEditable}
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
                  disabled={!isEditable}
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
                <Select value={currency} onValueChange={setCurrency} disabled>
                  <SelectTrigger
                    id="currency"
                    style={{
                      borderColor: "var(--border)",
                      color: "var(--text-muted)",
                      opacity: 0.7,
                    }}
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
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Currency cannot be changed after creation.
                </p>
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
                  disabled={!isEditable}
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
                disabled={!isEditable}
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text-primary)",
                  resize: "vertical",
                }}
              />
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {notes.length}/2000
              </p>
            </div>

            {/* Summary */}
            <div
              className="rounded-lg p-4"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
            >
              <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                Invoice Summary
              </p>
              <div
                className="flex justify-between text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                <span>Subtotal</span>
                <span className="tabular-nums">
                  {currency} {parseFloat(amount || "0").toFixed(2)}
                </span>
              </div>
              {parseFloat(tax || "0") > 0 && (
                <div
                  className="flex justify-between text-sm mt-1"
                  style={{ color: "var(--text-secondary)" }}
                >
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
                  {currency}{" "}
                  {(parseFloat(amount || "0") + parseFloat(tax || "0")).toFixed(2)}
                </span>
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
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Save Changes"
                    )}
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
