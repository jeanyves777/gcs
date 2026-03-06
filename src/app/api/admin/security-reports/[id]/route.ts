import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";
import { sendMail } from "@/lib/email";

/**
 * GET /api/admin/security-reports/[id] — Get full report
 * DELETE /api/admin/security-reports/[id] — Delete report
 * POST /api/admin/security-reports/[id] — Actions: email, rescan
 */

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const report = await db.securityReport.findUnique({ where: { id } });
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...report,
    reportData: report.reportData ? JSON.parse(report.reportData) : null,
    actionPlan: report.actionPlan ? JSON.parse(report.actionPlan) : null,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await db.securityReport.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action, email } = await req.json();

  if (action === "email") {
    if (!email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    const report = await db.securityReport.findUnique({ where: { id } });
    if (!report || !report.reportData) {
      return NextResponse.json({ error: "Report not found or incomplete" }, { status: 404 });
    }

    const data = JSON.parse(report.reportData);

    // Build email HTML
    const gradeColor: Record<string, string> = { A: "#22c55e", B: "#84cc16", C: "#f59e0b", D: "#f97316", F: "#ef4444" };
    const gc = gradeColor[report.overallGrade || "F"] || "#ef4444";

    const findingsHtml = data.findings
      .filter((f: { severity: string }) => f.severity !== "informational")
      .slice(0, 15)
      .map((f: { severity: string; title: string; description: string; recommendation: string }) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #eee;">
            <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;color:#fff;background:${
              f.severity === "critical" ? "#ef4444" : f.severity === "high" ? "#f97316" : f.severity === "medium" ? "#f59e0b" : "#3b82f6"
            }">${f.severity.toUpperCase()}</span>
          </td>
          <td style="padding:8px;border-bottom:1px solid #eee;font-size:13px;">${f.title}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;font-size:12px;color:#666;">${f.recommendation}</td>
        </tr>
      `)
      .join("");

    const categoryHtml = data.categoryScores
      .map((c: { label: string; grade: string; score: number; findings: number }) => `
        <div style="display:inline-block;text-align:center;margin:8px 12px;">
          <div style="font-size:24px;font-weight:bold;color:${gradeColor[c.grade] || "#666"}">${c.grade}</div>
          <div style="font-size:11px;color:#666;">${c.label}</div>
          <div style="font-size:10px;color:#999;">${c.score}/100</div>
        </div>
      `)
      .join("");

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:30px;text-align:center;color:#fff;">
          <h1 style="margin:0;font-size:22px;">Security Assessment Report</h1>
          <p style="margin:8px 0 0;opacity:0.8;font-size:14px;">${report.target}</p>
          <div style="margin:20px auto;width:80px;height:80px;border-radius:50%;background:${gc};display:flex;align-items:center;justify-content:center;">
            <span style="font-size:36px;font-weight:bold;color:#fff;">${report.overallGrade}</span>
          </div>
          <p style="margin:0;font-size:13px;opacity:0.7;">Risk Score: ${report.riskScore}/100 | ${report.totalFindings} findings</p>
        </div>

        <div style="padding:24px;">
          <h2 style="font-size:16px;margin:0 0 12px;color:#1e293b;">Executive Summary</h2>
          <p style="font-size:13px;color:#475569;line-height:1.6;">${report.executiveSummary}</p>

          <h2 style="font-size:16px;margin:24px 0 12px;color:#1e293b;">Category Grades</h2>
          <div style="text-align:center;">${categoryHtml}</div>

          <h2 style="font-size:16px;margin:24px 0 12px;color:#1e293b;">Key Findings</h2>
          <div style="text-align:center;margin-bottom:12px;">
            <span style="display:inline-block;padding:4px 12px;margin:4px;border-radius:20px;font-size:12px;font-weight:bold;background:#fef2f2;color:#ef4444;">${report.criticalCount} Critical</span>
            <span style="display:inline-block;padding:4px 12px;margin:4px;border-radius:20px;font-size:12px;font-weight:bold;background:#fff7ed;color:#f97316;">${report.highCount} High</span>
            <span style="display:inline-block;padding:4px 12px;margin:4px;border-radius:20px;font-size:12px;font-weight:bold;background:#fefce8;color:#f59e0b;">${report.mediumCount} Medium</span>
            <span style="display:inline-block;padding:4px 12px;margin:4px;border-radius:20px;font-size:12px;font-weight:bold;background:#eff6ff;color:#3b82f6;">${report.lowCount} Low</span>
          </div>
          <table style="width:100%;border-collapse:collapse;">
            <thead><tr style="background:#f8fafc;"><th style="padding:8px;text-align:left;font-size:11px;color:#64748b;">Severity</th><th style="padding:8px;text-align:left;font-size:11px;color:#64748b;">Finding</th><th style="padding:8px;text-align:left;font-size:11px;color:#64748b;">Recommendation</th></tr></thead>
            <tbody>${findingsHtml}</tbody>
          </table>

          <div style="margin-top:30px;padding:20px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;">
            <h3 style="margin:0 0 8px;font-size:14px;color:#166534;">Ready to fix these issues?</h3>
            <p style="margin:0;font-size:13px;color:#15803d;">GCS can implement all recommended fixes. Contact us for a remediation plan and quote.</p>
          </div>
        </div>

        <div style="padding:16px 24px;background:#f8fafc;text-align:center;font-size:11px;color:#94a3b8;">
          Generated by GCS Security Scanner | General Computing Solutions | itatgcs.com
        </div>
      </div>
    `;

    await sendMail({
      to: email,
      subject: `Security Assessment: ${report.target} — Grade ${report.overallGrade}`,
      html,
    });

    return NextResponse.json({ success: true, sentTo: email });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
