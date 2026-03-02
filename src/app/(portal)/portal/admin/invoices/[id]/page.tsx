import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { AdminInvoiceViewClient } from "./admin-invoice-view-client";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inv = await db.invoice.findUnique({ where: { id }, select: { invoiceNumber: true } });
  return { title: inv ? `Invoice ${inv.invoiceNumber}` : "Invoice" };
}

export default async function AdminInvoiceViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRole(["ADMIN", "STAFF"]);

  const invoice = await db.invoice.findFirst({
    where: { id, deletedAt: null },
    include: {
      organization: { select: { name: true, domain: true, address: true, phone: true } },
    },
  });

  if (!invoice) notFound();

  return (
    <AdminInvoiceViewClient
      invoice={{
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        amount: invoice.amount,
        tax: invoice.tax,
        currency: invoice.currency,
        dueDate: invoice.dueDate,
        paidAt: invoice.paidAt,
        notes: invoice.notes,
        lineItems: invoice.lineItems,
        stripePaymentIntentId: invoice.stripePaymentIntentId,
        createdAt: invoice.createdAt,
        organization: invoice.organization,
      }}
    />
  );
}
