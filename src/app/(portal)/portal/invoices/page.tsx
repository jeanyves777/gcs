import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Invoices" };

const statusStyle: Record<string, { bg: string; color: string }> = {
  DRAFT: { bg: "var(--bg-tertiary)", color: "var(--text-muted)" },
  SENT: { bg: "var(--info-bg)", color: "var(--info)" },
  PAID: { bg: "var(--success-bg)", color: "var(--success)" },
  OVERDUE: { bg: "var(--error-bg)", color: "var(--error)" },
  CANCELLED: { bg: "var(--bg-tertiary)", color: "var(--text-muted)" },
};

export default async function InvoicesPage() {
  const user = await requireAuth();
  const invoices = await db.invoice.findMany({
    where: { organization: { users: { some: { id: user.id } } }, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Invoices</h1>
      {invoices.length === 0 ? (
        <div className="text-center py-16">
          <Receipt className="h-10 w-10 mx-auto mb-3 opacity-30" style={{ color: "var(--text-muted)" }} />
          <p style={{ color: "var(--text-muted)" }}>No invoices yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => {
            const style = statusStyle[inv.status] ?? statusStyle.DRAFT;
            return (
              <Card key={inv.id} className="card-base">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{inv.invoiceNumber}</span>
                      <Badge className="text-xs" style={{ background: style.bg, color: style.color }}>{inv.status}</Badge>
                    </div>
                    {inv.notes && <p className="text-sm truncate" style={{ color: "var(--text-secondary)" }}>{inv.notes}</p>}
                    {inv.dueDate && <p className="text-xs" style={{ color: "var(--text-muted)" }}>Due {formatDate(inv.dueDate)}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{formatCurrency(inv.amount + inv.tax, inv.currency)}</p>
                    {inv.tax > 0 && <p className="text-xs" style={{ color: "var(--text-muted)" }}>incl. {formatCurrency(inv.tax)} tax</p>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
