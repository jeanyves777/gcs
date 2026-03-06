import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runFullScan } from "@/lib/internal-scanner";
import { getCurrentUser } from "@/lib/auth-utils";

const AGENT_ID = "INTERNAL_GCS_SERVER";

/**
 * POST /api/guard/internal/scan
 * Runs a full security scan and persists ALL results to the database:
 *  - GuardScan record (full JSON results)
 *  - GuardMetric records (CPU, memory, disk, load, network)
 *  - GuardAlert records (non-INFO findings, deduped by title)
 *  - GuardServiceStatus upserts
 *  - Agent heartbeat update
 */
export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify agent exists
    const agent = await db.guardAgent.findUnique({ where: { id: AGENT_ID } });
    if (!agent) {
      return NextResponse.json({ error: "Internal agent not registered" }, { status: 404 });
    }

    // Run the full scan
    const scanResult = await runFullScan();
    const nonInfoFindings = scanResult.findings.filter(f => f.severity !== "INFO");

    // 1. Create GuardScan record
    await db.guardScan.create({
      data: {
        type: "FULL",
        status: "COMPLETED",
        results: JSON.stringify(scanResult),
        findingCount: nonInfoFindings.length,
        completedAt: new Date(),
        agentId: AGENT_ID,
      },
    });

    // 2. Create GuardMetric records (one per metric type)
    const m = scanResult.metrics;
    await db.guardMetric.createMany({
      data: [
        { type: "CPU", value: m.cpuPercent, agentId: AGENT_ID, metadata: JSON.stringify({ loadAvg: m.loadAvg }) },
        { type: "MEMORY", value: m.memPercent, agentId: AGENT_ID, metadata: JSON.stringify({ total: m.memTotal, used: m.memUsed }) },
        { type: "DISK", value: m.diskPercent, agentId: AGENT_ID, metadata: JSON.stringify({ total: m.diskTotal, used: m.diskUsed }) },
        { type: "LOAD", value: m.loadAvg[0], agentId: AGENT_ID },
        { type: "NETWORK_IN", value: m.networkRx, agentId: AGENT_ID },
        { type: "NETWORK_OUT", value: m.networkTx, agentId: AGENT_ID },
      ],
    });

    // 3. Upsert alerts (only non-INFO, deduped by title)
    for (const finding of nonInfoFindings) {
      const existing = await db.guardAlert.findFirst({
        where: { agentId: AGENT_ID, title: finding.title, status: "OPEN" },
      });
      if (!existing) {
        await db.guardAlert.create({
          data: {
            type: finding.category.toUpperCase(),
            severity: finding.severity,
            title: finding.title,
            description: finding.description,
            aiRecommendation: finding.remediation,
            agentId: AGENT_ID,
          },
        });
      }
    }

    // 4. Auto-resolve alerts that are no longer found
    const openAlerts = await db.guardAlert.findMany({
      where: { agentId: AGENT_ID, status: "OPEN" },
    });
    const currentTitles = new Set(nonInfoFindings.map(f => f.title));
    for (const alert of openAlerts) {
      if (!currentTitles.has(alert.title)) {
        await db.guardAlert.update({
          where: { id: alert.id },
          data: { status: "RESOLVED", resolvedAt: new Date() },
        });
      }
    }

    // 5. Upsert service statuses
    for (const svc of scanResult.services) {
      await db.guardServiceStatus.upsert({
        where: {
          agentId_serviceName: { agentId: AGENT_ID, serviceName: svc.name },
        },
        create: {
          serviceName: svc.name,
          isActive: svc.status === "active",
          isEnabled: svc.enabled,
          agentId: AGENT_ID,
        },
        update: {
          isActive: svc.status === "active",
          isEnabled: svc.enabled,
        },
      });
    }

    // 6. Update agent heartbeat
    await db.guardAgent.update({
      where: { id: AGENT_ID },
      data: {
        lastHeartbeat: new Date(),
        status: "ONLINE",
        pendingUpdates: scanResult.patches.total,
        securityUpdates: scanResult.patches.security,
      },
    });

    return NextResponse.json({
      success: true,
      scan: scanResult,
      savedFindings: nonInfoFindings.length,
    });
  } catch (error) {
    console.error("[GuardInternal] Scan error:", error);
    return NextResponse.json({ error: "Scan failed: " + String(error) }, { status: 500 });
  }
}
