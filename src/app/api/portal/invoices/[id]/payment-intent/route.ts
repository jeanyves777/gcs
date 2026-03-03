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
      include: { organization: { select: { name: true } } },
    });

    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    if (!["SENT", "OVERDUE"].includes(invoice.status)) {
      return NextResponse.json({ error: "Invoice is not payable" }, { status: 400 });
    }

    const totalCents = Math.round((invoice.amount + invoice.tax) * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: invoice.currency.toLowerCase(),
      metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
      description: `GCS Invoice ${invoice.invoiceNumber} — ${invoice.organization.name}`,
      // receipt handled via our own receipt page
    });

    await db.invoice.update({
      where: { id },
      data: { stripePaymentIntentId: paymentIntent.id },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("PaymentIntent error:", err);
    return NextResponse.json({ error: "Failed to create payment intent" }, { status: 500 });
  }
}
