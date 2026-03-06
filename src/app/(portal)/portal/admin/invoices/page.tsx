import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { AdminInvoicesClient } from "./admin-invoices-client";

export const metadata: Metadata = { title: "Admin - Invoices" };

export default async function AdminInvoicesPage() {
  await requireRole(["ADMIN", "STAFF"]);

  const invoices = await db.invoice.findMany({
    where: { deletedAt: null },
    include: { organization: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Compute stats
  const totalRevenue = invoices.filter(i => i.status === "PAID").reduce((s, i) => s + i.amount + i.tax, 0);
  const unpaidAmount = invoices.filter(i => ["SENT", "OVERDUE"].includes(i.status)).reduce((s, i) => s + i.amount + i.tax, 0);
  const overdueCount = invoices.filter(i => i.status === "OVERDUE").length;
  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);
  const paidThisMonth = invoices
    .filter(i => i.status === "PAID" && i.paidDate && new Date(i.paidDate) >= thisMonth)
    .reduce((s, i) => s + i.amount + i.tax, 0);

  const stats = {
    totalRevenue,
    unpaidAmount,
    overdueCount,
    paidThisMonth,
    totalCount: invoices.length,
  };

  return (
    <AdminInvoicesClient invoices={invoices} stats={stats} />
  );
}
