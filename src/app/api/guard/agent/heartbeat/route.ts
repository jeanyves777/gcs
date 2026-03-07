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
  const { metrics, alerts, systemInfo, devices, commandResults, serviceStatuses, packageRefresh } = body;

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
    if (systemInfo.distro) updateData.distro = systemInfo.distro;
    if (systemInfo.distroVersion) updateData.distroVersion = systemInfo.distroVersion;
    if (systemInfo.packageManager) updateData.packageManager = systemInfo.packageManager;
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

  // Process alerts with deduplication (same type+agent in last 5 min -> skip)
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

  // Process service statuses
  if (Array.isArray(serviceStatuses)) {
    for (const svc of serviceStatuses) {
      if (!svc.name) continue;
      await db.guardServiceStatus.upsert({
        where: { agentId_serviceName: { agentId: agent.id, serviceName: svc.name } },
        update: {
          isActive: svc.active ?? false,
          isEnabled: svc.enabled ?? false,
          subState: svc.subState || null,
          memoryUsage: svc.memory || null,
          lastChecked: new Date(),
        },
        create: {
          serviceName: svc.name,
          isActive: svc.active ?? false,
          isEnabled: svc.enabled ?? false,
          subState: svc.subState || null,
          memoryUsage: svc.memory || null,
          agentId: agent.id,
        },
      });
    }
  }

  // Process command results
  if (Array.isArray(commandResults)) {
    for (const cr of commandResults) {
      if (!cr.id || !cr.status) continue;

      // Look up the command to determine its type for special handling
      const command = await db.guardCommand.findUnique({ where: { id: cr.id } });
      if (!command) continue;

      await db.guardCommand.update({
        where: { id: cr.id },
        data: {
          status: cr.status,
          result: cr.output ? (typeof cr.output === "string" ? cr.output : JSON.stringify(cr.output)) : null,
          completedAt: new Date(),
        },
      });

      // Update PatchHistory records when patch commands complete
      if (["INSTALL_PACKAGES", "SYSTEM_UPGRADE", "UNINSTALL_PACKAGES", "ROLLBACK_PACKAGE"].includes(command.type)) {
        const patchStatus = cr.status === "COMPLETED" ? "COMPLETED" : "FAILED";

        if (command.type === "INSTALL_PACKAGES" || command.type === "UNINSTALL_PACKAGES") {
          // Update patch history for specific packages in this command
          try {
            const payload = typeof command.payload === "string" ? JSON.parse(command.payload) : command.payload;
            const packageNames = payload?.packages || [];
            if (packageNames.length > 0) {
              await db.guardPatchHistory.updateMany({
                where: {
                  agentId: agent.id,
                  packageName: { in: packageNames },
                  status: "PENDING",
                },
                data: {
                  status: patchStatus,
                  completedAt: new Date(),
                  output: cr.output ? (typeof cr.output === "string" ? cr.output.slice(0, 5000) : JSON.stringify(cr.output).slice(0, 5000)) : null,
                },
              });
            }
          } catch {
            // Ignore payload parse errors
          }
        } else if (command.type === "SYSTEM_UPGRADE") {
          // System upgrade affects all pending patches for this agent
          await db.guardPatchHistory.updateMany({
            where: {
              agentId: agent.id,
              status: "PENDING",
            },
            data: {
              status: patchStatus,
              completedAt: new Date(),
              output: cr.output ? (typeof cr.output === "string" ? cr.output.slice(0, 2000) : JSON.stringify(cr.output).slice(0, 2000)) : null,
            },
          });
        } else if (command.type === "ROLLBACK_PACKAGE") {
          try {
            const payload = typeof command.payload === "string" ? JSON.parse(command.payload) : command.payload;
            const pkgName = payload?.package;
            if (pkgName) {
              await db.guardPatchHistory.updateMany({
                where: {
                  agentId: agent.id,
                  packageName: pkgName,
                  status: "PENDING",
                },
                data: {
                  status: patchStatus,
                  completedAt: new Date(),
                },
              });
            }
          } catch {
            // Ignore
          }
        }

        // After successful package operations, update agent's pending counts
        if (cr.status === "COMPLETED") {
          const updatable = await db.guardPackage.count({
            where: { agentId: agent.id, status: "UPDATE_AVAILABLE" },
          });
          const securityUpdatable = await db.guardPackage.count({
            where: { agentId: agent.id, status: "UPDATE_AVAILABLE", isSecurityUpdate: true },
          });
          await db.guardAgent.update({
            where: { id: agent.id },
            data: {
              pendingUpdates: updatable,
              securityUpdates: securityUpdatable,
              lastPatchCheck: new Date(),
            },
          });
        }
      }

      // Special handling for COLLECT_PACKAGES results
      if (command.type === "COLLECT_PACKAGES" && cr.status === "COMPLETED" && cr.output) {
        try {
          const packages = typeof cr.output === "string" ? JSON.parse(cr.output) : cr.output;
          if (Array.isArray(packages)) {
            let pending = 0;
            let security = 0;
            for (const pkg of packages) {
              if (!pkg.name || !pkg.version) continue;
              await db.guardPackage.upsert({
                where: {
                  agentId_name_source: {
                    agentId: agent.id,
                    name: pkg.name,
                    source: pkg.source || "apt",
                  },
                },
                update: {
                  version: pkg.version,
                  newVersion: pkg.newVersion || null,
                  isSecurityUpdate: pkg.isSecurityUpdate ?? false,
                  status: pkg.newVersion ? "UPDATE_AVAILABLE" : "INSTALLED",
                  lastChecked: new Date(),
                },
                create: {
                  name: pkg.name,
                  version: pkg.version,
                  newVersion: pkg.newVersion || null,
                  source: pkg.source || "apt",
                  isSecurityUpdate: pkg.isSecurityUpdate ?? false,
                  status: pkg.newVersion ? "UPDATE_AVAILABLE" : "INSTALLED",
                  agentId: agent.id,
                },
              });
              if (pkg.newVersion) {
                pending++;
                if (pkg.isSecurityUpdate) security++;
              }
            }
            await db.guardAgent.update({
              where: { id: agent.id },
              data: {
                pendingUpdates: pending,
                securityUpdates: security,
                lastInventorySync: new Date(),
              },
            });
          }
        } catch {
          // Ignore parse errors for package data
        }
      }

      // Special handling for CHECK_URLS results
      if (command.type === "CHECK_URLS" && cr.status === "COMPLETED" && cr.output) {
        try {
          const results = typeof cr.output === "string" ? JSON.parse(cr.output) : cr.output;
          if (Array.isArray(results)) {
            for (const result of results) {
              if (!result.monitorId) continue;
              const monitor = await db.guardUrlMonitor.findUnique({
                where: { id: result.monitorId },
              });
              if (!monitor) continue;

              const isUp = result.isUp ?? (result.statusCode >= 200 && result.statusCode < 400);
              const wasDown = monitor.isDown;

              // Create check record
              await db.guardUrlCheck.create({
                data: {
                  statusCode: result.statusCode || null,
                  responseMs: result.responseMs || null,
                  error: result.error || null,
                  isUp,
                  monitorId: monitor.id,
                },
              });

              // Update monitor state
              await db.guardUrlMonitor.update({
                where: { id: monitor.id },
                data: {
                  lastStatus: result.statusCode || null,
                  lastResponseMs: result.responseMs || null,
                  lastChecked: new Date(),
                  lastError: result.error || null,
                  isDown: !isUp,
                  ...(!isUp && !wasDown ? { downSince: new Date() } : {}),
                  ...(isUp && wasDown ? { downSince: null } : {}),
                },
              });

              // Alert + email on state change: was up, now down
              if (!isUp && !wasDown) {
                const alert = await db.guardAlert.create({
                  data: {
                    type: "URL_DOWN",
                    severity: "HIGH",
                    title: `URL Down: ${monitor.name}`,
                    description: `${monitor.url} is not responding. Status: ${result.statusCode || "N/A"}. Error: ${result.error || "No response"}`,
                    evidence: JSON.stringify(result),
                    agentId: agent.id,
                  },
                });

                sendGuardAlertNotification({
                  id: alert.id,
                  severity: alert.severity,
                  title: alert.title,
                  type: alert.type,
                  description: alert.description,
                  agentName: agent.name,
                  hostname: agent.hostname || "Unknown",
                  ipAddress: agent.ipAddress || "Unknown",
                  organization: agent.organization.name,
                }).catch(() => {});
              }
            }
          }
        } catch {
          // Ignore parse errors for URL check data
        }
      }
    }
  }

  // Auto-schedule URL checks for overdue monitors
  const now = new Date();
  const overdueMonitors = await db.guardUrlMonitor.findMany({
    where: {
      agentId: agent.id,
      isActive: true,
      OR: [
        { lastChecked: null },
        { lastChecked: { lt: new Date(now.getTime() - 30 * 1000) } }, // at least 30s old as minimum
      ],
    },
  });

  // Filter to only those truly overdue based on their individual intervalSec
  const urlChecks = overdueMonitors.filter((m) => {
    if (!m.lastChecked) return true;
    const elapsed = (now.getTime() - m.lastChecked.getTime()) / 1000;
    return elapsed >= m.intervalSec;
  });

  // Handle packageRefresh (auto-sent after install/upgrade)
  if (Array.isArray(packageRefresh) && packageRefresh.length > 0) {
    try {
      let pending = 0;
      let security = 0;
      for (const pkg of packageRefresh) {
        if (!pkg.name || !pkg.version) continue;
        await db.guardPackage.upsert({
          where: {
            agentId_name_source: {
              agentId: agent.id,
              name: pkg.name,
              source: pkg.source || "apt",
            },
          },
          update: {
            version: pkg.version,
            newVersion: pkg.newVersion || null,
            isSecurityUpdate: pkg.isSecurityUpdate ?? false,
            status: pkg.newVersion ? "UPDATE_AVAILABLE" : "INSTALLED",
            lastChecked: new Date(),
          },
          create: {
            name: pkg.name,
            version: pkg.version,
            newVersion: pkg.newVersion || null,
            source: pkg.source || "apt",
            isSecurityUpdate: pkg.isSecurityUpdate ?? false,
            status: pkg.newVersion ? "UPDATE_AVAILABLE" : "INSTALLED",
            agentId: agent.id,
          },
        });
        if (pkg.newVersion) {
          pending++;
          if (pkg.isSecurityUpdate) security++;
        }
      }
      await db.guardAgent.update({
        where: { id: agent.id },
        data: {
          pendingUpdates: pending,
          securityUpdates: security,
          lastInventorySync: new Date(),
          lastPatchCheck: new Date(),
        },
      });
    } catch {
      // Ignore package refresh errors
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

  // Build command list with ephemeral URL check commands
  const commands = pendingCommands.map((c) => ({
    id: c.id,
    type: c.type,
    payload: JSON.parse(c.payload),
  }));

  if (urlChecks.length > 0) {
    commands.push({
      id: `ephemeral-url-check-${Date.now()}`,
      type: "CHECK_URLS",
      payload: {
        monitors: urlChecks.map((m) => ({
          monitorId: m.id,
          url: m.url,
          method: m.method,
          expectedStatus: m.expectedStatus,
          timeoutMs: m.timeoutMs,
        })),
      },
    });
  }

  return NextResponse.json({
    status: "ok",
    commands,
  });
}
