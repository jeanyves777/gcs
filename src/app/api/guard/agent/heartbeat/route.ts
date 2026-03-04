import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateAgent } from "@/lib/guard-auth";
import { sendGuardAlertNotification } from "@/lib/email";

export async function POST(request: Request) {
  const agent = await authenticateAgent(request);
  if (!agent) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const body = await request.json();
  const { metrics, alerts, systemInfo, devices, commandResults } = body;

  // Update agent status and system info
  const updateData: Record<string, unknown> = {
    status: "ONLINE",
    lastHeartbeat: new Date(),
  };
  if (systemInfo) {
    if (systemInfo.hostname) updateData.hostname = systemInfo.hostname;
    if (systemInfo.os) updateData.os = systemInfo.os;
    if (systemInfo.kernel) updateData.kernelVersion = systemInfo.kernel;
    if (systemInfo.ip) updateData.ipAddress = systemInfo.ip;
  }

  await db.guardAgent.update({
    where: { id: agent.id },
    data: updateData,
  });

  // Store metrics
  if (metrics && typeof metrics === "object") {
    const metricRecords = [];
    for (const [type, value] of Object.entries(metrics)) {
      if (typeof value === "number") {
        metricRecords.push({
          type: type.toUpperCase(),
          value,
          agentId: agent.id,
        });
      }
    }
    if (metricRecords.length > 0) {
      await db.guardMetric.createMany({ data: metricRecords });
    }
  }

  // Process alerts with deduplication (same type+agent in last 5 min → skip)
  if (Array.isArray(alerts)) {
    for (const alert of alerts) {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      const existing = await db.guardAlert.findFirst({
        where: {
          agentId: agent.id,
          type: alert.type,
          createdAt: { gte: fiveMinAgo },
        },
      });
      if (!existing) {
        const created = await db.guardAlert.create({
          data: {
            type: alert.type,
            severity: alert.severity || "MEDIUM",
            title: alert.title,
            description: alert.description || "",
            evidence: alert.evidence ? JSON.stringify(alert.evidence) : null,
            agentId: agent.id,
          },
        });

        // Email notification for CRITICAL/HIGH alerts (fire-and-forget)
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

  // Process network device inventory
  if (Array.isArray(devices)) {
    for (const device of devices) {
      if (!device.mac) continue;
      await db.guardDevice.upsert({
        where: {
          agentId_macAddress: {
            agentId: agent.id,
            macAddress: device.mac,
          },
        },
        update: {
          ipAddress: device.ip || null,
          hostname: device.hostname || null,
          isOnline: true,
          lastSeen: new Date(),
          ...(device.vendor && { vendor: device.vendor }),
          ...(device.type && { deviceType: device.type }),
          ...(device.metadata && { metadata: JSON.stringify(device.metadata) }),
        },
        create: {
          macAddress: device.mac,
          ipAddress: device.ip || null,
          hostname: device.hostname || null,
          vendor: device.vendor || null,
          deviceType: device.type || "UNKNOWN",
          agentId: agent.id,
        },
      });
    }
  }

  // Process command results
  if (Array.isArray(commandResults)) {
    for (const cr of commandResults) {
      if (cr.id && cr.status) {
        await db.guardCommand.update({
          where: { id: cr.id },
          data: {
            status: cr.status,
            result: cr.output ? JSON.stringify(cr.output) : null,
            completedAt: new Date(),
          },
        });
      }
    }
  }

  // Fetch pending commands to send to agent
  const pendingCommands = await db.guardCommand.findMany({
    where: { agentId: agent.id, status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 10,
  });

  // Mark as SENT
  if (pendingCommands.length > 0) {
    await db.guardCommand.updateMany({
      where: { id: { in: pendingCommands.map((c) => c.id) } },
      data: { status: "SENT", sentAt: new Date() },
    });
  }

  return NextResponse.json({
    status: "ok",
    commands: pendingCommands.map((c) => ({
      id: c.id,
      type: c.type,
      payload: JSON.parse(c.payload),
    })),
  });
}
