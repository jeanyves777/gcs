import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { Receipt } from "lucide-react";
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
      <h1 className="text-2xl font-bold flex items-center gap-2.5" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
        <div className="p-1.5 rounded-lg" style={{ background: "var(--brand-primary)", color: "white" }}>
          <Receipt className="h-5 w-5" />
        </div>
        Invoices
      </h1>
      <InvoicesClient invoices={invoices} />
    </div>
  );
}
