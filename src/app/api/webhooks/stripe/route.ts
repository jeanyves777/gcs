import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const invoiceId = session.metadata?.invoiceId;
    if (!invoiceId) return NextResponse.json({ received: true });

    const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice || invoice.status === "PAID") return NextResponse.json({ received: true });

    await db.invoice.update({
      where: { id: invoiceId },
      data: {
        status: "PAID",
        paidAt: new Date(),
        stripePaymentIntentId: session.payment_intent as string ?? null,
      },
    });

    // Notify all users in the organization
    const orgUsers = await db.user.findMany({
      where: { organizationId: invoice.organizationId, isActive: true },
      select: { id: true },
    });

    await db.notification.createMany({
      data: orgUsers.map((u) => ({
        userId: u.id,
        type: "INVOICE_PAID",
        title: `Invoice ${invoice.invoiceNumber} paid`,
        content: `Your payment has been received. Thank you!`,
        link: `/portal/invoices`,
      })),
    });
  }

  return NextResponse.json({ received: true });
}
