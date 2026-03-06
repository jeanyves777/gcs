"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Shield, ShieldAlert, ShieldCheck, ArrowLeft, Mail, Download, Globe, Lock,
  AlertTriangle, CheckCircle2, XCircle, Server, Wifi, FileText, Clock,
  ChevronDown, ChevronRight, Zap, Target,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Finding {
  id: string;
  category: string;
  severity: string;
  cvss: number;
  title: string;
  description: string;
  evidence: string;
  businessImpact: string;
  recommendation: string;
  effort: string;
  priority: number;
}

interface CategoryScore {
  category: string;
  label: string;
  score: number;
  grade: string;
  findings: number;
  criticalCount: number;
  highCount: number;
}

interface ActionPhase {
  name: string;
  effort: string;
  items: { priority: number; title: string; category: string; effort: string; estimatedDays: number; cvss: number; gcsSolution: string }[];
}

interface ActionPlan {
  phases: ActionPhase[];
  totalItems: number;
  estimatedTotalDays: number;
  categoryBreakdown: { category: string; label: string; grade: string; score: number; findings: number }[];
}

interface PortResult { port: number; service: string; open: boolean; risk: string }
interface SslInfo { valid: boolean; grade: string; expiryDate: string | null; daysUntilExpiry: number | null; issuer: string | null; selfSigned: boolean }
interface DnsInfo { ipAddress: string | null; hasSpf: boolean; hasDmarc: boolean; hasDkim: boolean; mxRecords: string[]; nameservers: string[] }
interface HeadersDetail { csp: boolean; hsts: boolean; xFrameOptions: boolean; xContentTypeOptions: boolean; referrerPolicy: boolean; permissionsPolicy: boolean; headerScore: number }
interface TechStack { server: string | null; poweredBy: string | null; cms: string | null; cdn: string | null; waf: string | null; frameworks: string[] }

interface ReportData {
  domain: string;
  scannedAt: string;
  ports: PortResult[];
  ssl: SslInfo | null;
  dns: DnsInfo;
  headersDetail: HeadersDetail;
  techStack: TechStack;
  findings: Finding[];
  categoryScores: CategoryScore[];
  remediationRoadmap: { priority: number; title: string; category: string; effort: string; estimatedDays: number; cvss: number; gcsSolution: string }[];
  totalFindings: { critical: number; high: number; medium: number; low: number; informational: number };
  overallGrade: string;
  riskScore: number;
  executiveSummary: string;
}

interface FullReport {
  id: string;
  target: string;
  targetType: string;
  status: string;
  overallGrade: string;
  riskScore: number;
  totalFindings: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  executiveSummary: string;
  reportData: ReportData;
  actionPlan: ActionPlan;
  createdAt: string;
  completedAt: string;
}

const GRADE_COLORS: Record<string, string> = { A: "#22c55e", B: "#84cc16", C: "#f59e0b", D: "#f97316", F: "#ef4444" };
const SEV_COLORS: Record<string, string> = { critical: "#ef4444", high: "#f97316", medium: "#f59e0b", low: "#3b82f6", informational: "#94a3b8" };
const CAT_ICONS: Record<string, React.ElementType> = { network: Wifi, ssl: Lock, dns: Globe, headers: Shield, application: FileText, email: Mail, infrastructure: Server };

// ─── Component ──────────────────────────────────────────────────────────────

export function SecurityReportDetail({ reportId }: { reportId: string }) {
  const [report, setReport] = useState<FullReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);
  const [expandedPhase, setExpandedPhase] = useState<number>(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/security-reports/${reportId}`);
        if (res.ok) setReport(await res.json());
      } catch { }
      setLoading(false);
    };
    load();
    // Poll if scanning
    const interval = setInterval(async () => {
      const res = await fetch(`/api/admin/security-reports/${reportId}`);
      if (res.ok) {
        const data = await res.json();
        setReport(data);
        if (data.status !== "scanning") clearInterval(interval);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [reportId]);

  if (loading && !report) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: "var(--brand-primary)", borderTopColor: "transparent" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading report...</p>
        </div>
      </div>
    );
  }

  if (!report) return <div className="text-center py-20 text-sm" style={{ color: "var(--text-muted)" }}>Report not found</div>;

  if (report.status === "scanning") {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 border-3 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: "var(--brand-primary)", borderTopColor: "transparent", borderWidth: "3px" }} />
          <h2 className="text-lg font-bold mb-2">Scanning {report.target}...</h2>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Running port scan, SSL check, DNS analysis, header inspection, and vulnerability assessment. This takes 30-90 seconds.</p>
        </div>
      </div>
    );
  }

  const rd = report.reportData;
  const ap = report.actionPlan;
  if (!rd) return <div className="text-center py-20 text-sm" style={{ color: "var(--text-muted)" }}>Report data unavailable</div>;

  const gc = GRADE_COLORS[report.overallGrade] || "#666";

  return (
    <div className="space-y-5 max-w-[1200px] mx-auto">
      {/* Back */}
      <Link href="/portal/admin/security-reports" className="inline-flex items-center gap-1 text-xs hover:underline" style={{ color: "var(--text-muted)" }}>
        <ArrowLeft className="w-3 h-3" /> Back to Reports
      </Link>

      {/* ═══ HERO HEADER ═════════════════════════════════════════════════ */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
        <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${gc}, ${gc}88, ${gc}44)` }} />
        <div className="p-6 flex flex-wrap items-center gap-6">
          {/* Grade circle */}
          <div className="w-20 h-20 rounded-full flex items-center justify-center shrink-0 shadow-lg"
            style={{ background: `linear-gradient(135deg, ${gc}, ${gc}cc)` }}>
            <span className="text-3xl font-black text-white">{report.overallGrade}</span>
          </div>
          <div className="flex-1 min-w-[200px]">
            <h1 className="text-xl font-bold mb-1">{report.target}</h1>
            <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
              Scanned {new Date(report.createdAt).toLocaleDateString()} at {new Date(report.createdAt).toLocaleTimeString()}
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge className="text-[11px]" style={{ background: `${gc}15`, color: gc, borderColor: `${gc}30` }}>
                Risk Score: {report.riskScore}/100
              </Badge>
              <Badge className="text-[11px] bg-red-500/10 text-red-600 border-red-500/20">
                {report.criticalCount} Critical
              </Badge>
              <Badge className="text-[11px] bg-orange-500/10 text-orange-600 border-orange-500/20">
                {report.highCount} High
              </Badge>
              <Badge className="text-[11px] bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                {report.mediumCount} Medium
              </Badge>
              <Badge className="text-[11px] bg-blue-500/10 text-blue-600 border-blue-500/20">
                {report.lowCount} Low
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => {
              const email = prompt("Send report to email:");
              if (email) fetch(`/api/admin/security-reports/${reportId}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "email", email }),
              }).then(() => alert("Sent!"));
            }}>
              <Mail className="w-3.5 h-3.5 mr-1" /> Email
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <Download className="w-3.5 h-3.5 mr-1" /> Print/PDF
            </Button>
          </div>
        </div>
      </div>

      {/* ═══ EXECUTIVE SUMMARY ═══════════════════════════════════════════ */}
      <div className="rounded-xl p-5" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
        <h2 className="text-sm font-bold mb-2 flex items-center gap-2">
          <FileText className="w-4 h-4" style={{ color: "var(--text-muted)" }} /> Executive Summary
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{report.executiveSummary}</p>
      </div>

      {/* ═══ CATEGORY SCORES ═════════════════════════════════════════════ */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {rd.categoryScores.map((cat) => {
          const CatIcon = CAT_ICONS[cat.category] || Shield;
          const cg = GRADE_COLORS[cat.grade] || "#666";
          return (
            <div key={cat.category} className="rounded-xl p-4" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CatIcon className="w-4 h-4" style={{ color: cg }} />
                  <span className="text-xs font-semibold">{cat.label}</span>
                </div>
                <span className="text-lg font-black" style={{ color: cg }}>{cat.grade}</span>
              </div>
              {/* Score bar */}
              <div className="w-full h-2 rounded-full mb-2" style={{ background: "var(--bg-secondary)" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${cat.score}%`, background: cg }} />
              </div>
              <div className="flex items-center justify-between text-[10px]" style={{ color: "var(--text-muted)" }}>
                <span>{cat.score}/100</span>
                <span>{cat.findings} findings ({cat.criticalCount} critical)</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══ RISK GAUGE ══════════════════════════════════════════════════ */}
      <div className="rounded-xl p-5" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
        <h2 className="text-sm font-bold mb-4 flex items-center gap-2">
          <Target className="w-4 h-4" style={{ color: "var(--text-muted)" }} /> Risk Distribution
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            {/* Stacked bar */}
            <div className="w-full h-8 rounded-lg overflow-hidden flex">
              {rd.totalFindings.critical > 0 && <div style={{ width: `${(rd.totalFindings.critical / rd.findings.length) * 100}%`, background: SEV_COLORS.critical }} />}
              {rd.totalFindings.high > 0 && <div style={{ width: `${(rd.totalFindings.high / rd.findings.length) * 100}%`, background: SEV_COLORS.high }} />}
              {rd.totalFindings.medium > 0 && <div style={{ width: `${(rd.totalFindings.medium / rd.findings.length) * 100}%`, background: SEV_COLORS.medium }} />}
              {rd.totalFindings.low > 0 && <div style={{ width: `${(rd.totalFindings.low / rd.findings.length) * 100}%`, background: SEV_COLORS.low }} />}
              {rd.totalFindings.informational > 0 && <div style={{ width: `${(rd.totalFindings.informational / rd.findings.length) * 100}%`, background: SEV_COLORS.informational }} />}
            </div>
            <div className="flex flex-wrap gap-3 mt-3">
              {Object.entries(rd.totalFindings).map(([sev, count]) => count > 0 && (
                <div key={sev} className="flex items-center gap-1.5 text-[11px]">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: SEV_COLORS[sev] }} />
                  <span className="capitalize">{sev}</span>
                  <span className="font-bold">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ TECH STACK + SSL + DNS ══════════════════════════════════════ */}
      <div className="grid md:grid-cols-3 gap-3">
        {/* Tech */}
        <InfoPanel icon={Server} title="Technology Stack" color="#8b5cf6">
          <InfoRow label="Server" value={rd.techStack.server || "Hidden"} />
          <InfoRow label="Powered By" value={rd.techStack.poweredBy || "Hidden"} />
          <InfoRow label="CMS" value={rd.techStack.cms || "None detected"} />
          <InfoRow label="CDN" value={rd.techStack.cdn || "None"} />
          <InfoRow label="WAF" value={rd.techStack.waf || "None detected"} />
          {rd.techStack.frameworks.length > 0 && <InfoRow label="Frameworks" value={rd.techStack.frameworks.join(", ")} />}
        </InfoPanel>

        {/* SSL */}
        <InfoPanel icon={Lock} title="SSL/TLS" color={rd.ssl?.valid ? "#22c55e" : "#ef4444"}>
          {rd.ssl ? (
            <>
              <InfoRow label="Valid" value={rd.ssl.valid ? "Yes" : "No"} good={rd.ssl.valid} />
              <InfoRow label="Grade" value={rd.ssl.grade} />
              <InfoRow label="Issuer" value={rd.ssl.issuer || "Unknown"} />
              <InfoRow label="Expires" value={rd.ssl.daysUntilExpiry ? `${rd.ssl.daysUntilExpiry} days` : "N/A"} good={(rd.ssl.daysUntilExpiry || 0) > 30} />
              <InfoRow label="Self-Signed" value={rd.ssl.selfSigned ? "Yes" : "No"} good={!rd.ssl.selfSigned} />
            </>
          ) : (
            <p className="text-xs px-4 py-3" style={{ color: "var(--text-muted)" }}>No SSL certificate found</p>
          )}
        </InfoPanel>

        {/* DNS / Email */}
        <InfoPanel icon={Globe} title="DNS & Email" color="#06b6d4">
          <InfoRow label="IP" value={rd.dns.ipAddress || "N/A"} />
          <InfoRow label="SPF" value={rd.dns.hasSpf ? "Configured" : "Missing"} good={rd.dns.hasSpf} />
          <InfoRow label="DMARC" value={rd.dns.hasDmarc ? "Configured" : "Missing"} good={rd.dns.hasDmarc} />
          <InfoRow label="DKIM" value={rd.dns.hasDkim ? "Configured" : "Missing"} good={rd.dns.hasDkim} />
          <InfoRow label="MX Records" value={rd.dns.mxRecords.length > 0 ? rd.dns.mxRecords.slice(0, 2).join(", ") : "None"} />
        </InfoPanel>
      </div>

      {/* ═══ SECURITY HEADERS ════════════════════════════════════════════ */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
        <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" style={{ color: "#3b82f6" }} />
            <h2 className="text-sm font-bold">Security Headers</h2>
          </div>
          <Badge className="text-[10px]" style={{
            background: rd.headersDetail.headerScore >= 70 ? "#22c55e15" : rd.headersDetail.headerScore >= 40 ? "#f59e0b15" : "#ef444415",
            color: rd.headersDetail.headerScore >= 70 ? "#22c55e" : rd.headersDetail.headerScore >= 40 ? "#f59e0b" : "#ef4444",
          }}>
            {rd.headersDetail.headerScore}/100
          </Badge>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x" style={{ borderColor: "var(--border)" }}>
          <HeaderCheck label="Content-Security-Policy" enabled={rd.headersDetail.csp} />
          <HeaderCheck label="Strict-Transport-Security" enabled={rd.headersDetail.hsts} />
          <HeaderCheck label="X-Frame-Options" enabled={rd.headersDetail.xFrameOptions} />
          <HeaderCheck label="X-Content-Type-Options" enabled={rd.headersDetail.xContentTypeOptions} />
          <HeaderCheck label="Referrer-Policy" enabled={rd.headersDetail.referrerPolicy} />
          <HeaderCheck label="Permissions-Policy" enabled={rd.headersDetail.permissionsPolicy} />
        </div>
      </div>

      {/* ═══ OPEN PORTS ══════════════════════════════════════════════════ */}
      {rd.ports.filter(p => p.open).length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
          <div className="px-5 py-4 flex items-center gap-2 border-b" style={{ borderColor: "var(--border)" }}>
            <Wifi className="w-4 h-4" style={{ color: "#f97316" }} />
            <h2 className="text-sm font-bold">Open Ports</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-0">
            {rd.ports.filter(p => p.open).map((p) => (
              <div key={p.port} className="flex items-center gap-3 px-5 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
                <span className="font-mono text-xs font-bold w-12">{p.port}</span>
                <span className="text-xs flex-1">{p.service}</span>
                <Badge className="text-[10px]" style={{
                  background: `${SEV_COLORS[p.risk] || "#94a3b8"}15`,
                  color: SEV_COLORS[p.risk] || "#94a3b8",
                }}>{p.risk}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ ALL FINDINGS ════════════════════════════════════════════════ */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
        <div className="px-5 py-4 flex items-center gap-2 border-b" style={{ borderColor: "var(--border)" }}>
          <AlertTriangle className="w-4 h-4" style={{ color: "#ef4444" }} />
          <h2 className="text-sm font-bold">All Findings ({rd.findings.length})</h2>
        </div>
        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {rd.findings.sort((a, b) => b.cvss - a.cvss).map((f) => (
            <div key={f.id}>
              <button className="w-full text-left px-5 py-3 flex items-center gap-3 hover:bg-[var(--bg-secondary)] transition-colors"
                onClick={() => setExpandedFinding(expandedFinding === f.id ? null : f.id)}>
                <Badge className="text-[10px] shrink-0" style={{
                  background: `${SEV_COLORS[f.severity]}15`,
                  color: SEV_COLORS[f.severity],
                }}>{f.severity.toUpperCase()}</Badge>
                <span className="flex-1 text-xs font-medium">{f.title}</span>
                <span className="text-[10px] font-mono shrink-0" style={{ color: "var(--text-muted)" }}>CVSS {f.cvss}</span>
                {expandedFinding === f.id ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
              </button>
              {expandedFinding === f.id && (
                <div className="px-5 pb-4 grid sm:grid-cols-2 gap-3 text-xs" style={{ background: "var(--bg-secondary)" }}>
                  <div>
                    <div className="font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Description</div>
                    <p style={{ color: "var(--text-secondary)" }}>{f.description}</p>
                  </div>
                  <div>
                    <div className="font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Evidence</div>
                    <p className="font-mono text-[11px]" style={{ color: "var(--text-secondary)" }}>{f.evidence}</p>
                  </div>
                  <div>
                    <div className="font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Business Impact</div>
                    <p style={{ color: "var(--text-secondary)" }}>{f.businessImpact}</p>
                  </div>
                  <div>
                    <div className="font-semibold mb-1 text-green-600">Recommendation</div>
                    <p style={{ color: "var(--text-secondary)" }}>{f.recommendation}</p>
                    <Badge className="mt-2 text-[10px]">{f.effort}</Badge>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ═══ ACTION PLAN ═════════════════════════════════════════════════ */}
      {ap && (
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
          <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" style={{ color: "#22c55e" }} />
              <h2 className="text-sm font-bold">Remediation Action Plan</h2>
            </div>
            <Badge className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">
              {ap.totalItems} items | ~{ap.estimatedTotalDays} days total
            </Badge>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {ap.phases.map((phase, pi) => (
              <div key={pi}>
                <button className="w-full text-left px-5 py-3 flex items-center gap-3 hover:bg-[var(--bg-secondary)] transition-colors"
                  onClick={() => setExpandedPhase(expandedPhase === pi ? -1 : pi)}>
                  <Clock className="w-4 h-4 shrink-0" style={{ color: pi === 0 ? "#ef4444" : pi === 1 ? "#f59e0b" : "#3b82f6" }} />
                  <span className="flex-1 text-sm font-medium">{phase.name}</span>
                  <Badge variant="secondary" className="text-[10px]">{phase.items.length} items</Badge>
                  {expandedPhase === pi ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
                {expandedPhase === pi && phase.items.length > 0 && (
                  <div className="px-5 pb-3">
                    {phase.items.map((item, ii) => (
                      <div key={ii} className="flex items-start gap-3 py-2 border-t text-xs" style={{ borderColor: "var(--border)" }}>
                        <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold text-white"
                          style={{ background: pi === 0 ? "#ef4444" : pi === 1 ? "#f59e0b" : "#3b82f6" }}>
                          {item.priority}
                        </span>
                        <div className="flex-1">
                          <div className="font-medium">{item.title}</div>
                          <div className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
                            {item.gcsSolution}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>CVSS {item.cvss}</div>
                          <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>~{item.estimatedDays}d</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ CTA ═════════════════════════════════════════════════════════ */}
      <div className="rounded-xl p-6 text-center" style={{ background: "linear-gradient(135deg, var(--brand-primary), #1565C0)", color: "#fff" }}>
        <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-80" />
        <h2 className="text-lg font-bold mb-2">Need Help Fixing These Issues?</h2>
        <p className="text-sm opacity-80 mb-4 max-w-md mx-auto">
          GCS can implement all security recommendations. Our team handles everything from quick fixes to full infrastructure hardening.
        </p>
        <Button variant="secondary" size="sm">Contact GCS for Remediation Quote</Button>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function InfoPanel({ icon: Icon, title, color, children }: { icon: React.ElementType; title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
      <div className="px-4 py-3 flex items-center gap-2 border-b" style={{ borderColor: "var(--border)" }}>
        <Icon className="w-4 h-4" style={{ color }} />
        <h3 className="text-xs font-bold">{title}</h3>
      </div>
      <div className="divide-y" style={{ borderColor: "var(--border)" }}>{children}</div>
    </div>
  );
}

function InfoRow({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-2 text-xs">
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="font-medium flex items-center gap-1">
        {good !== undefined && (good ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <XCircle className="w-3 h-3 text-red-500" />)}
        {value}
      </span>
    </div>
  );
}

function HeaderCheck({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center gap-2 px-5 py-3">
      {enabled ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> : <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
      <span className="text-xs font-mono">{label}</span>
    </div>
  );
}
