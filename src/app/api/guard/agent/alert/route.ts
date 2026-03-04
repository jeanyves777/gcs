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
  const { type, severity, title, description, evidence } = body;

  if (!type || !title) {
    return NextResponse.json(
      { error: "type and title are required" },
      { status: 400 }
    );
  }

  const alert = await db.guardAlert.create({
    data: {
      type,
      severity: severity || "MEDIUM",
      title,
      description: description || "",
      evidence: evidence ? JSON.stringify(evidence) : null,
      agentId: agent.id,
    },
  });

  // Email notification for CRITICAL/HIGH alerts (fire-and-forget)
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

  return NextResponse.json({ alertId: alert.id, status: "created" });
}
