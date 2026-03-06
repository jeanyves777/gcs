import { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { InternalDashboardClient } from "./internal-dashboard-client";

export const metadata: Metadata = {
  title: "GcsGuard Internal Monitor | GCS Admin",
  description: "Real-time security scanning and monitoring for GCS production server",
};

export default async function InternalGuardPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/portal/login");
  }

  // Find the GCS org for the internal agent
  const gcsOrg = await db.organization.findFirst({
    where: { name: "General Computing Solutions" },
    select: { id: true },
  });

  if (!gcsOrg) {
    return <div className="p-6 text-red-500">GCS organization not found in database.</div>;
  }

  // Fetch or create internal agent
  let agent = await db.guardAgent.findUnique({
    where: { id: "INTERNAL_GCS_SERVER" },
    include: {
      metrics: { orderBy: { timestamp: "desc" }, take: 100 },
      alerts: { orderBy: { createdAt: "desc" }, take: 50 },
      devices: true,
      serviceStatuses: true,
    },
  });

  if (!agent) {
    const apiKey = "internal-" + Date.now();
    agent = await db.guardAgent.create({
      data: {
        id: "INTERNAL_GCS_SERVER",
        name: "GCS Internal Monitor",
        hostname: "localhost",
        ipAddress: "127.0.0.1",
        os: "linux",
        status: "ONLINE",
        apiKey,
        apiKeyPrefix: apiKey.substring(0, 8),
        lastHeartbeat: new Date(),
        organizationId: gcsOrg.id,
      },
      include: {
        metrics: { orderBy: { timestamp: "desc" }, take: 100 },
        alerts: { orderBy: { createdAt: "desc" }, take: 50 },
        devices: true,
        serviceStatuses: true,
      },
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">GcsGuard Internal Monitor</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Real-time security scanning, threat detection, and auto-remediation for GCS production server
        </p>
      </div>
      <InternalDashboardClient initialAgent={JSON.parse(JSON.stringify(agent))} />
    </div>
  );
}
