import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function markInvoicePaid(invoiceId: string, paymentIntentId: string | null) {
  const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.status === "PAID") return;

  await db.invoice.update({
    where: { id: invoiceId },
    data: {
      status: "PAID",
      paidAt: new Date(),
      stripePaymentIntentId: paymentIntentId,
    },
  });

  const orgUsers = await db.user.findMany({
    where: { organizationId: invoice.organizationId, isActive: true },
    select: { id: true },
  });

  if (orgUsers.length > 0) {
    await db.notification.createMany({
      data: orgUsers.map((u) => ({
        userId: u.id,
        type: "INVOICE_PAID",
        title: `Invoice ${invoice.invoiceNumber} paid`,
        content: `Your payment of has been received. Thank you!`,
        link: `/portal/invoices/${invoice.id}/receipt`,
      })),
    });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      const invoiceId = pi.metadata?.invoiceId;
      if (invoiceId) await markInvoicePaid(invoiceId, pi.id);
    }

    if (event.type === "checkout.session.completed") {
      // Legacy: handles any old checkout sessions
      const session = event.data.object as Stripe.Checkout.Session;
      const invoiceId = session.metadata?.invoiceId;
      if (invoiceId) await markInvoicePaid(invoiceId, session.payment_intent as string ?? null);
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
