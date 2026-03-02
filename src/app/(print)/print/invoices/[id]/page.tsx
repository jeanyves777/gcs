import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { PrintInvoiceClient } from "./print-invoice-client";

export default async function PrintInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth();

  const invoice = await db.invoice.findFirst({
    where: {
      id,
      deletedAt: null,
      OR: [
        { organization: { users: { some: { id: user.id } } } },
        // Admin can print any invoice
        ...(["ADMIN", "STAFF"].includes(user.role) ? [{}] : []),
      ],
    },
    include: {
      organization: { select: { name: true, domain: true, address: true, phone: true } },
    },
  });

  if (!invoice) notFound();

  return (
    <PrintInvoiceClient
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
