import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isGCSStaff } from "@/lib/auth-utils";
import { z } from "zod";

const schema = z.object({
  amount: z.number().positive().optional(),
  tax: z.number().min(0).optional(),
  status: z.enum(["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"]).optional(),
  dueDate: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  lineItems: z.string().optional().nullable(), // JSON string
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user || !isGCSStaff(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message ?? "Invalid data" }, { status: 400 });
    }

    const data = result.data;
    const invoice = await db.invoice.update({
      where: { id },
      data: {
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.tax !== undefined && { tax: data.tax }),
        ...(data.status && { status: data.status }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.lineItems !== undefined && { lineItems: data.lineItems }),
        ...(data.status === "PAID" && { paidAt: new Date() }),
      },
      include: { organization: { select: { name: true } } },
    });

    // If sent, notify org users
    if (data.status === "SENT") {
      const orgUsers = await db.user.findMany({
        where: { organizationId: invoice.organizationId, isActive: true },
        select: { id: true },
      });
      await db.notification.createMany({
        data: orgUsers.map((u) => ({
          userId: u.id,
          type: "NEW_INVOICE",
          title: `Invoice ${invoice.invoiceNumber} sent`,
          content: `A new invoice is ready for payment.`,
          link: `/portal/invoices`,
        })),
      });
    }

    return NextResponse.json(invoice);
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
