import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { InvoicesClient } from "./invoices-client";

export const metadata: Metadata = { title: "Invoices" };

export default async function InvoicesPage() {
  const user = await requireAuth();
  const invoices = await db.invoice.findMany({
    where: { organization: { users: { some: { id: user.id } } }, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Invoices</h1>
      <InvoicesClient invoices={invoices} />
    </div>
  );
}
