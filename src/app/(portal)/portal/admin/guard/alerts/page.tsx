import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { AlertsClient } from "./alerts-client";

export const metadata = { title: "Alert Center — GcsGuard" };

export default async function GuardAlertsPage() {
  await requireRole(["ADMIN", "STAFF"]);

  const alerts = await db.guardAlert.findMany({
    include: {
      agent: {
        select: {
          id: true,
          name: true,
          hostname: true,
          organization: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return <AlertsClient alerts={JSON.parse(JSON.stringify(alerts))} />;
}
