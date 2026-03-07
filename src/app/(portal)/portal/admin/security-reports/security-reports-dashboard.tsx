"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Shield, ShieldAlert, Search, Plus, Trash2, Mail, RefreshCw, Globe,
  AlertTriangle, CheckCircle2, Clock, ExternalLink, FileText,
} from "lucide-react";

interface Report {
  id: string;
  target: string;
  targetType: string;
  status: string;
  overallGrade?: string;
  riskScore?: number;
  totalFindings: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  executiveSummary?: string;
  createdAt: string;
  completedAt?: string;
}

const GRADE_COLORS: Record<string, string> = {
  A: "#22c55e", B: "#84cc16", C: "#f59e0b", D: "#f97316", F: "#ef4444",
};

function timeAgo(date: string): string {
  const ms = Date.now() - new Date(date).getTime();
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

const PAGE_SIZE = 10;

export function SecurityReportsDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [target, setTarget] = useState("");
  const [targetType, setTargetType] = useState<"website" | "email">("website");
  const [emailTo, setEmailTo] = useState("");
  const [emailingId, setEmailingId] = useState<string | null>(null);

  // Filters & pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "risk" | "findings">("date");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/security-reports");
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports);
      }
    } catch { }
    setLoading(false);
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // Poll for scanning reports
  useEffect(() => {
    const hasScanning = reports.some(r => r.status === "scanning");
    if (!hasScanning) return;
    const interval = setInterval(fetchReports, 5000);
    return () => clearInterval(interval);
  }, [reports, fetchReports]);

  const startScan = async () => {
    if (!target.trim()) return;
    setScanning(true);
    try {
      const res = await fetch("/api/admin/security-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: target.trim(), targetType }),
      });
      if (res.ok) {
        setTarget("");
        fetchReports();
      }
    } catch { }
    setScanning(false);
  };

  const deleteReport = async (id: string) => {
    if (!confirm("Delete this report?")) return;
    await fetch(`/api/admin/security-reports/${id}`, { method: "DELETE" });
    setReports(r => r.filter(rep => rep.id !== id));
  };

  const emailReport = async (id: string) => {
    if (!emailTo.trim()) return;
    setEmailingId(id);
    try {
      await fetch(`/api/admin/security-reports/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "email", email: emailTo.trim() }),
      });
      setEmailTo("");
      setEmailingId(null);
      alert("Report emailed successfully!");
    } catch {
      setEmailingId(null);
    }
  };

  const completed = reports.filter(r => r.status === "completed");
  const avgScore = completed.length > 0
    ? Math.round(completed.reduce((s, r) => s + (r.riskScore || 0), 0) / completed.length)
    : 0;
  const totalFindings = completed.reduce((s, r) => s + r.totalFindings, 0);
  const totalCritical = completed.reduce((s, r) => s + r.criticalCount, 0);

  // Filter, sort, paginate
  const filtered = reports.filter(r => {
    if (searchQuery && !r.target.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (gradeFilter !== "all" && r.overallGrade !== gradeFilter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === "risk") return (b.riskScore || 0) - (a.riskScore || 0);
    if (sortBy === "findings") return b.totalFindings - a.totalFindings;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">
      {/* ═══ HEADER ═══════════════════════════════════════════════════════ */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
        <div className="h-1" style={{ background: "linear-gradient(90deg, #ef4444, #f97316, #22c55e)" }} />
        <div className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #ef4444, #f97316)" }}>
                <ShieldAlert className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Security Reports</h1>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Scan websites and emails for vulnerabilities — generate professional reports
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={fetchReports} disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>

          {/* New Scan Form */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "var(--border)" }}>
              <button onClick={() => setTargetType("website")}
                className="px-3 py-2 text-xs font-medium transition-colors"
                style={{ background: targetType === "website" ? "var(--brand-primary)" : "var(--bg-secondary)", color: targetType === "website" ? "#fff" : "var(--text-secondary)" }}>
                <Globe className="w-3 h-3 inline mr-1" /> Website
              </button>
              <button onClick={() => setTargetType("email")}
                className="px-3 py-2 text-xs font-medium transition-colors"
                style={{ background: targetType === "email" ? "var(--brand-primary)" : "var(--bg-secondary)", color: targetType === "email" ? "#fff" : "var(--text-secondary)" }}>
                <Mail className="w-3 h-3 inline mr-1" /> Email
              </button>
            </div>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startScan()}
              placeholder={targetType === "website" ? "example.com" : "user@example.com"}
              className="flex-1 min-w-[200px] px-3 py-2 rounded-lg text-sm border"
              style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
            />
            <Button onClick={startScan} disabled={scanning || !target.trim()} size="sm">
              {scanning ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : <Search className="w-3.5 h-3.5 mr-1" />}
              Scan
            </Button>
          </div>
        </div>
      </div>

      {/* ═══ STATS ════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={FileText} label="Total Reports" value={reports.length.toString()} color="#3b82f6" />
        <StatCard icon={Shield} label="Avg Risk Score" value={`${avgScore}/100`} color={avgScore > 60 ? "#ef4444" : avgScore > 30 ? "#f59e0b" : "#22c55e"} />
        <StatCard icon={AlertTriangle} label="Total Findings" value={totalFindings.toString()} color="#f97316" />
        <StatCard icon={ShieldAlert} label="Critical Issues" value={totalCritical.toString()} color="#ef4444" />
      </div>

      {/* ═══ FILTERS ════════════════════════════════════════════════════ */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Search targets..."
            className="w-full pl-8 pr-3 py-2 rounded-lg text-sm border"
            style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
          />
        </div>
        <select value={gradeFilter} onChange={(e) => { setGradeFilter(e.target.value); setCurrentPage(1); }}
          className="px-3 py-2 rounded-lg text-xs border cursor-pointer"
          style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
          <option value="all">All Grades</option>
          {["A", "B", "C", "D", "F"].map(g => <option key={g} value={g}>Grade {g}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          className="px-3 py-2 rounded-lg text-xs border cursor-pointer"
          style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="scanning">Scanning</option>
          <option value="failed">Failed</option>
        </select>
        <select value={sortBy} onChange={(e) => { setSortBy(e.target.value as "date" | "risk" | "findings"); setCurrentPage(1); }}
          className="px-3 py-2 rounded-lg text-xs border cursor-pointer"
          style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
          <option value="date">Sort: Newest</option>
          <option value="risk">Sort: Risk Score</option>
          <option value="findings">Sort: Findings</option>
        </select>
        {(searchQuery || gradeFilter !== "all" || statusFilter !== "all") && (
          <button
            onClick={() => { setSearchQuery(""); setGradeFilter("all"); setStatusFilter("all"); setCurrentPage(1); }}
            className="px-2 py-2 rounded-lg text-xs font-medium hover:opacity-80"
            style={{ color: "var(--text-muted)" }}>
            Clear filters
          </button>
        )}
        <span className="text-[10px] ml-auto" style={{ color: "var(--text-muted)" }}>
          {filtered.length} of {reports.length} reports
        </span>
      </div>

      {/* ═══ REPORT LIST ══════════════════════════════════════════════════ */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
        <div className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider hidden md:grid grid-cols-[1fr_80px_60px_180px_120px_100px] gap-3"
          style={{ color: "var(--text-muted)", background: "var(--bg-secondary)" }}>
          <span>Target</span>
          <span>Grade</span>
          <span>Risk</span>
          <span>Findings</span>
          <span>Date</span>
          <span>Actions</span>
        </div>
        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {paged.length === 0 && (
            <div className="px-5 py-12 text-center">
              <Shield className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
              <p className="text-sm font-medium">{reports.length === 0 ? "No reports yet" : "No matching reports"}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                {reports.length === 0 ? "Enter a website or email above to start a security scan" : "Try adjusting your filters"}
              </p>
            </div>
          )}
          {paged.map((r) => (
            <div key={r.id} className="px-5 py-3 hover:bg-[var(--bg-secondary)] transition-colors">
              <div className="md:grid grid-cols-[1fr_80px_60px_180px_120px_100px] gap-3 items-center">
                {/* Target */}
                <div className="flex items-center gap-2 min-w-0 mb-2 md:mb-0">
                  {r.status === "scanning" ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-500 shrink-0" />
                  ) : r.status === "failed" ? (
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  ) : (
                    <Globe className="w-4 h-4 shrink-0" style={{ color: "var(--text-muted)" }} />
                  )}
                  <div className="min-w-0">
                    <Link href={`/portal/admin/security-reports/${r.id}`} className="text-sm font-medium hover:underline truncate block">
                      {r.target}
                    </Link>
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      {r.targetType} {r.status === "scanning" && "— scanning..."}
                    </span>
                  </div>
                </div>

                {/* Grade */}
                <div>
                  {r.overallGrade ? (
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-white text-sm"
                      style={{ background: GRADE_COLORS[r.overallGrade] || "#666" }}>
                      {r.overallGrade}
                    </span>
                  ) : (
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>
                  )}
                </div>

                {/* Risk */}
                <span className="text-xs font-semibold" style={{ color: (r.riskScore || 0) > 60 ? "#ef4444" : (r.riskScore || 0) > 30 ? "#f59e0b" : "#22c55e" }}>
                  {r.riskScore ?? "—"}
                </span>

                {/* Findings */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {r.criticalCount > 0 && <Badge className="text-[10px] bg-red-500/10 text-red-600 border-red-500/20">{r.criticalCount} critical</Badge>}
                  {r.highCount > 0 && <Badge className="text-[10px] bg-orange-500/10 text-orange-600 border-orange-500/20">{r.highCount} high</Badge>}
                  {r.mediumCount > 0 && <Badge className="text-[10px] bg-yellow-500/10 text-yellow-600 border-yellow-500/20">{r.mediumCount} med</Badge>}
                  {r.lowCount > 0 && <Badge className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20">{r.lowCount} low</Badge>}
                  {r.totalFindings === 0 && r.status === "completed" && (
                    <Badge className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">Clean</Badge>
                  )}
                </div>

                {/* Date */}
                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{timeAgo(r.createdAt)}</span>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {r.status === "completed" && (
                    <>
                      <Link href={`/portal/admin/security-reports/${r.id}`}>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                        onClick={() => {
                          const to = prompt("Send report to email:");
                          if (to) { setEmailTo(to); emailReport(r.id); }
                        }}>
                        <Mail className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                    onClick={() => deleteReport(r.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ═══ PAGINATION ═════════════════════════════════════════════════ */}
        {totalPages > 1 && (
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              Page {safePage} of {totalPages} ({filtered.length} results)
            </span>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" className="h-7 text-xs px-2"
                disabled={safePage <= 1} onClick={() => setCurrentPage(1)}>
                First
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs px-2"
                disabled={safePage <= 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>
                Prev
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
                const page = start + i;
                if (page > totalPages) return null;
                return (
                  <Button key={page} size="sm" variant={page === safePage ? "default" : "outline"}
                    className="h-7 w-7 text-xs p-0" onClick={() => setCurrentPage(page)}>
                    {page}
                  </Button>
                );
              })}
              <Button size="sm" variant="outline" className="h-7 text-xs px-2"
                disabled={safePage >= totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>
                Next
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs px-2"
                disabled={safePage >= totalPages} onClick={() => setCurrentPage(totalPages)}>
                Last
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl p-3.5" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${color}14` }}>
          <Icon className="w-3 h-3" style={{ color }} />
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</span>
      </div>
      <div className="text-lg font-bold" style={{ color }}>{value}</div>
    </div>
  );
}
