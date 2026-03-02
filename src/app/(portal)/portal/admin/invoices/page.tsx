import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
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
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
        >
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
