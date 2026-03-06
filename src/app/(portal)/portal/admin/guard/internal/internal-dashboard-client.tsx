"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  Activity,
  HardDrive,
  Cpu,
  Shield,
  ShieldCheck,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Globe,
  Lock,
  Server,
  Wifi,
  Package,
  Clock,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  FileWarning,
  Eye,
  Radio,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface MetricSnapshot {
  cpuPercent: number;
  memPercent: number;
  memUsed: number;
  memTotal: number;
  diskPercent: number;
  diskTotal: number;
  diskUsed: number;
  loadAvg: number[];
  uptime: number;
  processes: number;
  networkRx: number;
  networkTx: number;
  threatScore: number;
  threatLevel: string;
  grade: string;
  findingCount: number;
  timestamp: string;
}

interface AgentAlert {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  status: string;
  aiRecommendation?: string;
  createdAt: string;
}

interface ServiceStatus {
  id: string;
  serviceName: string;
  isActive: boolean;
  isEnabled: boolean;
}

interface ScanResult {
  serverType?: {
    roles: string[];
    primary: string;
    label: string;
    expectedPorts: number[];
    unexpectedServices: string[];
  };
  metrics: {
    cpuPercent: number;
    memPercent: number;
    memUsed: number;
    memTotal: number;
    diskPercent: number;
    diskTotal: number;
    diskUsed: number;
    loadAvg: number[];
    uptime: number;
    processes: number;
    networkRx: number;
    networkTx: number;
  };
  findings: { id: string; category: string; severity: string; title: string; description: string; remediation: string; value?: string }[];
  ports: { port: number; service: string; address: string; risk: string }[];
  services: { name: string; status: string; enabled: boolean }[];
  patches: { total: number; security: number; packages: string[] };
  fileIntegrity: { path: string; status: string; permissions: string; owner: string; issue?: string }[];
  connectionAudit?: {
    activeConnections: { protocol: string; localAddr: string; localPort: number; remoteAddr: string; remotePort: number; state: string; process: string; pid: string }[];
    sshSessions: { user: string; ip: string; loginTime: string; tty: string; keyFingerprint?: string }[];
    neighbors: { ip: string; mac: string; interface: string; state: string }[];
    adminKeyFingerprint: string;
    trustedSessionActive: boolean;
  };
  threatScore: number;
  threatLevel: string;
  grade: string;
}

interface AgentData {
  id: string;
  name: string;
  status: string;
  hostname?: string;
  ipAddress?: string;
  lastHeartbeat?: string;
  pendingUpdates: number;
  securityUpdates: number;
  alerts: AgentAlert[];
  serviceStatuses: ServiceStatus[];
}

interface DashboardData {
  agent: AgentData;
  metricSnapshots: MetricSnapshot[];
  latestScan: ScanResult | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(date: string | Date): string {
  const ms = Date.now() - new Date(date).getTime();
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  if (d > 0) return `${d}d ${h}h`;
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  CRITICAL: { color: "rgb(239, 68, 68)", bg: "rgba(239, 68, 68, 0.08)", border: "rgba(239, 68, 68, 0.2)" },
  HIGH: { color: "rgb(249, 115, 22)", bg: "rgba(249, 115, 22, 0.08)", border: "rgba(249, 115, 22, 0.2)" },
  MEDIUM: { color: "rgb(234, 179, 8)", bg: "rgba(234, 179, 8, 0.08)", border: "rgba(234, 179, 8, 0.2)" },
  LOW: { color: "rgb(59, 130, 246)", bg: "rgba(59, 130, 246, 0.08)", border: "rgba(59, 130, 246, 0.2)" },
};

function getGradeColor(grade: string) {
  if (grade === "A") return { text: "#22c55e", bg: "rgba(34,197,94,0.1)" };
  if (grade === "B") return { text: "#3b82f6", bg: "rgba(59,130,246,0.1)" };
  if (grade === "C") return { text: "#eab308", bg: "rgba(234,179,8,0.1)" };
  if (grade === "D") return { text: "#f97316", bg: "rgba(249,115,22,0.1)" };
  return { text: "#ef4444", bg: "rgba(239,68,68,0.1)" };
}

function getThreatColor(score: number) {
  if (score <= 20) return "#22c55e";
  if (score <= 40) return "#3b82f6";
  if (score <= 60) return "#eab308";
  if (score <= 80) return "#f97316";
  return "#ef4444";
}

// ─── Reusable metric ring SVG ───────────────────────────────────────────────

function MetricRing({ value, max = 100, size = 80, strokeWidth = 6, color, children }: {
  value: number; max?: number; size?: number; strokeWidth?: number; color: string; children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth - 1} className="opacity-[0.06]" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={`${progress * circumference} ${circumference}`}
          strokeLinecap="round" className="transition-all duration-700 ease-out" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function InternalDashboardClient({ initialData }: { initialData: DashboardData }) {
  const [data, setData] = useState(initialData);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [scanError, setScanError] = useState<string | null>(null);

  const { agent, metricSnapshots, latestScan } = data;
  const latest = metricSnapshots[0] ?? null;

  const refreshData = useCallback(async () => {
    try {
      const res = await fetch("/api/guard/internal");
      const json = await res.json();
      if (json.success) {
        setData({ agent: json.agent, metricSnapshots: json.metricSnapshots ?? [], latestScan: json.latestScan ?? null });
      }
    } catch (err) { console.error("Refresh failed:", err); }
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(refreshData, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshData]);

  const handleScan = async () => {
    setIsScanning(true);
    setScanProgress(0);
    setScanError(null);
    const progressInterval = setInterval(() => setScanProgress((p) => Math.min(p + Math.random() * 15, 90)), 500);
    try {
      const res = await fetch("/api/guard/internal/scan", { method: "POST" });
      clearInterval(progressInterval);
      setScanProgress(100);
      if (!res.ok) { const err = await res.json(); setScanError(err.error || "Scan failed"); }
      else { await refreshData(); }
    } catch (err) { clearInterval(progressInterval); setScanError(String(err)); }
    finally { setTimeout(() => { setIsScanning(false); setScanProgress(0); }, 1000); }
  };

  const threatScore = latest?.threatScore ?? 0;
  const threatLevel = latest?.threatLevel ?? "LOW";
  const grade = latest?.grade ?? "-";
  const gradeColor = getGradeColor(grade);
  const threatColor = getThreatColor(threatScore);

  const criticalCount = agent.alerts.filter(a => a.severity === "CRITICAL").length;
  const highCount = agent.alerts.filter(a => a.severity === "HIGH").length;
  const mediumCount = agent.alerts.filter(a => a.severity === "MEDIUM").length;
  const lowCount = agent.alerts.filter(a => a.severity === "LOW").length;
  const activeServices = agent.serviceStatuses.filter(s => s.isActive).length;

  return (
    <div className="space-y-5">

      {/* ═══ HERO STATUS BAR ═══════════════════════════════════════════════ */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
        {/* Top gradient accent line */}
        <div className="h-1" style={{ background: agent.status === "ONLINE" ? "linear-gradient(90deg, #22c55e, #3b82f6, #8b5cf6)" : "linear-gradient(90deg, #ef4444, #f97316)" }} />

        <div className="flex flex-col lg:flex-row">
          {/* Left: Agent identity */}
          <div className="flex-1 p-5 pb-4">
            <div className="flex items-start gap-4">
              {/* Shield icon with glow */}
              <div className="relative">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background: agent.status === "ONLINE"
                      ? "linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)"
                      : "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
                    boxShadow: agent.status === "ONLINE"
                      ? "0 8px 24px rgba(34,197,94,0.35), 0 2px 8px rgba(34,197,94,0.2)"
                      : "0 8px 24px rgba(239,68,68,0.35), 0 2px 8px rgba(239,68,68,0.2)",
                  }}
                >
                  <ShieldCheck className="w-8 h-8 text-white drop-shadow-sm" />
                </div>
                {agent.status === "ONLINE" && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-[2.5px] flex items-center justify-center" style={{ borderColor: "var(--bg-primary)" }}>
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl font-extrabold tracking-tight">{agent.name}</h2>
                  <Badge
                    className="gap-1.5 text-[10px] uppercase tracking-widest font-bold px-2.5 py-1"
                    style={{
                      background: agent.status === "ONLINE" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                      color: agent.status === "ONLINE" ? "#22c55e" : "#ef4444",
                      border: `1px solid ${agent.status === "ONLINE" ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
                    }}
                  >
                    <div className={`w-2 h-2 rounded-full ${agent.status === "ONLINE" ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                    {agent.status}
                  </Badge>
                  {grade !== "-" && (
                    <Badge
                      className="text-sm font-black px-3 py-0.5"
                      style={{ background: gradeColor.bg, color: gradeColor.text, border: `1px solid ${gradeColor.text}30` }}
                    >
                      {grade}
                    </Badge>
                  )}
                  {latestScan?.serverType && (
                    <Badge
                      className="text-[10px] uppercase tracking-widest font-bold px-2.5 py-1"
                      style={{ background: "rgba(99,102,241,0.12)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.25)" }}
                    >
                      <Server className="w-3 h-3 mr-1" />
                      {latestScan.serverType.label}
                    </Badge>
                  )}
                </div>

                {/* Info pills row */}
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {[
                    { icon: Globe, label: "IP", value: agent.ipAddress ?? "127.0.0.1", color: "#3b82f6" },
                    { icon: Server, label: "Host", value: agent.hostname ?? "localhost", color: "#8b5cf6" },
                    { icon: Clock, label: "Uptime", value: formatUptime(latest?.uptime ?? 0), color: "#10b981" },
                    { icon: Cpu, label: "CPU", value: `${(latest?.cpuPercent ?? 0).toFixed(1)}%`, color: "#f59e0b" },
                    { icon: Activity, label: "RAM", value: `${latest?.memPercent ?? 0}%`, color: "#ec4899" },
                    { icon: Eye, label: "Scanned", value: agent.lastHeartbeat ? timeAgo(agent.lastHeartbeat) : "never", color: "#6366f1" },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px]"
                      style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
                    >
                      <item.icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                      <span style={{ color: "var(--text-muted)" }}>{item.label}</span>
                      <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Quick stats panel */}
          <div
            className="lg:w-[280px] border-t lg:border-t-0 lg:border-l grid grid-cols-2 gap-0"
            style={{ borderColor: "var(--border)" }}
          >
            {[
              { icon: AlertTriangle, label: "Open Findings", value: agent.alerts.length, color: agent.alerts.length > 0 ? "#ef4444" : "#22c55e", bg: agent.alerts.length > 0 ? "rgba(239,68,68,0.06)" : "rgba(34,197,94,0.06)" },
              { icon: Shield, label: "Services Up", value: `${activeServices}/${agent.serviceStatuses.length}`, color: "#3b82f6", bg: "rgba(59,130,246,0.06)" },
              { icon: Wifi, label: "Open Ports", value: latestScan?.ports?.length ?? 0, color: "#8b5cf6", bg: "rgba(139,92,246,0.06)" },
              { icon: Package, label: agent.securityUpdates > 0 ? "Sec Patches" : "Updates", value: agent.securityUpdates > 0 ? agent.securityUpdates : agent.pendingUpdates, color: agent.securityUpdates > 0 ? "#ef4444" : "#f59e0b", bg: agent.securityUpdates > 0 ? "rgba(239,68,68,0.06)" : "rgba(245,158,11,0.06)" },
            ].map((stat, i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-center py-4 px-3 text-center relative"
                style={{
                  background: stat.bg,
                  borderBottom: i < 2 ? "1px solid var(--border)" : undefined,
                  borderRight: i % 2 === 0 ? "1px solid var(--border)" : undefined,
                }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: `${stat.color}18` }}>
                  <stat.icon className="w-4.5 h-4.5" style={{ color: stat.color }} />
                </div>
                <div className="text-xl font-black leading-none" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-[10px] mt-1 font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scan control bar */}
        <div className="px-5 py-3 flex items-center gap-3 border-t" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
          <Button onClick={handleScan} disabled={isScanning} size="sm" className="gap-2 h-8 font-semibold">
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin" : ""}`} />
            {isScanning ? "Scanning..." : "Run Full Scan"}
          </Button>
          <Button variant="ghost" onClick={() => setAutoRefresh(!autoRefresh)} size="sm" className="h-8 gap-1.5 text-xs">
            <div className={`w-2 h-2 rounded-full ${autoRefresh ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
            Auto-refresh {autoRefresh ? "ON" : "OFF"}
          </Button>
          {agent.lastHeartbeat && !isScanning && (
            <span className="text-[11px] ml-auto flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
              <Clock className="w-3 h-3" />
              Last scan {timeAgo(agent.lastHeartbeat)}
            </span>
          )}
          {isScanning && (
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${scanProgress}%`, background: "linear-gradient(90deg, var(--brand-primary), #8b5cf6)" }}
                />
              </div>
              <span className="text-[11px] font-mono font-bold" style={{ color: "var(--text-muted)" }}>{scanProgress.toFixed(0)}%</span>
            </div>
          )}
          {scanError && (
            <span className="text-xs text-red-500 flex items-center gap-1 font-medium">
              <XCircle className="w-3.5 h-3.5" /> {scanError}
            </span>
          )}
        </div>
      </div>

      {/* ═══ METRIC CARDS ROW ══════════════════════════════════════════════ */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">

        {/* Threat Score */}
        <div className="rounded-xl p-4 flex flex-col items-center justify-center col-span-1" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
          <MetricRing value={threatScore} size={100} strokeWidth={7} color={threatColor}>
            <span className="text-2xl font-black" style={{ color: threatColor }}>{threatScore}</span>
            <span className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: "var(--text-muted)" }}>{threatLevel}</span>
          </MetricRing>
          <div className="mt-2 text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>Threat Score</div>
        </div>

        {/* CPU */}
        <MetricCard
          icon={Cpu} label="CPU" value={latest?.cpuPercent ?? 0} unit="%"
          color="#3b82f6" subtitle={`Load ${latest?.loadAvg?.[0]?.toFixed(2) ?? "0.00"}`}
          trend={metricSnapshots.length > 1 ? (latest?.cpuPercent ?? 0) - (metricSnapshots[1]?.cpuPercent ?? 0) : undefined}
        />

        {/* Memory */}
        <MetricCard
          icon={Activity} label="Memory" value={latest?.memPercent ?? 0} unit="%"
          color="#8b5cf6"
          subtitle={`${formatBytes(latest?.memUsed ?? 0)} / ${formatBytes(latest?.memTotal ?? 0)}`}
          trend={metricSnapshots.length > 1 ? (latest?.memPercent ?? 0) - (metricSnapshots[1]?.memPercent ?? 0) : undefined}
        />

        {/* Disk */}
        <MetricCard
          icon={HardDrive} label="Disk" value={latest?.diskPercent ?? 0} unit="%"
          color="#f59e0b"
          subtitle={`${formatBytes((latest?.diskTotal ?? 0) - (latest?.diskUsed ?? 0))} free`}
        />

        {/* Network */}
        <div className="rounded-xl p-4" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(16,185,129,0.1)" }}>
              <Zap className="w-3.5 h-3.5" style={{ color: "#10b981" }} />
            </div>
            <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Network</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                <ArrowDownRight className="w-3 h-3 text-green-500" /> In
              </span>
              <span className="text-sm font-bold">{formatBytes(latest?.networkRx ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                <ArrowUpRight className="w-3 h-3 text-blue-500" /> Out
              </span>
              <span className="text-sm font-bold">{formatBytes(latest?.networkTx ?? 0)}</span>
            </div>
            <div className="pt-1 border-t" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between">
                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>Processes</span>
                <span className="text-sm font-bold">{latest?.processes ?? 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ FINDINGS + PORTS (2-col) ══════════════════════════════════════ */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Security Findings — takes 2 cols */}
        <div className="lg:col-span-2 rounded-xl overflow-hidden" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
          <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}>
                <FileWarning className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Security Findings</h3>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  {agent.alerts.length} open
                  {criticalCount > 0 && <span className="text-red-500 font-medium"> &middot; {criticalCount} critical</span>}
                  {highCount > 0 && <span className="text-orange-500 font-medium"> &middot; {highCount} high</span>}
                </p>
              </div>
            </div>
            {/* Severity pills */}
            <div className="hidden sm:flex gap-1.5">
              {[
                { label: "C", count: criticalCount, color: "#ef4444" },
                { label: "H", count: highCount, color: "#f97316" },
                { label: "M", count: mediumCount, color: "#eab308" },
                { label: "L", count: lowCount, color: "#3b82f6" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold"
                  style={{
                    background: s.count > 0 ? `${s.color}15` : "var(--bg-secondary)",
                    color: s.count > 0 ? s.color : "var(--text-muted)",
                    border: s.count > 0 ? `1px solid ${s.color}30` : "1px solid var(--border)",
                  }}
                >
                  {s.count}
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 max-h-[400px] overflow-y-auto space-y-2">
            {agent.alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(34,197,94,0.1)" }}>
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                </div>
                <p className="text-sm font-medium text-green-600">All Clear</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>No active threats detected</p>
              </div>
            ) : (
              agent.alerts.slice(0, 20).map((alert) => {
                const sev = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.LOW;
                return (
                  <div
                    key={alert.id}
                    className="flex items-start gap-3 p-3 rounded-lg transition-colors hover:brightness-95"
                    style={{ background: sev.bg, borderLeft: `3px solid ${sev.color}` }}
                  >
                    {alert.severity === "CRITICAL" ? (
                      <XCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: sev.color }} />
                    ) : alert.severity === "HIGH" ? (
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: sev.color }} />
                    ) : (
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: sev.color }} />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{alert.title}</span>
                        <span
                          className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded shrink-0"
                          style={{ background: `${sev.color}20`, color: sev.color }}
                        >
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--text-secondary)" }}>{alert.description}</p>
                      {alert.aiRecommendation && (
                        <details className="mt-1.5">
                          <summary className="text-[11px] cursor-pointer font-medium" style={{ color: "var(--brand-primary)" }}>
                            View fix recommendation
                          </summary>
                          <pre className="mt-1.5 p-2.5 rounded-md text-[11px] overflow-auto whitespace-pre-wrap leading-relaxed"
                            style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}>
                            {alert.aiRecommendation}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            {agent.alerts.length > 20 && (
              <p className="text-xs text-center py-2" style={{ color: "var(--text-muted)" }}>
                +{agent.alerts.length - 20} more findings
              </p>
            )}
          </div>
        </div>

        {/* Ports + Services column */}
        <div className="space-y-4">
          {/* Open Ports */}
          <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
            <div className="px-4 py-3 flex items-center gap-2 border-b" style={{ borderColor: "var(--border)" }}>
              <Globe className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
              <span className="text-sm font-semibold">Open Ports</span>
              <Badge variant="secondary" className="ml-auto text-[10px]">{latestScan?.ports?.length ?? 0}</Badge>
            </div>
            <div className="p-3 space-y-1.5 max-h-[200px] overflow-y-auto">
              {!latestScan?.ports?.length ? (
                <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>No scan data</p>
              ) : (
                latestScan.ports.map((p, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-[var(--bg-secondary)] transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold" style={{ color: "var(--text-primary)" }}>{p.port}</span>
                      <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{p.service}</span>
                    </div>
                    <span
                      className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded"
                      style={{
                        background: p.risk === "critical" || p.risk === "high" ? "rgba(239,68,68,0.1)" : "var(--bg-secondary)",
                        color: p.risk === "critical" ? "#ef4444" : p.risk === "high" ? "#f97316" : "var(--text-muted)",
                      }}
                    >
                      {p.risk}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Services */}
          <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
            <div className="px-4 py-3 flex items-center gap-2 border-b" style={{ borderColor: "var(--border)" }}>
              <Shield className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
              <span className="text-sm font-semibold">Services</span>
              <Badge variant="secondary" className="ml-auto text-[10px]">
                {activeServices}/{agent.serviceStatuses.length}
              </Badge>
            </div>
            <div className="p-3 space-y-1 max-h-[200px] overflow-y-auto">
              {agent.serviceStatuses.length === 0 ? (
                <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>No services tracked</p>
              ) : (
                agent.serviceStatuses.map((svc) => (
                  <div key={svc.id} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-[var(--bg-secondary)] transition-colors">
                    <span className="text-[13px] font-medium">{svc.serviceName}</span>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${svc.isActive ? "bg-green-500" : "bg-red-500"}`} />
                      <span className="text-[11px]" style={{ color: svc.isActive ? "#22c55e" : "#ef4444" }}>
                        {svc.isActive ? "Active" : "Down"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ FILE INTEGRITY ════════════════════════════════════════════════ */}
      {latestScan?.fileIntegrity && latestScan.fileIntegrity.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
          <div className="px-5 py-4 flex items-center gap-2.5 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(139,92,246,0.1)" }}>
              <Lock className="w-4 h-4 text-purple-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">File Integrity</h3>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Critical system file permissions</p>
            </div>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {latestScan.fileIntegrity.map((fi, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-2.5">
                {fi.status === "ok" ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                ) : fi.status === "danger" ? (
                  <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
                )}
                <span className="font-mono text-xs flex-1 truncate">{fi.path}</span>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded" style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}>
                  {fi.permissions}
                </span>
                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{fi.owner}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ CONNECTION AUDIT ════════════════════════════════════════════ */}
      {latestScan?.connectionAudit && (
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
          <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(6,182,212,0.1)" }}>
                <Wifi className="w-4 h-4 text-cyan-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Connection Audit</h3>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  {latestScan.connectionAudit.activeConnections.length} connections &middot;{" "}
                  {latestScan.connectionAudit.sshSessions.length} SSH sessions &middot;{" "}
                  {latestScan.connectionAudit.neighbors.length} network neighbors
                </p>
              </div>
            </div>
            {latestScan.connectionAudit.trustedSessionActive && (
              <Badge className="text-[10px] px-2 py-0.5 bg-green-500/10 text-green-600 border-green-500/20">
                <ShieldCheck className="w-3 h-3 mr-1" /> Admin Verified
              </Badge>
            )}
          </div>

          {/* SSH Sessions */}
          {latestScan.connectionAudit.sshSessions.length > 0 && (
            <div className="border-b" style={{ borderColor: "var(--border)" }}>
              <div className="px-5 py-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)", background: "var(--bg-secondary)" }}>
                Active SSH Sessions
              </div>
              {latestScan.connectionAudit.sshSessions.map((s, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-2.5 border-t" style={{ borderColor: "var(--border)" }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{
                    background: s.keyFingerprint ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)"
                  }}>
                    {s.keyFingerprint ? (
                      <ShieldCheck className="w-3 h-3 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-3 h-3 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{s.user}@{s.ip}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}>
                        {s.tty}
                      </span>
                    </div>
                    {s.keyFingerprint && (
                      <span className="text-[10px] font-mono truncate block" style={{ color: "var(--text-muted)" }}>
                        Key: {s.keyFingerprint}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] shrink-0" style={{ color: "var(--text-muted)" }}>{s.loginTime}</span>
                </div>
              ))}
            </div>
          )}

          {/* Active Connections (external only) */}
          {(() => {
            const external = latestScan.connectionAudit!.activeConnections.filter(
              c => c.remoteAddr !== "127.0.0.1" && c.remoteAddr !== "::1"
            );
            if (external.length === 0) return null;
            return (
              <div className="border-b" style={{ borderColor: "var(--border)" }}>
                <div className="px-5 py-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)", background: "var(--bg-secondary)" }}>
                  External Connections ({external.length})
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {external.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-1.5 border-t text-[11px]" style={{ borderColor: "var(--border)" }}>
                      <span className="font-mono w-36 shrink-0">{c.remoteAddr}</span>
                      <span className="px-1.5 py-0.5 rounded" style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}>
                        :{c.localPort}
                      </span>
                      <span className="flex-1 truncate" style={{ color: "var(--text-muted)" }}>{c.process}</span>
                      <span className="font-mono" style={{ color: "var(--text-muted)" }}>pid:{c.pid}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Network Neighbors (ARP/MAC) */}
          {latestScan.connectionAudit.neighbors.length > 0 && (
            <div>
              <div className="px-5 py-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)", background: "var(--bg-secondary)" }}>
                Network Neighbors (ARP/MAC)
              </div>
              <div className="max-h-36 overflow-y-auto">
                {latestScan.connectionAudit.neighbors.map((n, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-1.5 border-t text-[11px]" style={{ borderColor: "var(--border)" }}>
                    <span className="font-mono w-36 shrink-0">{n.ip}</span>
                    <span className="font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(6,182,212,0.08)", color: "#06b6d4" }}>
                      {n.mac}
                    </span>
                    <span style={{ color: "var(--text-muted)" }}>{n.interface}</span>
                    <span className="ml-auto" style={{ color: "var(--text-muted)" }}>{n.state}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin Key Fingerprint */}
          <div className="px-5 py-3 border-t flex items-center gap-2" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
            <Lock className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              Admin Key: <span className="font-mono">{latestScan.connectionAudit.adminKeyFingerprint.split(" ").slice(0, 2).join(" ")}</span>
            </span>
          </div>
        </div>
      )}

      {/* ═══ PERFORMANCE HISTORY ═══════════════════════════════════════════ */}
      {metricSnapshots.length > 1 && (
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
          <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(59,130,246,0.1)" }}>
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Performance Trend</h3>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Last {metricSnapshots.length} scans</p>
              </div>
            </div>
          </div>
          <div className="p-5 grid gap-6 md:grid-cols-3">
            <TrendChart label="CPU" data={metricSnapshots} getVal={(m) => m.cpuPercent} color="#3b82f6" unit="%" />
            <TrendChart label="Memory" data={metricSnapshots} getVal={(m) => m.memPercent} color="#8b5cf6" unit="%" />
            <TrendChart label="Disk" data={metricSnapshots} getVal={(m) => m.diskPercent} color="#f59e0b" unit="%" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────

function MetricCard({ icon: Icon, label, value, unit, color, subtitle, trend }: {
  icon: React.ElementType; label: string; value: number; unit: string; color: string; subtitle: string;
  trend?: number;
}) {
  const percentage = Math.min(value, 100);
  return (
    <div className="rounded-xl p-4" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}14` }}>
            <Icon className="w-3.5 h-3.5" style={{ color }} />
          </div>
          <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{label}</span>
        </div>
        {trend !== undefined && trend !== 0 && (
          <div className="flex items-center gap-0.5 text-[10px] font-medium" style={{ color: trend > 0 ? "#ef4444" : "#22c55e" }}>
            {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-black tracking-tight">
        {value.toFixed(1)}<span className="text-sm font-medium ml-0.5" style={{ color: "var(--text-muted)" }}>{unit}</span>
      </div>
      {/* Progress bar */}
      <div className="mt-2.5 h-1.5 rounded-full overflow-hidden" style={{ background: `${color}12` }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%`, background: color }} />
      </div>
      <p className="text-[11px] mt-1.5" style={{ color: "var(--text-muted)" }}>{subtitle}</p>
    </div>
  );
}

// ─── Trend Chart ──────────────────────────────────────────────────────────

function TrendChart({ label, data, getVal, color, unit }: {
  label: string; data: MetricSnapshot[]; getVal: (m: MetricSnapshot) => number; color: string; unit: string;
}) {
  const reversed = data.slice().reverse();
  const values = reversed.map(getVal);
  const max = Math.max(...values, 1);
  const current = values[values.length - 1] ?? 0;
  const prev = values[values.length - 2];
  const diff = prev !== undefined ? current - prev : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold">{current.toFixed(1)}{unit}</span>
          {diff !== 0 && (
            <span className="text-[10px] font-medium" style={{ color: diff > 0 ? "#ef4444" : "#22c55e" }}>
              {diff > 0 ? "+" : ""}{diff.toFixed(1)}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-end gap-[3px] h-16">
        {reversed.map((m, i) => {
          const val = getVal(m);
          const heightPct = (val / max) * 100;
          return (
            <div
              key={i}
              className="flex-1 rounded-sm transition-all duration-300 cursor-default group relative"
              style={{
                height: `${Math.max(heightPct, 3)}%`,
                background: i === reversed.length - 1 ? color : `${color}50`,
                minHeight: "2px",
              }}
              title={`${val.toFixed(1)}${unit} — ${new Date(m.timestamp).toLocaleString()}`}
            />
          );
        })}
      </div>
    </div>
  );
}
