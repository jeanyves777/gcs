import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";
import { runPentest } from "@/lib/pentest";
import type { SecurityReport as PentestReport } from "@/lib/pentest";

/**
 * GET /api/admin/security-reports — List all reports
 * POST /api/admin/security-reports — Start a new scan
 */

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reports = await db.securityReport.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      target: true,
      targetType: true,
      status: true,
      overallGrade: true,
      riskScore: true,
      totalFindings: true,
      criticalCount: true,
      highCount: true,
      mediumCount: true,
      lowCount: true,
      executiveSummary: true,
      createdAt: true,
      completedAt: true,
    },
  });

  return NextResponse.json({ reports });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { target, targetType = "website" } = await req.json();
  if (!target || typeof target !== "string") {
    return NextResponse.json({ error: "target is required" }, { status: 400 });
  }

  // Clean up domain
  let domain = target.trim().toLowerCase();
  domain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

  // Create report record in "scanning" state
  const report = await db.securityReport.create({
    data: {
      target: domain,
      targetType,
      status: "scanning",
      userId: user.id,
    },
  });

  // Run scan in background (don't await — return immediately)
  runScanAndSave(report.id, domain, targetType).catch((err) => {
    console.error("[SecurityReport] Background scan error:", err);
  });

  return NextResponse.json({ id: report.id, status: "scanning", target: domain });
}

async function runScanAndSave(reportId: string, domain: string, targetType: string) {
  try {
    let reportData: PentestReport;

    if (targetType === "email") {
      // For email, extract domain and scan DNS/email security
      const emailDomain = domain.includes("@") ? domain.split("@")[1] : domain;
      reportData = await runPentest(emailDomain);
    } else {
      reportData = await runPentest(domain);
    }

    // Build action plan from remediation roadmap
    const actionPlan = buildActionPlan(reportData);

    await db.securityReport.update({
      where: { id: reportId },
      data: {
        status: "completed",
        overallGrade: reportData.overallGrade,
        riskScore: reportData.riskScore,
        totalFindings: reportData.findings.length,
        criticalCount: reportData.totalFindings.critical,
        highCount: reportData.totalFindings.high,
        mediumCount: reportData.totalFindings.medium,
        lowCount: reportData.totalFindings.low,
        executiveSummary: reportData.executiveSummary,
        reportData: JSON.stringify(reportData),
        actionPlan: JSON.stringify(actionPlan),
        completedAt: new Date(),
      },
    });
  } catch (err) {
    console.error("[SecurityReport] Scan failed:", err);
    await db.securityReport.update({
      where: { id: reportId },
      data: { status: "failed", executiveSummary: `Scan failed: ${String(err)}` },
    });
  }
}

function buildActionPlan(report: PentestReport) {
  const phases = [
    {
      name: "Immediate (0-7 days)",
      effort: "quick-win" as const,
      items: report.remediationRoadmap.filter((r) => r.effort === "quick-win"),
    },
    {
      name: "Short-term (1-4 weeks)",
      effort: "short-term" as const,
      items: report.remediationRoadmap.filter((r) => r.effort === "short-term"),
    },
    {
      name: "Long-term (1-3 months)",
      effort: "long-term" as const,
      items: report.remediationRoadmap.filter((r) => r.effort === "long-term"),
    },
  ];

  return {
    phases,
    totalItems: report.remediationRoadmap.length,
    estimatedTotalDays: report.remediationRoadmap.reduce((s, r) => s + r.estimatedDays, 0),
    categoryBreakdown: report.categoryScores.map((c) => ({
      category: c.category,
      label: c.label,
      grade: c.grade,
      score: c.score,
      findings: c.findings,
    })),
  };
}
