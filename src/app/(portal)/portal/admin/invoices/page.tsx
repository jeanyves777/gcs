import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { Receipt } from "lucide-react";
import { AdminInvoicesClient } from "./admin-invoices-client";

export const metadata: Metadata = { title: "Admin – Invoices" };

export default async function AdminInvoicesPage() {
  await requireRole(["ADMIN", "STAFF"]);

  const invoices = await db.invoice.findMany({
    where: { deletedAt: null },
    include: { organization: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2.5" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
          <div className="p-1.5 rounded-lg" style={{ background: "var(--brand-primary)", color: "white" }}>
            <Receipt className="h-5 w-5" />
          </div>
          Invoices
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Create and manage all client invoices
        </p>
      </div>
      <AdminInvoicesClient invoices={invoices} />
    </div>
  );
}
