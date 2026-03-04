import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isGCSStaff } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { analyzeAlert } from "@/lib/guard-ai";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !isGCSStaff(session.user.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const alert = await db.guardAlert.findUnique({
    where: { id },
    include: {
      agent: {
        select: { hostname: true, ipAddress: true, os: true, id: true },
      },
    },
  });

  if (!alert) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  // Fetch recent alerts from same agent for context
  const recentAlerts = await db.guardAlert.findMany({
    where: {
      agentId: alert.agentId,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      id: { not: id },
    },
    select: { type: true, title: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const { analysis, recommendation } = await analyzeAlert({
    type: alert.type,
    severity: alert.severity,
    title: alert.title,
    description: alert.description,
    evidence: alert.evidence,
    agent: alert.agent,
    recentAlerts,
  });

  // Store analysis on the alert
  const updated = await db.guardAlert.update({
    where: { id },
    data: {
      aiAnalysis: analysis,
      aiRecommendation: recommendation,
      status: alert.status === "OPEN" ? "INVESTIGATING" : alert.status,
    },
  });

  return NextResponse.json({
    analysis: updated.aiAnalysis,
    recommendation: updated.aiRecommendation,
  });
}
