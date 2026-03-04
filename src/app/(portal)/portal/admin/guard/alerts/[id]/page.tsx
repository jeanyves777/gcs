import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { AlertDetailClient } from "./alert-detail-client";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const alert = await db.guardAlert.findUnique({ where: { id }, select: { title: true } });
  return { title: alert ? `${alert.title} — GcsGuard` : "Alert — GcsGuard" };
}

export default async function AlertDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["ADMIN", "STAFF"]);
  const { id } = await params;

  const alert = await db.guardAlert.findUnique({
    where: { id },
    include: {
      agent: {
        select: {
          id: true,
          name: true,
          hostname: true,
          ipAddress: true,
          os: true,
          organization: { select: { name: true } },
        },
      },
      resolvedBy: { select: { name: true } },
      incident: { select: { id: true, title: true } },
    },
  });

  if (!alert) notFound();

  return <AlertDetailClient alert={JSON.parse(JSON.stringify(alert))} />;
}
