"use client";

import Link from "next/link";
import {
  CreditCard, Clock, Shield, ShieldCheck, Eye, Receipt,
  CheckCircle2, Users, Server, ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Organization = {
  name: string;
  subscriptionTier: string;
  trialEndsAt: string | null;
  createdAt: string;
  _count: { users: number; guardAgents: number };
} | null;

type Invoice = {
  id: string;
  invoiceNumber: string;
  amount: number;
  tax: number;
  currency: string;
  status: string;
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
};

const planInfo: Record<string, { label: string; price: string; desc: string; color: string; features: string[] }> = {
  NONE: {
    label: "No Plan",
    price: "—",
    desc: "No active GcsGuard subscription",
    color: "var(--text-muted)",
    features: [],
  },
  GCSGUARD_MANAGED_FREE: {
    label: "Managed (Free)",
    price: "$0/mo",
    desc: "GCS-managed security monitoring at no cost",
    color: "var(--warning)",
    features: ["Basic security monitoring", "Email alerts", "Monthly reports", "Community support"],
  },
  GCSGUARD_MANAGED: {
    label: "GcsGuard Managed",
    price: "$49/user/mo",
    desc: "Full managed security monitoring & incident response",
    color: "var(--success)",
    features: ["24/7 security monitoring", "Incident response", "Patch management", "Vulnerability scanning", "Dedicated support", "Custom reports"],
  },
  GCSGUARD_NON_MANAGED: {
    label: "GcsGuard Non-Managed",
    price: "$19/user/mo",
    desc: "Security monitoring tools, self-managed",
    color: "var(--brand-primary)",
    features: ["Security monitoring dashboard", "Alert notifications", "Patch tracking", "Self-service tools", "Email support"],
  },
};

const statusStyle: Record<string, { bg: string; color: string; label: string }> = {
  DRAFT: { bg: "var(--bg-tertiary)", color: "var(--text-muted)", label: "Draft" },
  SENT: { bg: "var(--info-bg)", color: "var(--info)", label: "Awaiting Payment" },
  PAID: { bg: "var(--success-bg)", color: "var(--success)", label: "Paid" },
  OVERDUE: { bg: "var(--error-bg)", color: "var(--error)", label: "Overdue" },
  CANCELLED: { bg: "var(--bg-tertiary)", color: "var(--text-muted)", label: "Cancelled" },
};

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function BillingClient({ organization, invoices }: { organization: Organization; invoices: Invoice[] }) {
  const plan = planInfo[organization?.subscriptionTier ?? "NONE"] ?? planInfo.NONE;
  const now = new Date();
  const trialEnd = organization?.trialEndsAt ? new Date(organization.trialEndsAt) : null;
  const isInTrial = trialEnd ? now < trialEnd : false;
  const trialDaysRemaining = trialEnd
    ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  const trialTotalDays = trialEnd && organization?.createdAt
    ? Math.ceil((trialEnd.getTime() - new Date(organization.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 30;
  const trialProgress = trialTotalDays > 0 ? Math.min(100, ((trialTotalDays - trialDaysRemaining) / trialTotalDays) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2.5" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
          <div className="p-1.5 rounded-lg" style={{ background: "var(--brand-primary)", color: "white" }}>
            <CreditCard className="h-5 w-5" />
          </div>
          Billing & Plan
        </h1>
        {organization && (
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Manage your subscription and view invoices for {organization.name}
          </p>
        )}
      </div>

      {/* Trial Banner */}
      {isInTrial && (
        <Card className="overflow-hidden border-0">
          <CardContent
            className="p-5"
            style={{
              background: "linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 8%, transparent), color-mix(in srgb, var(--info) 8%, transparent))",
              border: "1px solid color-mix(in srgb, var(--brand-primary) 25%, transparent)",
              borderRadius: "var(--radius-lg, 12px)",
            }}
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl" style={{ background: "color-mix(in srgb, var(--brand-primary) 15%, transparent)" }}>
                <Clock className="h-6 w-6" style={{ color: "var(--brand-primary)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Free Trial Active</p>
                  <Badge className="text-[10px]" style={{ background: "color-mix(in srgb, var(--brand-primary) 15%, transparent)", color: "var(--brand-primary)", border: "none" }}>
                    {trialDaysRemaining} day{trialDaysRemaining !== 1 ? "s" : ""} left
                  </Badge>
                </div>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  Your GcsGuard trial ends on {formatDate(trialEnd!)}. Explore all features before it expires.
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "color-mix(in srgb, var(--brand-primary) 15%, transparent)" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${trialProgress}%`, background: "var(--brand-primary)" }}
                    />
                  </div>
                  <span className="text-[10px] font-medium tabular-nums" style={{ color: "var(--text-muted)" }}>
                    {Math.round(trialProgress)}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Plan Card */}
      <Card className="card-base overflow-hidden">
        <CardContent className="p-0">
          <div className="p-6 flex items-start gap-5">
            <div
              className="p-3 rounded-xl flex-shrink-0"
              style={{ background: `color-mix(in srgb, ${plan.color} 12%, transparent)` }}
            >
              <ShieldCheck className="h-7 w-7" style={{ color: plan.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{plan.label}</h2>
                <Badge
                  className="text-[10px]"
                  style={{ background: `color-mix(in srgb, ${plan.color} 12%, transparent)`, color: plan.color, border: "none" }}
                >
                  Current Plan
                </Badge>
              </div>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{plan.desc}</p>
              <p className="text-2xl font-bold mt-3" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                {plan.price}
              </p>
              {organization && (
                <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {organization._count.users} user{organization._count.users !== 1 ? "s" : ""}</span>
                  <span className="flex items-center gap-1"><Server className="h-3 w-3" /> {organization._count.guardAgents} agent{organization._count.guardAgents !== 1 ? "s" : ""}</span>
                </div>
              )}
            </div>
          </div>
          {plan.features.length > 0 && (
            <div className="px-6 pb-5 pt-0">
              <div className="grid grid-cols-2 gap-2">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                    <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" style={{ color: plan.color }} />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="px-6 py-4 border-t" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              To change your plan, contact your GCS account manager or open a support ticket.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Plan Comparison */}
      <div>
        <h2 className="text-base font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(["GCSGUARD_MANAGED_FREE", "GCSGUARD_NON_MANAGED", "GCSGUARD_MANAGED"] as const).map((key) => {
            const p = planInfo[key];
            const isCurrent = organization?.subscriptionTier === key;
            return (
              <Card
                key={key}
                className="card-base transition-all"
                style={isCurrent ? { borderColor: p.color, boxShadow: `0 0 0 1px ${p.color}30` } : undefined}
              >
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4" style={{ color: p.color }} />
                    <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{p.label}</span>
                    {isCurrent && (
                      <Badge className="text-[9px] ml-auto" style={{ background: `color-mix(in srgb, ${p.color} 12%, transparent)`, color: p.color, border: "none" }}>
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>{p.price}</p>
                  <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>{p.desc}</p>
                  <div className="space-y-1.5">
                    {p.features.slice(0, 4).map((f) => (
                      <div key={f} className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-secondary)" }}>
                        <CheckCircle2 className="h-3 w-3 flex-shrink-0" style={{ color: p.color }} />
                        {f}
                      </div>
                    ))}
                    {p.features.length > 4 && (
                      <p className="text-[11px] pl-4.5" style={{ color: "var(--text-muted)" }}>
                        +{p.features.length - 4} more
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Invoice History */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Invoice History</h2>
          <Link href="/portal/invoices">
            <Button variant="ghost" size="sm" className="text-xs gap-1" style={{ color: "var(--brand-primary)" }}>
              View all <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
        {invoices.length === 0 ? (
          <Card className="card-base">
            <CardContent className="py-12 text-center">
              <Receipt className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No invoices yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {invoices.map((inv) => {
              const style = statusStyle[inv.status] ?? statusStyle.DRAFT;
              const total = inv.amount + inv.tax;
              return (
                <Card key={inv.id} className="card-base hover:shadow-sm transition-shadow">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Link
                          href={`/portal/invoices/${inv.id}`}
                          className="text-xs font-mono font-semibold hover:underline"
                          style={{ color: "var(--brand-primary)" }}
                        >
                          {inv.invoiceNumber}
                        </Link>
                        <Badge className="text-[10px]" style={{ background: style.bg, color: style.color, border: "none" }}>
                          {style.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
                        {inv.dueDate && <span>Due {formatDate(inv.dueDate)}</span>}
                        {inv.paidAt && (
                          <span className="flex items-center gap-1" style={{ color: "var(--success)" }}>
                            <CheckCircle2 className="h-3 w-3" /> Paid {formatDate(inv.paidAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 flex items-center gap-3">
                      <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                        {formatCurrency(total, inv.currency)}
                      </p>
                      <Link href={`/portal/invoices/${inv.id}`}>
                        <Button size="sm" variant="outline" className="text-xs h-7 gap-1">
                          <Eye className="h-3 w-3" /> View
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
