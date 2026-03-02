import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { ReceiptClient } from "./receipt-client";

export const metadata = { title: "Payment Receipt" };

export default async function ReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment_intent?: string; redirect_status?: string }>;
}) {
  const { id } = await params;
  const { payment_intent, redirect_status } = await searchParams;
  const user = await requireAuth();

  const invoice = await db.invoice.findFirst({
    where: {
      id,
      deletedAt: null,
      organization: { users: { some: { id: user.id } } },
    },
    include: {
      organization: { select: { name: true, domain: true, address: true } },
    },
  });

  if (!invoice) notFound();

  return (
    <ReceiptClient
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
      paymentIntentId={payment_intent ?? null}
      redirectStatus={redirect_status ?? null}
    />
  );
}
