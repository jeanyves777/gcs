import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const stripe = getStripe();
    const { id } = await params;
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const invoice = await db.invoice.findFirst({
      where: {
        id,
        deletedAt: null,
        organization: { users: { some: { id: session.user.id } } },
      },
    });

    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    if (!["SENT", "OVERDUE"].includes(invoice.status)) {
      return NextResponse.json({ error: "Invoice is not payable" }, { status: 400 });
    }

    const totalCents = Math.round((invoice.amount + invoice.tax) * 100);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: invoice.currency.toLowerCase(),
            product_data: {
              name: `Invoice ${invoice.invoiceNumber}`,
              description: invoice.notes ?? `GCS Invoice ${invoice.invoiceNumber}`,
            },
            unit_amount: totalCents,
          },
          quantity: 1,
        },
      ],
      metadata: { invoiceId: invoice.id },
      success_url: `${appUrl}/portal/invoices/success?session_id={CHECKOUT_SESSION_ID}&invoice=${invoice.invoiceNumber}`,
      cancel_url: `${appUrl}/portal/invoices`,
    });

    // Save session ID on invoice
    await db.invoice.update({
      where: { id },
      data: { stripeSessionId: checkoutSession.id },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch {
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
