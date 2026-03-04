import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { MonitoringClient } from "./monitoring-client";

export const metadata = { title: "Monitoring — GcsGuard" };

export default async function MonitoringPage() {
  await requireRole(["ADMIN", "STAFF"]);

  const [urlMonitors, services] = await Promise.all([
    db.guardUrlMonitor.findMany({
      where: { isActive: true },
      include: {
        agent: { select: { id: true, name: true, hostname: true } },
      },
      orderBy: [{ isDown: "desc" }, { name: "asc" }],
    }),
    db.guardServiceStatus.findMany({
      include: {
        agent: { select: { id: true, name: true, hostname: true } },
      },
      orderBy: [{ isActive: "asc" }, { serviceName: "asc" }],
    }),
  ]);

  return (
    <MonitoringClient
      urlMonitors={JSON.parse(JSON.stringify(urlMonitors))}
      services={JSON.parse(JSON.stringify(services))}
    />
  );
}
