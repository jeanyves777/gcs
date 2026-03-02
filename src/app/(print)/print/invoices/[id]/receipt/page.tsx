import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { PrintReceiptClient } from "./print-receipt-client";

export default async function PrintReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth();

  const invoice = await db.invoice.findFirst({
    where: {
      id,
      deletedAt: null,
      OR: [
        { organization: { users: { some: { id: user.id } } } },
        ...(["ADMIN", "STAFF"].includes(user.role) ? [{}] : []),
      ],
    },
    include: {
      organization: { select: { name: true, domain: true, address: true } },
    },
  });

  if (!invoice) notFound();

  return (
    <PrintReceiptClient
      invoice={{
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        amount: invoice.amount,
        tax: invoice.tax,
        currency: invoice.currency,
        paidAt: invoice.paidAt,
        notes: invoice.notes,
        stripePaymentIntentId: invoice.stripePaymentIntentId,
        createdAt: invoice.createdAt,
        organization: invoice.organization,
      }}
    />
  );
}
