import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { EditInvoiceClient } from "./edit-invoice-client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = { title: "Admin – Edit Invoice" };

interface EditInvoicePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditInvoicePage({ params }: EditInvoicePageProps) {
  await requireRole(["ADMIN", "STAFF"]);

  const { id } = await params;

  const invoice = await db.invoice.findUnique({
    where: { id, deletedAt: null },
    include: { organization: { select: { id: true, name: true } } },
  });

  if (!invoice) notFound();

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
          Edit Invoice
        </h1>
        <p className="text-sm mt-1 font-mono" style={{ color: "var(--text-muted)" }}>
          {invoice.invoiceNumber}
        </p>
      </div>
      <EditInvoiceClient invoice={invoice} organizations={organizations} />
    </div>
  );
}
