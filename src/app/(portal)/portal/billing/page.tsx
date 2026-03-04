import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { BillingClient } from "./billing-client";

export const metadata: Metadata = { title: "Billing & Plan" };

export default async function BillingPage() {
  const user = await requireAuth();

  const org = user.organizationId
    ? await db.organization.findUnique({
        where: { id: user.organizationId },
        select: {
          name: true,
          subscriptionTier: true,
          trialEndsAt: true,
          createdAt: true,
          _count: { select: { users: true, guardAgents: true } },
        },
      })
    : null;

  const invoices = user.organizationId
    ? await db.invoice.findMany({
        where: { organizationId: user.organizationId, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
    : [];

  const serializedOrg = org
    ? {
        ...org,
        trialEndsAt: org.trialEndsAt?.toISOString() ?? null,
        createdAt: org.createdAt.toISOString(),
      }
    : null;

  const serializedInvoices = invoices.map((inv) => ({
    ...inv,
    dueDate: inv.dueDate?.toISOString() ?? null,
    paidAt: inv.paidAt?.toISOString() ?? null,
    createdAt: inv.createdAt.toISOString(),
  }));

  return <BillingClient organization={serializedOrg} invoices={serializedInvoices} />;
}
