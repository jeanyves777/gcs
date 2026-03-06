import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateAgent } from "@/lib/guard-auth";
import { sendGuardAlertNotification } from "@/lib/email";

/**
 * POST /api/guard/agent/scan
 * Accepts full security scan results from remote GcsGuard agents.
 * Mirrors the internal scan endpoint but uses agent API key auth.
 *
 * Stores: GuardScan, GuardMetric, GuardAlert (deduped), GuardServiceStatus
 */
export async function POST(request: Request) {
  const agent = await authenticateAgent(request);
  if (!agent) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  try {
    const scanResult = await request.json();

    // Validate minimum required fields
    if (!scanResult.metrics || !scanResult.findings) {
      return NextResponse.json(
        { error: "Missing required fields: metrics, findings" },
        { status: 400 }
      );
    }

    const nonInfoFindings = (scanResult.findings || []).filter(
      (f: { severity: string }) => f.severity !== "INFO"
    );

    // 1. Create GuardScan record
    await db.guardScan.create({
      data: {
        type: "FULL",
        status: "COMPLETED",
        results: JSON.stringify(scanResult),
        findingCount: nonInfoFindings.length,
        completedAt: new Date(),
        agentId: agent.id,
      },
    });

    // 2. Create GuardMetric records
    const m = scanResult.metrics;
    const metricData = [];
    if (m.cpuPercent != null)
      metricData.push({
        type: "CPU",
        value: m.cpuPercent,
        agentId: agent.id,
        metadata: m.loadAvg
          ? JSON.stringify({ loadAvg: m.loadAvg })
          : undefined,
      });
    if (m.memPercent != null)
      metricData.push({
        type: "MEMORY",
        value: m.memPercent,
        agentId: agent.id,
        metadata:
          m.memTotal != null
            ? JSON.stringify({ total: m.memTotal, used: m.memUsed })
            : undefined,
      });
    if (m.diskPercent != null)
      metricData.push({
        type: "DISK",
        value: m.diskPercent,
        agentId: agent.id,
        metadata:
          m.diskTotal != null
            ? JSON.stringify({ total: m.diskTotal, used: m.diskUsed })
            : undefined,
      });
    if (m.loadAvg?.[0] != null)
      metricData.push({
        type: "LOAD",
        value: m.loadAvg[0],
        agentId: agent.id,
      });
    if (m.networkRx != null)
      metricData.push({
        type: "NETWORK_IN",
        value: m.networkRx,
        agentId: agent.id,
      });
    if (m.networkTx != null)
      metricData.push({
        type: "NETWORK_OUT",
        value: m.networkTx,
        agentId: agent.id,
      });
    if (metricData.length > 0) {
      await db.guardMetric.createMany({ data: metricData });
    }

    // 3. Upsert alerts (non-INFO only, deduped by title)
    for (const finding of nonInfoFindings) {
      const existing = await db.guardAlert.findFirst({
        where: { agentId: agent.id, title: finding.title, status: "OPEN" },
      });
      if (!existing) {
        const created = await db.guardAlert.create({
          data: {
            type: (finding.category || "SYSTEM").toUpperCase(),
            severity: finding.severity,
            title: finding.title,
            description: finding.description || "",
            aiRecommendation: finding.remediation || null,
            agentId: agent.id,
          },
        });

        // Email notification for CRITICAL/HIGH
        if (
          created.severity === "CRITICAL" ||
          created.severity === "HIGH"
        ) {
          sendGuardAlertNotification({
            id: created.id,
            severity: created.severity,
            title: created.title,
            type: created.type,
            description: created.description,
            agentName: agent.name,
            hostname: agent.hostname || "Unknown",
            ipAddress: agent.ipAddress || "Unknown",
            organization: agent.organization.name,
          }).catch(() => {});
        }
      }
    }

    // 4. Auto-resolve alerts no longer found
    const openAlerts = await db.guardAlert.findMany({
      where: { agentId: agent.id, status: "OPEN" },
    });
    const currentTitles = new Set(
      nonInfoFindings.map((f: { title: string }) => f.title)
    );
    for (const alert of openAlerts) {
      if (!currentTitles.has(alert.title)) {
        await db.guardAlert.update({
          where: { id: alert.id },
          data: { status: "RESOLVED", resolvedAt: new Date() },
        });
      }
    }

    // 5. Upsert service statuses
    if (Array.isArray(scanResult.services)) {
      for (const svc of scanResult.services) {
        if (!svc.name) continue;
        await db.guardServiceStatus.upsert({
          where: {
            agentId_serviceName: {
              agentId: agent.id,
              serviceName: svc.name,
            },
          },
          create: {
            serviceName: svc.name,
            isActive: svc.status === "active",
            isEnabled: svc.enabled ?? false,
            agentId: agent.id,
          },
          update: {
            isActive: svc.status === "active",
            isEnabled: svc.enabled ?? false,
          },
        });
      }
    }

    // 6. Update agent with scan summary
    await db.guardAgent.update({
      where: { id: agent.id },
      data: {
        lastHeartbeat: new Date(),
        status: "ONLINE",
        ...(scanResult.patches && {
          pendingUpdates: scanResult.patches.total || 0,
          securityUpdates: scanResult.patches.security || 0,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      grade: scanResult.grade,
      threatScore: scanResult.threatScore,
      findings: nonInfoFindings.length,
    });
  } catch (error) {
    console.error("[GuardAgent] Scan submission error:", error);
    return NextResponse.json(
      { error: "Failed to process scan results" },
      { status: 500 }
    );
  }
}
