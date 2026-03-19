import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isGCSStaff } from "@/lib/auth-utils";
import { z } from "zod";

const schema = z.object({
  organizationId: z.string().min(1),
  amount: z.number().positive(),
  tax: z.number().min(0).default(0),
  currency: z.string().default("USD"),
  dueDate: z.string().optional(),
  notes: z.string().max(2000).optional(),
  lineItems: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0),
    category: z.string().optional(),
  })).optional(),
});

async function generateInvoiceNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const count = await db.invoice.count();
  return `INV-${year}${month}-${String(count + 1).padStart(4, "0")}`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !isGCSStaff(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message ?? "Invalid data" }, { status: 400 });
    }

    const { organizationId, amount, tax, currency, dueDate, notes, lineItems } = result.data;
    const invoiceNumber = await generateInvoiceNumber();

    const invoice = await db.invoice.create({
      data: {
        invoiceNumber,
        organizationId,
        amount,
        tax,
        currency,
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes || null,
        lineItems: lineItems ? JSON.stringify(lineItems) : null,
        status: "DRAFT",
      },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !isGCSStaff(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const invoices = await db.invoice.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { organization: { select: { name: true } } },
    });

    return NextResponse.json(invoices);
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
