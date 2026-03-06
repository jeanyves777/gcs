"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Server, Activity, AlertTriangle, Terminal, Wifi,
  Printer, Phone, Monitor, HelpCircle, Camera, Cpu, Send,
  Package, Settings, Globe, FileText, RefreshCw, Shield,
  Trash2, Plus, CheckSquare, ShieldCheck, Clock, XCircle,
  AlertCircle, ChevronRight, CheckCircle2, Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Metric { type: string; value: number; timestamp: string }
interface Alert { id: string; type: string; severity: string; title: string; status: string; createdAt: string }
interface Device {
  id: string; macAddress: string; ipAddress: string | null; hostname: string | null;
  vendor: string | null; deviceType: string; isAuthorized: boolean; isOnline: boolean;
  firstSeen: string; lastSeen: string;
}
interface Command {
  id: string; type: string; payload: string; status: string; result: string | null;
  createdAt: string; completedAt: string | null; createdBy: { name: string | null };
}
interface PackageInfo {
  id: string; name: string; version: string; newVersion: string | null;
  source: string; isSecurityUpdate: boolean; status: string;
}
interface PatchHistoryItem {
  id: string; packageName: string; fromVersion: string; toVersion: string;
  status: string; createdAt: string; approvedBy: { name: string | null } | null;
}
interface ServiceInfo {
  id: string; serviceName: string; isActive: boolean; isEnabled: boolean;
  subState: string | null; memoryUsage: number | null;
}
interface UrlMonitorInfo {
  id: string; url: string; name: string; isDown: boolean;
  lastStatus: number | null; lastResponseMs: number | null;
  lastChecked: string | null; downSince: string | null;
}
interface ConfigDeploymentInfo {
  id: string; filePath: string; status: string; createdAt: string;
  deployedBy: { name: string | null };
}
interface ConfigTemplate {
  id: string; name: string; filePath: string;
}

interface Agent {
  id: string; name: string; hostname: string | null; ipAddress: string | null;
  os: string | null; kernelVersion: string | null; status: string;
  lastHeartbeat: string | null; apiKeyPrefix: string;
  distro: string | null; distroVersion: string | null; packageManager: string | null;
  pendingUpdates: number; securityUpdates: number;
  organization: { id: string; name: string };
  alerts: Alert[]; devices: Device[]; commands: Command[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function isOnline(lastHeartbeat: string | null) {
  if (!lastHeartbeat) return false;
  return Date.now() - new Date(lastHeartbeat).getTime() < 90_000;
}

function formatBytes(bytes: number | null) {
  if (bytes === null || bytes === undefined) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  CRITICAL: { color: "rgb(239, 68, 68)", bg: "rgba(239, 68, 68, 0.08)", border: "rgba(239, 68, 68, 0.2)" },
  HIGH: { color: "rgb(249, 115, 22)", bg: "rgba(249, 115, 22, 0.08)", border: "rgba(249, 115, 22, 0.2)" },
  MEDIUM: { color: "rgb(234, 179, 8)", bg: "rgba(234, 179, 8, 0.08)", border: "rgba(234, 179, 8, 0.2)" },
  LOW: { color: "rgb(59, 130, 246)", bg: "rgba(59, 130, 246, 0.08)", border: "rgba(59, 130, 246, 0.2)" },
};

const deviceIcons: Record<string, React.ElementType> = {
  PRINTER: Printer, IP_PHONE: Phone, WORKSTATION: Monitor,
  SERVER: Server, CAMERA: Camera, IOT: Cpu, WIFI_AP: Wifi,
  UNKNOWN: HelpCircle,
};

const tabs = ["Overview", "Alerts", "Devices", "Commands", "Packages", "Services", "URLs", "Config", "Logs"] as const;

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

interface AgentDetailProps {
  agent: Agent;
  metrics: Metric[];
  packages: PackageInfo[];
  patchHistory: PatchHistoryItem[];
  services: ServiceInfo[];
  urlMonitors: UrlMonitorInfo[];
  configDeployments: ConfigDeploymentInfo[];
}

export function AgentDetailClient({
  agent, metrics, packages: initialPackages, patchHistory: initialPatchHistory,
  services: initialServices, urlMonitors: initialUrlMonitors,
  configDeployments: initialConfigDeployments,
}: AgentDetailProps) {
  const [activeTab, setActiveTab] = useState<string>("Overview");
  const [cmdType, setCmdType] = useState("BLOCK_IP");
  const [cmdPayload, setCmdPayload] = useState("");
  const [sending, setSending] = useState(false);
  const online = isOnline(agent.lastHeartbeat);

  const [packages, setPackages] = useState(initialPackages);
  const [patchHistory, setPatchHistory] = useState(initialPatchHistory);
  const [securityOnly, setSecurityOnly] = useState(false);
  const [selectedPkgs, setSelectedPkgs] = useState<Set<string>>(new Set());
  const [refreshingPkgs, setRefreshingPkgs] = useState(false);

  const [services, setServices] = useState(initialServices);
  const [refreshingSvc, setRefreshingSvc] = useState(false);

  const [urlMonitors, setUrlMonitors] = useState(initialUrlMonitors);
  const [newMonitorUrl, setNewMonitorUrl] = useState("");
  const [newMonitorName, setNewMonitorName] = useState("");
  const [newMonitorExpected, setNewMonitorExpected] = useState(200);
  const [newMonitorInterval, setNewMonitorInterval] = useState(60);
  const [addingMonitor, setAddingMonitor] = useState(false);

  const [configDeployments, setConfigDeployments] = useState(initialConfigDeployments);
  const [configFilePath, setConfigFilePath] = useState("");
  const [fetchingConfig, setFetchingConfig] = useState(false);
  const [fetchedConfig, setFetchedConfig] = useState<string | null>(null);
  const [templates, setTemplates] = useState<ConfigTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [deployingConfig, setDeployingConfig] = useState(false);

  const [logSource, setLogSource] = useState("nginx");
  const [logCustomPath, setLogCustomPath] = useState("");
  const [logLines, setLogLines] = useState(100);
  const [logFilter, setLogFilter] = useState("");
  const [logContent, setLogContent] = useState("");
  const [fetchingLogs, setFetchingLogs] = useState(false);

  // Build chart data
  const chartData: Record<string, Record<string, number>> = {};
  for (const m of metrics) {
    const key = new Date(m.timestamp).toISOString().slice(0, 16);
    if (!chartData[key]) chartData[key] = { time: new Date(m.timestamp).getTime() };
    chartData[key][m.type] = m.value;
  }
  const chartArray = Object.values(chartData).sort((a, b) => (a.time as number) - (b.time as number));

  // Latest metric values
  const latestCpu = chartArray.length > 0 ? (chartArray[chartArray.length - 1].CPU ?? 0) : 0;
  const latestMem = chartArray.length > 0 ? (chartArray[chartArray.length - 1].MEMORY ?? 0) : 0;
  const latestDisk = chartArray.length > 0 ? (chartArray[chartArray.length - 1].DISK ?? 0) : 0;
  const latestLoad = chartArray.length > 0 ? (chartArray[chartArray.length - 1].LOAD ?? 0) : 0;

  // Stats
  const openAlerts = agent.alerts.filter(a => a.status === "OPEN").length;
  const criticalCount = agent.alerts.filter(a => a.severity === "CRITICAL").length;
  const highCount = agent.alerts.filter(a => a.severity === "HIGH").length;
  const mediumCount = agent.alerts.filter(a => a.severity === "MEDIUM").length;
  const lowCount = agent.alerts.filter(a => a.severity === "LOW").length;
  const activeServices = services.filter(s => s.isActive).length;
  const downUrls = urlMonitors.filter(m => m.isDown).length;
  const updatablePackages = packages.filter(p => p.status === "UPDATE_AVAILABLE");
  const filteredPackages = securityOnly ? updatablePackages.filter(p => p.isSecurityUpdate) : updatablePackages;

  // Actions
  async function sendCommand() {
    setSending(true);
    try {
      let payload;
      try { payload = JSON.parse(cmdPayload || "{}"); } catch { payload = { value: cmdPayload }; }
      const res = await fetch(`/api/guard/admin/agents/${agent.id}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: cmdType, payload }),
      });
      if (res.ok) { toast.success("Command queued"); setCmdPayload(""); }
      else toast.error("Failed to send command");
    } finally { setSending(false); }
  }

  async function refreshPackages() {
    setRefreshingPkgs(true);
    try {
      const res = await fetch(`/api/guard/admin/agents/${agent.id}/packages`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh" }),
      });
      if (res.ok) toast.success("Package inventory refresh queued");
      else toast.error("Failed to queue refresh");
    } finally { setRefreshingPkgs(false); }
  }

  async function upgradePackages(type: "selected" | "security" | "full") {
    const body: Record<string, unknown> = { action: "upgrade", type };
    if (type === "selected") body.packageIds = Array.from(selectedPkgs);
    const res = await fetch(`/api/guard/admin/agents/${agent.id}/packages`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) { toast.success(`${type} upgrade queued`); setSelectedPkgs(new Set()); }
    else toast.error("Failed to queue upgrade");
  }

  async function refreshServices() {
    setRefreshingSvc(true);
    try {
      const res = await fetch(`/api/guard/admin/agents/${agent.id}/services`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh" }),
      });
      if (res.ok) toast.success("Service refresh queued");
      else toast.error("Failed to queue refresh");
    } finally { setRefreshingSvc(false); }
  }

  async function restartService(serviceName: string) {
    const res = await fetch(`/api/guard/admin/agents/${agent.id}/command`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "RESTART_SERVICE", payload: { service: serviceName } }),
    });
    if (res.ok) toast.success(`Restart queued for ${serviceName}`);
    else toast.error("Failed to queue restart");
  }

  async function addMonitor() {
    if (!newMonitorUrl.trim() || !newMonitorName.trim()) { toast.error("URL and name required"); return; }
    setAddingMonitor(true);
    try {
      const res = await fetch(`/api/guard/admin/agents/${agent.id}/urls`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newMonitorUrl.trim(), name: newMonitorName.trim(), expectedStatus: newMonitorExpected, intervalSec: newMonitorInterval }),
      });
      if (res.ok) {
        const monitor = await res.json();
        setUrlMonitors(prev => [monitor, ...prev]);
        setNewMonitorUrl(""); setNewMonitorName(""); setNewMonitorExpected(200); setNewMonitorInterval(60);
        toast.success("Monitor added");
      } else toast.error("Failed to add monitor");
    } finally { setAddingMonitor(false); }
  }

  async function deleteMonitor(id: string) {
    const res = await fetch(`/api/guard/admin/agents/${agent.id}/urls/${id}`, { method: "DELETE" });
    if (res.ok) { setUrlMonitors(prev => prev.filter(m => m.id !== id)); toast.success("Monitor deleted"); }
    else toast.error("Failed to delete monitor");
  }

  async function fetchConfig() {
    if (!configFilePath.trim()) { toast.error("Enter a file path"); return; }
    setFetchingConfig(true); setFetchedConfig(null);
    try {
      const res = await fetch(`/api/guard/admin/agents/${agent.id}/config?filePath=${encodeURIComponent(configFilePath)}`);
      if (res.ok) { const data = await res.json(); setFetchedConfig(data.content || ""); toast.success("Config fetched"); }
      else toast.error("Failed to fetch config");
    } finally { setFetchingConfig(false); }
  }

  async function loadTemplates() {
    if (templatesLoaded) return;
    try {
      const res = await fetch("/api/guard/admin/config-templates");
      if (res.ok) { setTemplates(await res.json()); setTemplatesLoaded(true); }
    } catch { /* ignore */ }
  }

  async function deployTemplate() {
    if (!selectedTemplate) { toast.error("Select a template"); return; }
    setDeployingConfig(true);
    try {
      const res = await fetch(`/api/guard/admin/agents/${agent.id}/config`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: selectedTemplate }),
      });
      if (res.ok) { const dep = await res.json(); setConfigDeployments(prev => [dep, ...prev]); toast.success("Config deployment queued"); }
      else toast.error("Failed to deploy config");
    } finally { setDeployingConfig(false); }
  }

  async function rollbackConfig(deploymentId: string) {
    const res = await fetch(`/api/guard/admin/agents/${agent.id}/config/${deploymentId}/rollback`, { method: "POST" });
    if (res.ok) { toast.success("Rollback queued"); setConfigDeployments(prev => prev.map(d => d.id === deploymentId ? { ...d, status: "ROLLED_BACK" } : d)); }
    else toast.error("Failed to rollback");
  }

  async function fetchLogs() {
    setFetchingLogs(true); setLogContent("");
    try {
      const source = logSource === "custom" ? logCustomPath : logSource;
      const res = await fetch(`/api/guard/admin/agents/${agent.id}/command`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "FETCH_LOGS", payload: { source, lines: logLines, filter: logFilter || undefined } }),
      });
      if (res.ok) {
        const cmd = await res.json();
        toast.success("Log fetch queued — polling...");
        let attempts = 0;
        const poll = setInterval(async () => {
          attempts++;
          if (attempts > 30) { clearInterval(poll); setFetchingLogs(false); toast.error("Timed out"); return; }
          try {
            const statusRes = await fetch(`/api/guard/admin/agents/${agent.id}/command/${cmd.id}`);
            if (statusRes.ok) {
              const data = await statusRes.json();
              if (data.status === "COMPLETED" && data.result) {
                clearInterval(poll);
                try { const parsed = JSON.parse(data.result); setLogContent(parsed.logs ? atob(parsed.logs) : data.result); }
                catch { setLogContent(data.result); }
                setFetchingLogs(false);
              } else if (data.status === "FAILED") {
                clearInterval(poll); setLogContent(data.result || "Command failed"); setFetchingLogs(false);
              }
            }
          } catch { /* continue */ }
        }, 2000);
      } else toast.error("Failed to queue log fetch");
    } catch { setFetchingLogs(false); toast.error("Error fetching logs"); }
  }

  const statusColor = online ? "#22c55e" : agent.status === "PENDING" ? "#f59e0b" : "#ef4444";
  const statusGrad = online
    ? "linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)"
    : agent.status === "PENDING"
      ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
      : "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)";
  const statusLabel = online ? "ONLINE" : agent.status;

  return (
    <div className="space-y-5">

      {/* ═══ HERO STATUS BAR ═══════════════════════════════════════════════ */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
        {/* Top gradient accent line */}
        <div className="h-1" style={{ background: online ? "linear-gradient(90deg, #22c55e, #3b82f6, #8b5cf6)" : agent.status === "PENDING" ? "linear-gradient(90deg, #f59e0b, #eab308)" : "linear-gradient(90deg, #ef4444, #f97316)" }} />

        <div className="flex flex-col lg:flex-row">
          {/* Left: Agent identity */}
          <div className="flex-1 p-5 pb-4">
            <div className="flex items-start gap-4">
              {/* Back button */}
              <Link href="/portal/admin/guard/agents" className="mt-1">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>

              {/* Shield icon with glow */}
              <div className="relative">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background: statusGrad,
                    boxShadow: `0 8px 24px ${statusColor}59, 0 2px 8px ${statusColor}33`,
                  }}
                >
                  <ShieldCheck className="w-8 h-8 text-white drop-shadow-sm" />
                </div>
                {online && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-[2.5px] flex items-center justify-center" style={{ borderColor: "var(--bg-primary)" }}>
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>{agent.name}</h2>
                  <Badge
                    className="gap-1.5 text-[10px] uppercase tracking-widest font-bold px-2.5 py-1"
                    style={{
                      background: `${statusColor}1F`,
                      color: statusColor,
                      border: `1px solid ${statusColor}40`,
                    }}
                  >
                    <div className={`w-2 h-2 rounded-full ${online ? "bg-green-500 animate-pulse" : ""}`} style={{ background: online ? undefined : statusColor }} />
                    {statusLabel}
                  </Badge>
                  {agent.os && (
                    <Badge
                      className="text-[10px] uppercase tracking-widest font-bold px-2.5 py-1"
                      style={{ background: "rgba(99,102,241,0.12)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.25)" }}
                    >
                      <Server className="w-3 h-3 mr-1" />
                      {agent.distro || agent.os}
                    </Badge>
                  )}
                </div>

                {/* Info pills row */}
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {[
                    { icon: Globe, label: "IP", value: agent.ipAddress ?? "—", color: "#3b82f6" },
                    { icon: Server, label: "Host", value: agent.hostname ?? "—", color: "#8b5cf6" },
                    { icon: Building2, label: "Org", value: agent.organization.name, color: "#10b981" },
                    { icon: Cpu, label: "CPU", value: `${latestCpu.toFixed(1)}%`, color: "#f59e0b" },
                    { icon: Activity, label: "RAM", value: `${latestMem.toFixed(1)}%`, color: "#ec4899" },
                    { icon: Clock, label: "Heartbeat", value: agent.lastHeartbeat ? timeAgo(agent.lastHeartbeat) : "never", color: "#6366f1" },
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
              { icon: AlertTriangle, label: "Open Alerts", value: openAlerts, color: openAlerts > 0 ? "#ef4444" : "#22c55e", bg: openAlerts > 0 ? "rgba(239,68,68,0.06)" : "rgba(34,197,94,0.06)" },
              { icon: Shield, label: "Services Up", value: `${activeServices}/${services.length}`, color: "#3b82f6", bg: "rgba(59,130,246,0.06)" },
              { icon: Globe, label: downUrls > 0 ? "URLs Down" : "URLs Up", value: downUrls > 0 ? downUrls : urlMonitors.length, color: downUrls > 0 ? "#ef4444" : "#22c55e", bg: downUrls > 0 ? "rgba(239,68,68,0.06)" : "rgba(34,197,94,0.06)" },
              { icon: Package, label: agent.securityUpdates > 0 ? "Sec Patches" : "Updates", value: agent.securityUpdates > 0 ? agent.securityUpdates : agent.pendingUpdates, color: agent.securityUpdates > 0 ? "#ef4444" : "#f59e0b", bg: agent.securityUpdates > 0 ? "rgba(239,68,68,0.06)" : "rgba(245,158,11,0.06)" },
            ].map((stat, i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-center py-4 px-3 text-center"
                style={{
                  background: stat.bg,
                  borderBottom: i < 2 ? "1px solid var(--border)" : undefined,
                  borderRight: i % 2 === 0 ? "1px solid var(--border)" : undefined,
                }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: `${stat.color}18` }}>
                  <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                </div>
                <div className="text-xl font-black leading-none" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-[10px] mt-1 font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* System info bar */}
        <div className="px-5 py-3 flex items-center gap-4 flex-wrap border-t text-[11px]" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
          {agent.kernelVersion && (
            <span style={{ color: "var(--text-muted)" }}>
              Kernel <span className="font-semibold" style={{ color: "var(--text-secondary)" }}>{agent.kernelVersion}</span>
            </span>
          )}
          {agent.packageManager && (
            <span style={{ color: "var(--text-muted)" }}>
              Pkg Manager <span className="font-semibold" style={{ color: "var(--text-secondary)" }}>{agent.packageManager}</span>
            </span>
          )}
          {agent.apiKeyPrefix && (
            <span style={{ color: "var(--text-muted)" }}>
              API Key <span className="font-mono font-semibold" style={{ color: "var(--text-secondary)" }}>{agent.apiKeyPrefix}</span>
            </span>
          )}
          {agent.lastHeartbeat && (
            <span className="ml-auto flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
              <Clock className="w-3 h-3" />
              Last heartbeat {timeAgo(agent.lastHeartbeat)}
            </span>
          )}
        </div>
      </div>

      {/* ═══ METRIC RINGS ROW ════════════════════════════════════════════ */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "CPU", value: latestCpu, unit: "%", color: "#3b82f6", sub: `Load ${latestLoad.toFixed(2)}` },
          { label: "Memory", value: latestMem, unit: "%", color: "#8b5cf6", sub: "" },
          { label: "Disk", value: latestDisk, unit: "%", color: "#f59e0b", sub: "" },
          { label: "Devices", value: agent.devices.length, unit: "", color: "#10b981", sub: `${agent.devices.filter(d => d.isOnline).length} online`, max: Math.max(agent.devices.length, 1) },
        ].map((m) => (
          <div key={m.label} className="rounded-xl p-4 flex flex-col items-center justify-center" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
            <MetricRing value={m.value} max={m.max ?? 100} size={90} strokeWidth={6} color={m.color}>
              <span className="text-xl font-black" style={{ color: m.color }}>{m.unit === "%" ? m.value.toFixed(0) : m.value}</span>
              {m.unit && <span className="text-[9px] font-semibold" style={{ color: "var(--text-muted)" }}>{m.unit}</span>}
            </MetricRing>
            <div className="mt-2 text-[11px] font-semibold" style={{ color: "var(--text-secondary)" }}>{m.label}</div>
            {m.sub && <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{m.sub}</div>}
          </div>
        ))}
      </div>

      {/* ═══ TAB NAVIGATION ══════════════════════════════════════════════ */}
      <div
        className="flex gap-1 p-1 rounded-xl overflow-x-auto"
        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          let badge: React.ReactNode = null;
          if (tab === "Alerts" && openAlerts > 0) badge = <span className="ml-1 text-[10px] rounded-full px-1.5 py-0.5" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>{openAlerts}</span>;
          if (tab === "Devices" && agent.devices.length > 0) badge = <span className="ml-1 text-[10px] rounded-full px-1.5 py-0.5" style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>{agent.devices.length}</span>;
          if (tab === "Packages" && updatablePackages.length > 0) badge = <span className="ml-1 text-[10px] rounded-full px-1.5 py-0.5" style={{ background: "rgba(249,115,22,0.15)", color: "#f97316" }}>{updatablePackages.length}</span>;
          if (tab === "URLs" && downUrls > 0) badge = <span className="ml-1 text-[10px] rounded-full px-1.5 py-0.5" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>{downUrls}</span>;
          if (tab === "Services") badge = <span className="ml-1 text-[10px] rounded-full px-1.5 py-0.5" style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>{services.length}</span>;
          return (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); if (tab === "Config" && !templatesLoaded) loadTemplates(); }}
              className="flex items-center px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-shrink-0"
              style={{
                background: isActive ? "var(--bg-primary)" : "transparent",
                color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              {tab}{badge}
            </button>
          );
        })}
      </div>

      {/* ═══ OVERVIEW TAB ════════════════════════════════════════════════ */}
      {activeTab === "Overview" && (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Metric charts — 2 cols */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid lg:grid-cols-2 gap-4">
              {(["CPU", "MEMORY", "DISK", "LOAD"] as const).map((type) => {
                const data = chartArray.filter(d => d[type] !== undefined).map(d => ({
                  time: new Date(d.time as number).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  value: d[type],
                }));
                const latest = data[data.length - 1]?.value;
                const colors: Record<string, string> = { CPU: "#3b82f6", MEMORY: "#8b5cf6", DISK: "#f59e0b", LOAD: "#10b981" };
                const color = colors[type];
                return (
                  <div key={type} className="rounded-xl overflow-hidden" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
                    <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: "var(--border)" }}>
                      <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{type}</span>
                      {latest !== undefined && (
                        <span className="text-lg font-bold" style={{ color }}>
                          {type === "LOAD" ? latest.toFixed(2) : `${latest.toFixed(1)}%`}
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      {data.length > 0 ? (
                        <ResponsiveContainer width="100%" height={100}>
                          <AreaChart data={data}>
                            <defs>
                              <linearGradient id={`grad-${type}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                                <stop offset="100%" stopColor={color} stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="time" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                            <YAxis hide domain={type === "LOAD" ? [0, "auto"] : [0, 100]} />
                            <RechartsTooltip />
                            <Area type="monotone" dataKey="value" stroke={color} fill={`url(#grad-${type})`} strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[100px] flex items-center justify-center">
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>No data yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right column: Alerts + Services */}
          <div className="space-y-4">
            {/* Alerts summary */}
            <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
              <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}>
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Alerts</span>
                </div>
                <div className="flex gap-1.5">
                  {[
                    { label: "C", count: criticalCount, color: "#ef4444" },
                    { label: "H", count: highCount, color: "#f97316" },
                    { label: "M", count: mediumCount, color: "#eab308" },
                    { label: "L", count: lowCount, color: "#3b82f6" },
                  ].map(s => (
                    <div key={s.label} className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold"
                      style={{
                        background: s.count > 0 ? `${s.color}15` : "var(--bg-secondary)",
                        color: s.count > 0 ? s.color : "var(--text-muted)",
                        border: s.count > 0 ? `1px solid ${s.color}30` : "1px solid var(--border)",
                      }}
                    >{s.count}</div>
                  ))}
                </div>
              </div>
              <div className="p-3 max-h-[260px] overflow-y-auto space-y-1.5">
                {agent.alerts.length === 0 ? (
                  <div className="flex flex-col items-center py-6 gap-2">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(34,197,94,0.1)" }}>
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    </div>
                    <p className="text-xs font-medium text-green-600">All Clear</p>
                  </div>
                ) : (
                  agent.alerts.slice(0, 10).map(alert => {
                    const sev = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.LOW;
                    return (
                      <Link key={alert.id} href={`/portal/admin/guard/alerts/${alert.id}`}
                        className="flex items-start gap-2 p-2.5 rounded-lg transition-colors hover:brightness-95"
                        style={{ background: sev.bg, borderLeft: `3px solid ${sev.color}` }}
                      >
                        {alert.severity === "CRITICAL" ? <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: sev.color }} />
                          : alert.severity === "HIGH" ? <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: sev.color }} />
                          : <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: sev.color }} />}
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium truncate block" style={{ color: "var(--text-primary)" }}>{alert.title}</span>
                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{timeAgo(alert.createdAt)}</span>
                        </div>
                        <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded shrink-0" style={{ background: `${sev.color}20`, color: sev.color }}>{alert.severity}</span>
                      </Link>
                    );
                  })
                )}
                {agent.alerts.length > 10 && (
                  <button onClick={() => setActiveTab("Alerts")} className="text-xs w-full py-2 text-center flex items-center justify-center gap-1" style={{ color: "var(--brand-primary)" }}>
                    View all {agent.alerts.length} alerts <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Services summary */}
            <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
              <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(59,130,246,0.1)" }}>
                    <Activity className="w-3.5 h-3.5" style={{ color: "#3b82f6" }} />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Services</span>
                </div>
                <Badge className="text-[10px]" style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}>
                  {activeServices}/{services.length}
                </Badge>
              </div>
              <div className="p-3 max-h-[200px] overflow-y-auto space-y-1">
                {services.length === 0 ? (
                  <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>No services tracked</p>
                ) : (
                  services.slice(0, 12).map(svc => (
                    <div key={svc.id} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-[var(--bg-secondary)] transition-colors">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${svc.isActive ? "bg-green-500" : "bg-red-500"}`} />
                        <span className="text-xs font-mono" style={{ color: "var(--text-primary)" }}>{svc.serviceName}</span>
                      </div>
                      {svc.memoryUsage && <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{formatBytes(svc.memoryUsage)}</span>}
                    </div>
                  ))
                )}
                {services.length > 12 && (
                  <button onClick={() => setActiveTab("Services")} className="text-xs w-full py-1 text-center" style={{ color: "var(--brand-primary)" }}>
                    View all {services.length} services
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ ALERTS TAB ══════════════════════════════════════════════════ */}
      {activeTab === "Alerts" && (
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
          <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}>
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Security Alerts</h3>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  {agent.alerts.length} total
                  {criticalCount > 0 && <span className="text-red-500 font-medium"> · {criticalCount} critical</span>}
                  {highCount > 0 && <span className="text-orange-500 font-medium"> · {highCount} high</span>}
                </p>
              </div>
            </div>
          </div>
          <div className="p-4 max-h-[500px] overflow-y-auto space-y-2">
            {agent.alerts.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-2">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(34,197,94,0.1)" }}>
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                </div>
                <p className="text-sm font-medium text-green-600">All Clear</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>No alerts recorded</p>
              </div>
            ) : (
              agent.alerts.map(alert => {
                const sev = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.LOW;
                return (
                  <Link key={alert.id} href={`/portal/admin/guard/alerts/${alert.id}`}
                    className="flex items-start gap-3 p-3 rounded-lg transition-colors hover:brightness-95"
                    style={{ background: sev.bg, borderLeft: `3px solid ${sev.color}` }}
                  >
                    {alert.severity === "CRITICAL" ? <XCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: sev.color }} />
                      : alert.severity === "HIGH" ? <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: sev.color }} />
                      : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: sev.color }} />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{alert.title}</span>
                        <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded shrink-0" style={{ background: `${sev.color}20`, color: sev.color }}>{alert.severity}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px]">{alert.status}</Badge>
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{timeAgo(alert.createdAt)}</span>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ═══ DEVICES TAB ═════════════════════════════════════════════════ */}
      {activeTab === "Devices" && (
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
          <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(139,92,246,0.1)" }}>
                <Wifi className="w-4 h-4" style={{ color: "#8b5cf6" }} />
              </div>
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Network Devices ({agent.devices.length})</h3>
            </div>
          </div>
          <div className="p-4">
            {agent.devices.length === 0 ? (
              <p className="text-sm py-8 text-center" style={{ color: "var(--text-muted)" }}>
                No devices discovered yet. Agent scans the network automatically.
              </p>
            ) : (
              <div className="space-y-2">
                {agent.devices.map(device => {
                  const Icon = deviceIcons[device.deviceType] || HelpCircle;
                  return (
                    <div key={device.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "var(--bg-secondary)" }}>
                      <div className="p-2 rounded-lg" style={{ background: "var(--bg-primary)" }}>
                        <Icon className="h-4 w-4" style={{ color: "var(--text-secondary)" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                            {device.hostname || device.vendor || device.macAddress}
                          </p>
                          <Badge variant="outline" className="text-[10px]">{device.deviceType}</Badge>
                          {!device.isAuthorized && (
                            <Badge className="text-[10px]" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>Unauthorized</Badge>
                          )}
                        </div>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {device.ipAddress || "—"} · MAC: {device.macAddress} {device.vendor ? `· ${device.vendor}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`w-2.5 h-2.5 rounded-full ml-auto ${device.isOnline ? "bg-green-500" : "bg-gray-400"}`} />
                        <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>{timeAgo(device.lastSeen)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ COMMANDS TAB ════════════════════════════════════════════════ */}
      {activeTab === "Commands" && (
        <div className="space-y-4">
          <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
            <div className="px-5 py-4 flex items-center gap-2.5 border-b" style={{ borderColor: "var(--border)" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(99,102,241,0.1)" }}>
                <Terminal className="w-4 h-4" style={{ color: "#6366f1" }} />
              </div>
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Send Command</h3>
            </div>
            <div className="p-4">
              <div className="flex gap-2">
                <select value={cmdType} onChange={e => setCmdType(e.target.value)}
                  className="px-3 py-2 rounded-lg border text-sm"
                  style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                >
                  <option value="BLOCK_IP">Block IP</option>
                  <option value="UNBLOCK_IP">Unblock IP</option>
                  <option value="KILL_PROCESS">Kill Process</option>
                  <option value="RESTART_SERVICE">Restart Service</option>
                  <option value="RUN_SCAN">Run Scan</option>
                  <option value="NETWORK_SCAN">Network Scan</option>
                  <option value="CUSTOM">Custom Command</option>
                </select>
                <input value={cmdPayload} onChange={e => setCmdPayload(e.target.value)}
                  placeholder={cmdType === "BLOCK_IP" ? '{"ip": "1.2.3.4"}' : "Payload (JSON)"}
                  className="flex-1 px-3 py-2 rounded-lg border text-sm"
                  style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                />
                <Button onClick={sendCommand} disabled={sending} size="sm" className="gap-1.5">
                  <Send className="h-3.5 w-3.5" /> Send
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: "var(--border)" }}>
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Command History</span>
            </div>
            <div className="p-4">
              {agent.commands.length === 0 ? (
                <p className="text-sm py-4 text-center" style={{ color: "var(--text-muted)" }}>No commands sent yet.</p>
              ) : (
                <div className="space-y-2">
                  {agent.commands.map(cmd => {
                    const statusColors: Record<string, string> = { COMPLETED: "#22c55e", FAILED: "#ef4444", SENT: "#3b82f6", PENDING: "#f59e0b" };
                    const sc = statusColors[cmd.status] ?? "#6b7280";
                    return (
                      <div key={cmd.id} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: "var(--bg-secondary)" }}>
                        <Badge variant="outline" className="text-[10px] shrink-0">{cmd.type}</Badge>
                        <span className="flex-1 text-xs font-mono truncate" style={{ color: "var(--text-secondary)" }}>{cmd.payload}</span>
                        <Badge className="text-[10px] shrink-0" style={{ background: `${sc}1A`, color: sc, border: `1px solid ${sc}30` }}>{cmd.status}</Badge>
                        <span className="text-[10px] shrink-0" style={{ color: "var(--text-muted)" }}>{cmd.createdBy?.name} · {timeAgo(cmd.createdAt)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ PACKAGES TAB ════════════════════════════════════════════════ */}
      {activeTab === "Packages" && (
        <div className="space-y-4">
          <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
            <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(249,115,22,0.1)" }}>
                  <Package className="w-4 h-4" style={{ color: "#f97316" }} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Package Updates ({updatablePackages.length})</h3>
                  {agent.securityUpdates > 0 && <p className="text-[11px] text-red-500">{agent.securityUpdates} security updates</p>}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={refreshPackages} disabled={refreshingPkgs} className="gap-1.5">
                <RefreshCw className={`h-3.5 w-3.5 ${refreshingPkgs ? "animate-spin" : ""}`} /> Refresh
              </Button>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <input type="checkbox" checked={securityOnly} onChange={e => setSecurityOnly(e.target.checked)} className="rounded" />
                  Security Only
                </label>
                <div className="flex gap-2">
                  {selectedPkgs.size > 0 && (
                    <Button size="sm" variant="outline" onClick={() => upgradePackages("selected")} className="gap-1">
                      <CheckSquare className="h-3.5 w-3.5" /> Install Selected ({selectedPkgs.size})
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => upgradePackages("security")} style={{ color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" }} className="gap-1">
                    <Shield className="h-3.5 w-3.5" /> Security
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { if (confirm("Upgrade ALL packages?")) upgradePackages("full"); }}>
                    Full Upgrade
                  </Button>
                </div>
              </div>
              {filteredPackages.length === 0 ? (
                <p className="text-sm py-8 text-center" style={{ color: "var(--text-muted)" }}>
                  {securityOnly ? "No security updates pending." : "No updates available."}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs" style={{ color: "var(--text-muted)" }}>
                        <th className="py-2 pr-2 w-8"></th>
                        <th className="py-2 pr-4">Package</th>
                        <th className="py-2 pr-4">Current</th>
                        <th className="py-2 pr-4">Available</th>
                        <th className="py-2 pr-4">Security?</th>
                        <th className="py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPackages.map(pkg => (
                        <tr key={pkg.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                          <td className="py-2 pr-2">
                            <input type="checkbox" checked={selectedPkgs.has(pkg.id)}
                              onChange={e => { const next = new Set(selectedPkgs); e.target.checked ? next.add(pkg.id) : next.delete(pkg.id); setSelectedPkgs(next); }}
                              className="rounded" />
                          </td>
                          <td className="py-2 pr-4 font-mono text-xs" style={{ color: "var(--text-primary)" }}>{pkg.name}</td>
                          <td className="py-2 pr-4 text-xs" style={{ color: "var(--text-secondary)" }}>{pkg.version}</td>
                          <td className="py-2 pr-4 text-xs font-medium" style={{ color: "var(--text-primary)" }}>{pkg.newVersion || "—"}</td>
                          <td className="py-2 pr-4">
                            {pkg.isSecurityUpdate && <Badge className="text-[10px]" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>Security</Badge>}
                          </td>
                          <td className="py-2"><Badge variant="outline" className="text-[10px]">{pkg.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Patch History */}
          <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: "var(--border)" }}>
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Patch History</span>
            </div>
            <div className="p-4">
              {patchHistory.length === 0 ? (
                <p className="text-sm py-4 text-center" style={{ color: "var(--text-muted)" }}>No patch history yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs" style={{ color: "var(--text-muted)" }}>
                        <th className="py-2 pr-4">Package</th><th className="py-2 pr-4">From</th><th className="py-2 pr-4">To</th>
                        <th className="py-2 pr-4">Status</th><th className="py-2 pr-4">By</th><th className="py-2">When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patchHistory.map(patch => {
                        const sc: Record<string, string> = { COMPLETED: "#22c55e", FAILED: "#ef4444", PENDING: "#f59e0b", APPROVED: "#6366f1", ROLLED_BACK: "#f97316" };
                        const c = sc[patch.status] ?? "#6b7280";
                        return (
                          <tr key={patch.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                            <td className="py-2 pr-4 font-mono text-xs" style={{ color: "var(--text-primary)" }}>{patch.packageName}</td>
                            <td className="py-2 pr-4 text-xs" style={{ color: "var(--text-secondary)" }}>{patch.fromVersion}</td>
                            <td className="py-2 pr-4 text-xs" style={{ color: "var(--text-primary)" }}>{patch.toVersion}</td>
                            <td className="py-2 pr-4"><Badge className="text-[10px]" style={{ background: `${c}1A`, color: c, border: `1px solid ${c}30` }}>{patch.status}</Badge></td>
                            <td className="py-2 pr-4 text-xs" style={{ color: "var(--text-secondary)" }}>{patch.approvedBy?.name || "—"}</td>
                            <td className="py-2 text-xs" style={{ color: "var(--text-muted)" }}>{timeAgo(patch.createdAt)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ SERVICES TAB ════════════════════════════════════════════════ */}
      {activeTab === "Services" && (
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
          <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(59,130,246,0.1)" }}>
                <Activity className="w-4 h-4" style={{ color: "#3b82f6" }} />
              </div>
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Services ({services.length})</h3>
            </div>
            <Button variant="outline" size="sm" onClick={refreshServices} disabled={refreshingSvc} className="gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${refreshingSvc ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
          <div className="p-4">
            {services.length === 0 ? (
              <p className="text-sm py-8 text-center" style={{ color: "var(--text-muted)" }}>No services tracked yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs" style={{ color: "var(--text-muted)" }}>
                      <th className="py-2 pr-4">Service</th><th className="py-2 pr-4">Status</th><th className="py-2 pr-4">Enabled</th>
                      <th className="py-2 pr-4">Sub-state</th><th className="py-2 pr-4">Memory</th><th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map(svc => (
                      <tr key={svc.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                        <td className="py-2 pr-4 font-mono text-xs" style={{ color: "var(--text-primary)" }}>{svc.serviceName}</td>
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${svc.isActive ? "bg-green-500" : "bg-red-500"}`} />
                            <span className="text-xs" style={{ color: svc.isActive ? "#22c55e" : "#ef4444" }}>{svc.isActive ? "active" : "inactive"}</span>
                          </div>
                        </td>
                        <td className="py-2 pr-4 text-xs" style={{ color: "var(--text-secondary)" }}>{svc.isEnabled ? "yes" : "no"}</td>
                        <td className="py-2 pr-4 text-xs" style={{ color: "var(--text-secondary)" }}>{svc.subState || "—"}</td>
                        <td className="py-2 pr-4 text-xs" style={{ color: "var(--text-secondary)" }}>{formatBytes(svc.memoryUsage)}</td>
                        <td className="py-2">
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => restartService(svc.serviceName)}>Restart</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ URLs TAB ════════════════════════════════════════════════════ */}
      {activeTab === "URLs" && (
        <div className="space-y-4">
          <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
            <div className="px-5 py-4 flex items-center gap-2.5 border-b" style={{ borderColor: "var(--border)" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(16,185,129,0.1)" }}>
                <Globe className="w-4 h-4" style={{ color: "#10b981" }} />
              </div>
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Add URL Monitor</h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input value={newMonitorUrl} onChange={e => setNewMonitorUrl(e.target.value)} placeholder="https://example.com"
                  className="px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
                <input value={newMonitorName} onChange={e => setNewMonitorName(e.target.value)} placeholder="Monitor name"
                  className="px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>Expected Status</label>
                    <input type="number" value={newMonitorExpected} onChange={e => setNewMonitorExpected(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>Interval (sec)</label>
                    <input type="number" value={newMonitorInterval} onChange={e => setNewMonitorInterval(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
                  </div>
                </div>
                <div className="flex items-end">
                  <Button onClick={addMonitor} disabled={addingMonitor} className="w-full gap-1.5">
                    <Plus className="h-4 w-4" /> {addingMonitor ? "Adding..." : "Add Monitor"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {urlMonitors.length === 0 ? (
            <div className="rounded-xl py-10 text-center" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
              <Globe className="h-10 w-10 mx-auto mb-3 opacity-20" style={{ color: "var(--text-muted)" }} />
              <p style={{ color: "var(--text-muted)" }}>No URL monitors configured.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {urlMonitors.map(mon => (
                <div key={mon.id} className="rounded-xl p-4" style={{
                  background: "var(--bg-primary)",
                  border: mon.isDown ? "1px solid rgba(239,68,68,0.3)" : "1px solid var(--border)",
                }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge style={{
                        background: mon.isDown ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
                        color: mon.isDown ? "#ef4444" : "#22c55e",
                        border: `1px solid ${mon.isDown ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)"}`,
                      }}>
                        {mon.isDown ? "DOWN" : "UP"}
                      </Badge>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{mon.name}</p>
                        <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{mon.url}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {mon.lastResponseMs !== null && <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{mon.lastResponseMs}ms</span>}
                      {mon.lastChecked && <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{timeAgo(mon.lastChecked)}</span>}
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" style={{ color: "#ef4444" }} onClick={() => deleteMonitor(mon.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {mon.isDown && mon.downSince && (
                    <p className="text-xs mt-1.5 text-red-500">Down since {new Date(mon.downSince).toLocaleString()}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ CONFIG TAB ══════════════════════════════════════════════════ */}
      {activeTab === "Config" && (
        <div className="space-y-4">
          <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
            <div className="px-5 py-4 flex items-center gap-2.5 border-b" style={{ borderColor: "var(--border)" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(245,158,11,0.1)" }}>
                <Settings className="w-4 h-4" style={{ color: "#f59e0b" }} />
              </div>
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Fetch Config</h3>
            </div>
            <div className="p-4">
              <div className="flex gap-2">
                <input value={configFilePath} onChange={e => setConfigFilePath(e.target.value)} placeholder="/etc/nginx/nginx.conf"
                  className="flex-1 px-3 py-2 rounded-lg border text-sm font-mono" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
                <Button onClick={fetchConfig} disabled={fetchingConfig} size="sm">{fetchingConfig ? "Fetching..." : "Fetch"}</Button>
              </div>
              {fetchedConfig !== null && (
                <pre className="mt-3 p-3 rounded-lg text-xs font-mono overflow-auto max-h-64" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>{fetchedConfig}</pre>
              )}
            </div>
          </div>

          <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: "var(--border)" }}>
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Apply Template</span>
            </div>
            <div className="p-4">
              <div className="flex gap-2">
                <select value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
                  <option value="">Select a template...</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.filePath})</option>)}
                </select>
                <Button onClick={deployTemplate} disabled={deployingConfig || !selectedTemplate} size="sm">{deployingConfig ? "Deploying..." : "Deploy"}</Button>
              </div>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: "var(--border)" }}>
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Deployment History</span>
            </div>
            <div className="p-4">
              {configDeployments.length === 0 ? (
                <p className="text-sm py-4 text-center" style={{ color: "var(--text-muted)" }}>No config deployments yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs" style={{ color: "var(--text-muted)" }}>
                        <th className="py-2 pr-4">File Path</th><th className="py-2 pr-4">Status</th><th className="py-2 pr-4">When</th>
                        <th className="py-2 pr-4">By</th><th className="py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {configDeployments.map(dep => {
                        const sc: Record<string, string> = { COMPLETED: "#22c55e", FAILED: "#ef4444", PENDING: "#f59e0b", DEPLOYING: "#3b82f6", ROLLED_BACK: "#f97316" };
                        const c = sc[dep.status] ?? "#6b7280";
                        return (
                          <tr key={dep.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                            <td className="py-2 pr-4 font-mono text-xs" style={{ color: "var(--text-primary)" }}>{dep.filePath}</td>
                            <td className="py-2 pr-4"><Badge className="text-[10px]" style={{ background: `${c}1A`, color: c, border: `1px solid ${c}30` }}>{dep.status}</Badge></td>
                            <td className="py-2 pr-4 text-xs" style={{ color: "var(--text-muted)" }}>{timeAgo(dep.createdAt)}</td>
                            <td className="py-2 pr-4 text-xs" style={{ color: "var(--text-secondary)" }}>{dep.deployedBy?.name || "—"}</td>
                            <td className="py-2">
                              {dep.status === "COMPLETED" && (
                                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => rollbackConfig(dep.id)}>Rollback</Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ LOGS TAB ════════════════════════════════════════════════════ */}
      {activeTab === "Logs" && (
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
          <div className="px-5 py-4 flex items-center gap-2.5 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(139,92,246,0.1)" }}>
              <FileText className="w-4 h-4" style={{ color: "#8b5cf6" }} />
            </div>
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Log Viewer</h3>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>Source</label>
                <select value={logSource} onChange={e => setLogSource(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
                  <option value="nginx">nginx</option><option value="syslog">syslog</option>
                  <option value="journal">journal</option><option value="custom">custom path</option>
                </select>
              </div>
              {logSource === "custom" && (
                <div>
                  <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>Path</label>
                  <input value={logCustomPath} onChange={e => setLogCustomPath(e.target.value)} placeholder="/var/log/custom.log"
                    className="w-full px-3 py-2 rounded-lg border text-sm font-mono" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
                </div>
              )}
              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>Lines</label>
                <input type="number" value={logLines} onChange={e => setLogLines(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>Filter</label>
                <input value={logFilter} onChange={e => setLogFilter(e.target.value)} placeholder="Optional grep filter"
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
              </div>
            </div>
            <Button onClick={fetchLogs} disabled={fetchingLogs} size="sm" className="gap-1.5">
              <FileText className="h-3.5 w-3.5" /> {fetchingLogs ? "Fetching..." : "Fetch Logs"}
            </Button>
            {(logContent || fetchingLogs) && (
              <div className="rounded-lg p-4 overflow-auto max-h-96 font-mono text-xs whitespace-pre-wrap"
                style={{ background: "#0f172a", color: "#4ade80" }}>
                {fetchingLogs && !logContent ? "Waiting for agent to return logs..." : logContent}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
