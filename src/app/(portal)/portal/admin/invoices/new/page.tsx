import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { InvoiceForm } from "./invoice-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = { title: "Admin – Create Invoice" };

export default async function NewInvoicePage() {
  await requireRole(["ADMIN", "STAFF"]);

  const organizations = await db.organization.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link
          href="/portal/admin/invoices"
          className="inline-flex items-center gap-1.5 text-sm mb-4 hover:opacity-80 transition-opacity"
          style={{ color: "var(--text-muted)" }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to invoices
        </Link>
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
        >
          Create Invoice
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Generate a new invoice for a client organization
        </p>
      </div>
      <InvoiceForm organizations={organizations} />
    </div>
  );
}
