import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { InvoiceDetailClient } from "./invoice-detail-client";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await db.invoice.findUnique({ where: { id }, select: { invoiceNumber: true } });
  return { title: invoice ? `Invoice ${invoice.invoiceNumber}` : "Invoice" };
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth();

  const invoice = await db.invoice.findFirst({
    where: {
      id,
      deletedAt: null,
      organization: { users: { some: { id: user.id } } },
    },
    include: {
      organization: {
        select: { name: true, domain: true, address: true, phone: true, logo: true },
      },
    },
  });

  if (!invoice) notFound();

  return (
    <InvoiceDetailClient
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
