import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { PaymentPageClient } from "./payment-page-client";

export const metadata = { title: "Secure Payment" };

export default async function InvoicePayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth();

  const invoice = await db.invoice.findFirst({
    where: {
      id,
      deletedAt: null,
      organization: { users: { some: { id: user.id } } },
    },
    include: {
      organization: { select: { name: true } },
    },
  });

  if (!invoice) notFound();
  if (!["SENT", "OVERDUE"].includes(invoice.status)) {
    redirect(`/portal/invoices/${id}`);
  }

  return (
    <PaymentPageClient
      invoice={{
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount,
        tax: invoice.tax,
        currency: invoice.currency,
        dueDate: invoice.dueDate,
        notes: invoice.notes,
        organization: invoice.organization,
      }}
    />
  );
}
