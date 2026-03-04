import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Headphones } from "lucide-react";

export const metadata: Metadata = { title: "Support" };

const statusStyle: Record<string, { bg: string; color: string }> = {
  OPEN: { bg: "var(--error-bg)", color: "var(--error)" },
  IN_PROGRESS: { bg: "var(--info-bg)", color: "var(--info)" },
  WAITING: { bg: "var(--warning-bg)", color: "var(--warning)" },
  RESOLVED: { bg: "var(--success-bg)", color: "var(--success)" },
  CLOSED: { bg: "var(--bg-tertiary)", color: "var(--text-muted)" },
};

export default async function SupportPage() {
  const user = await requireAuth();
  const tickets = await db.ticket.findMany({
    where: { organization: { users: { some: { id: user.id } } }, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { messages: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2.5" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
          <div className="p-1.5 rounded-lg" style={{ background: "var(--brand-primary)", color: "white" }}>
            <Headphones className="h-5 w-5" />
          </div>
          Support Tickets
        </h1>
        <Button asChild className="text-white" style={{ background: "var(--brand-primary)" }}>
          <Link href="/portal/support/new"><Plus className="mr-2 h-4 w-4" />New ticket</Link>
        </Button>
      </div>

      {tickets.length === 0 ? (
        <div className="text-center py-16">
          <Headphones className="h-10 w-10 mx-auto mb-3 opacity-30" style={{ color: "var(--text-muted)" }} />
          <p style={{ color: "var(--text-muted)" }}>No tickets yet. Need help? Open one above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => {
            const style = statusStyle[t.status] ?? statusStyle.OPEN;
            return (
              <Link key={t.id} href={`/portal/support/${t.id}`}>
                <Card className="card-base hover:border-[var(--brand-primary)] transition-all cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{t.ticketNumber}</span>
                        <Badge className="text-xs" style={{ background: style.bg, color: style.color }}>{t.status.replace("_", " ")}</Badge>
                      </div>
                      <p className="font-medium text-sm truncate" style={{ color: "var(--text-primary)" }}>{t.subject}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{t.category} · {t._count.messages} replies</p>
                    </div>
                    <Badge className="flex-shrink-0 text-xs" style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>{t.priority}</Badge>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
