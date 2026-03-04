"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Server, Activity, AlertTriangle, Terminal, Wifi,
  Printer, Phone, Monitor, HelpCircle, Camera, Cpu, Send,
  Package, Settings, Globe, FileText, RefreshCw, Shield,
  Trash2, Plus, CheckSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";

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
  organization: { id: string; name: string };
  alerts: Alert[]; devices: Device[]; commands: Command[];
}

const severityColors: Record<string, string> = {
  CRITICAL: "bg-red-600 text-white", HIGH: "bg-orange-500 text-white",
  MEDIUM: "bg-yellow-500 text-white", LOW: "bg-blue-500 text-white",
};

const deviceIcons: Record<string, React.ElementType> = {
  PRINTER: Printer, IP_PHONE: Phone, WORKSTATION: Monitor,
  SERVER: Server, CAMERA: Camera, IOT: Cpu, WIFI_AP: Wifi,
  UNKNOWN: HelpCircle,
};

const tabs = ["Metrics", "Alerts", "Devices", "Commands", "Packages", "Config", "Services", "URLs", "Logs"] as const;

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

const statusBadge: Record<string, string> = {
  COMPLETED: "bg-green-600 text-white",
  FAILED: "bg-red-600 text-white",
  PENDING: "bg-yellow-500 text-white",
  DEPLOYING: "bg-blue-500 text-white",
  INSTALLING: "bg-blue-500 text-white",
  APPROVED: "bg-indigo-500 text-white",
  ROLLED_BACK: "bg-orange-500 text-white",
};

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
  const [activeTab, setActiveTab] = useState<string>("Metrics");
  const [cmdType, setCmdType] = useState("BLOCK_IP");
  const [cmdPayload, setCmdPayload] = useState("");
  const [sending, setSending] = useState(false);
  const online = isOnline(agent.lastHeartbeat);

  // Packages state
  const [packages, setPackages] = useState(initialPackages);
  const [patchHistory, setPatchHistory] = useState(initialPatchHistory);
  const [securityOnly, setSecurityOnly] = useState(false);
  const [selectedPkgs, setSelectedPkgs] = useState<Set<string>>(new Set());
  const [refreshingPkgs, setRefreshingPkgs] = useState(false);

  // Services state
  const [services, setServices] = useState(initialServices);
  const [refreshingSvc, setRefreshingSvc] = useState(false);

  // URL monitors state
  const [urlMonitors, setUrlMonitors] = useState(initialUrlMonitors);
  const [newMonitorUrl, setNewMonitorUrl] = useState("");
  const [newMonitorName, setNewMonitorName] = useState("");
  const [newMonitorExpected, setNewMonitorExpected] = useState(200);
  const [newMonitorInterval, setNewMonitorInterval] = useState(60);
  const [addingMonitor, setAddingMonitor] = useState(false);

  // Config state
  const [configDeployments, setConfigDeployments] = useState(initialConfigDeployments);
  const [configFilePath, setConfigFilePath] = useState("");
  const [fetchingConfig, setFetchingConfig] = useState(false);
  const [fetchedConfig, setFetchedConfig] = useState<string | null>(null);
  const [templates, setTemplates] = useState<ConfigTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [deployingConfig, setDeployingConfig] = useState(false);

  // Logs state
  const [logSource, setLogSource] = useState("nginx");
  const [logCustomPath, setLogCustomPath] = useState("");
  const [logLines, setLogLines] = useState(100);
  const [logFilter, setLogFilter] = useState("");
  const [logContent, setLogContent] = useState("");
  const [fetchingLogs, setFetchingLogs] = useState(false);

  // Build chart data by grouping metrics by timestamp (nearest minute)
  const chartData: Record<string, Record<string, number>> = {};
  for (const m of metrics) {
    const key = new Date(m.timestamp).toISOString().slice(0, 16);
    if (!chartData[key]) chartData[key] = { time: new Date(m.timestamp).getTime() };
    chartData[key][m.type] = m.value;
  }
  const chartArray = Object.values(chartData).sort((a, b) => (a.time as number) - (b.time as number));

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
      if (res.ok) {
        toast.success("Command queued — will execute at next heartbeat");
        setCmdPayload("");
      } else toast.error("Failed to send command");
    } finally { setSending(false); }
  }

  // --- Packages actions ---
  async function refreshPackages() {
    setRefreshingPkgs(true);
    try {
      const res = await fetch(`/api/guard/admin/agents/${agent.id}/packages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      toast.success(`${type === "full" ? "Full" : type === "security" ? "Security" : "Selected"} upgrade queued`);
      setSelectedPkgs(new Set());
    } else toast.error("Failed to queue upgrade");
  }

  // --- Services actions ---
  async function refreshServices() {
    setRefreshingSvc(true);
    try {
      const res = await fetch(`/api/guard/admin/agents/${agent.id}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh" }),
      });
      if (res.ok) toast.success("Service status refresh queued");
      else toast.error("Failed to queue refresh");
    } finally { setRefreshingSvc(false); }
  }

  async function restartService(serviceName: string) {
    const res = await fetch(`/api/guard/admin/agents/${agent.id}/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "RESTART_SERVICE", payload: { service: serviceName } }),
    });
    if (res.ok) toast.success(`Restart queued for ${serviceName}`);
    else toast.error("Failed to queue restart");
  }

  // --- URL monitor actions ---
  async function addMonitor() {
    if (!newMonitorUrl.trim() || !newMonitorName.trim()) {
      toast.error("URL and name are required");
      return;
    }
    setAddingMonitor(true);
    try {
      const res = await fetch(`/api/guard/admin/agents/${agent.id}/url-monitors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: newMonitorUrl.trim(),
          name: newMonitorName.trim(),
          expectedStatus: newMonitorExpected,
          intervalSec: newMonitorInterval,
        }),
      });
      if (res.ok) {
        const monitor = await res.json();
        setUrlMonitors((prev) => [monitor, ...prev]);
        setNewMonitorUrl("");
        setNewMonitorName("");
        setNewMonitorExpected(200);
        setNewMonitorInterval(60);
        toast.success("Monitor added");
      } else toast.error("Failed to add monitor");
    } finally { setAddingMonitor(false); }
  }

  async function deleteMonitor(id: string) {
    const res = await fetch(`/api/guard/admin/agents/${agent.id}/url-monitors/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setUrlMonitors((prev) => prev.filter((m) => m.id !== id));
      toast.success("Monitor deleted");
    } else toast.error("Failed to delete monitor");
  }

  // --- Config actions ---
  async function fetchConfig() {
    if (!configFilePath.trim()) {
      toast.error("Enter a file path");
      return;
    }
    setFetchingConfig(true);
    setFetchedConfig(null);
    try {
      const res = await fetch(`/api/guard/admin/agents/${agent.id}/config?filePath=${encodeURIComponent(configFilePath)}`);
      if (res.ok) {
        const data = await res.json();
        setFetchedConfig(data.content || "");
        toast.success("Config fetched");
      } else toast.error("Failed to fetch config");
    } finally { setFetchingConfig(false); }
  }

  async function loadTemplates() {
    if (templatesLoaded) return;
    try {
      const res = await fetch("/api/guard/admin/config-templates");
      if (res.ok) {
        setTemplates(await res.json());
        setTemplatesLoaded(true);
      }
    } catch { /* ignore */ }
  }

  async function deployTemplate() {
    if (!selectedTemplate) {
      toast.error("Select a template");
      return;
    }
    setDeployingConfig(true);
    try {
      const res = await fetch(`/api/guard/admin/agents/${agent.id}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: selectedTemplate }),
      });
      if (res.ok) {
        const dep = await res.json();
        setConfigDeployments((prev) => [dep, ...prev]);
        toast.success("Config deployment queued");
      } else toast.error("Failed to deploy config");
    } finally { setDeployingConfig(false); }
  }

  async function rollbackConfig(deploymentId: string) {
    const res = await fetch(`/api/guard/admin/agents/${agent.id}/config/${deploymentId}/rollback`, {
      method: "POST",
    });
    if (res.ok) {
      toast.success("Rollback queued");
      setConfigDeployments((prev) =>
        prev.map((d) => (d.id === deploymentId ? { ...d, status: "ROLLED_BACK" } : d))
      );
    } else toast.error("Failed to rollback");
  }

  // --- Logs actions ---
  async function fetchLogs() {
    setFetchingLogs(true);
    setLogContent("");
    try {
      const source = logSource === "custom" ? logCustomPath : logSource;
      const res = await fetch(`/api/guard/admin/agents/${agent.id}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "FETCH_LOGS",
          payload: { source, lines: logLines, filter: logFilter || undefined },
        }),
      });
      if (res.ok) {
        const cmd = await res.json();
        toast.success("Log fetch queued — polling for result...");
        // Poll for command result
        let attempts = 0;
        const poll = setInterval(async () => {
          attempts++;
          if (attempts > 30) {
            clearInterval(poll);
            setFetchingLogs(false);
            toast.error("Timed out waiting for log result");
            return;
          }
          try {
            const statusRes = await fetch(`/api/guard/admin/agents/${agent.id}/command/${cmd.id}`);
            if (statusRes.ok) {
              const data = await statusRes.json();
              if (data.status === "COMPLETED" && data.result) {
                clearInterval(poll);
                try {
                  const parsed = JSON.parse(data.result);
                  const decoded = parsed.logs ? atob(parsed.logs) : data.result;
                  setLogContent(decoded);
                } catch {
                  setLogContent(data.result);
                }
                setFetchingLogs(false);
              } else if (data.status === "FAILED") {
                clearInterval(poll);
                setLogContent(data.result || "Command failed");
                setFetchingLogs(false);
              }
            }
          } catch { /* continue polling */ }
        }, 2000);
      } else toast.error("Failed to queue log fetch");
    } catch {
      setFetchingLogs(false);
      toast.error("Error fetching logs");
    }
  }

  const updatablePackages = packages.filter((p) => p.status === "UPDATE_AVAILABLE");
  const filteredPackages = securityOnly ? updatablePackages.filter((p) => p.isSecurityUpdate) : updatablePackages;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/portal/admin/guard/agents">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{agent.name}</h1>
            <Badge variant="outline" className={online ? "border-green-500 text-green-600" : "border-red-500 text-red-600"}>
              {online ? "ONLINE" : agent.status}
            </Badge>
          </div>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {agent.hostname || "—"} · {agent.ipAddress || "—"} · {agent.os || "—"} · {agent.organization.name}
          </p>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Hostname", value: agent.hostname || "—" },
          { label: "IP Address", value: agent.ipAddress || "—" },
          { label: "OS", value: agent.os || "—" },
          { label: "Kernel", value: agent.kernelVersion || "—" },
          { label: "Last Heartbeat", value: agent.lastHeartbeat ? timeAgo(agent.lastHeartbeat) : "Never" },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="py-2.5">
              <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{item.label}</p>
              <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg w-fit flex-wrap" style={{ background: "var(--bg-secondary)" }}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              if (tab === "Config" && !templatesLoaded) loadTemplates();
            }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {tab}
            {tab === "Alerts" && agent.alerts.filter((a) => a.status === "OPEN").length > 0 && (
              <span className="ml-1.5 text-[10px] bg-red-500 text-white rounded-full px-1.5">
                {agent.alerts.filter((a) => a.status === "OPEN").length}
              </span>
            )}
            {tab === "Devices" && agent.devices.length > 0 && (
              <span className="ml-1.5 text-[10px] rounded-full px-1.5" style={{ background: "var(--bg-secondary)" }}>
                {agent.devices.length}
              </span>
            )}
            {tab === "Packages" && updatablePackages.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-orange-500 text-white rounded-full px-1.5">
                {updatablePackages.length}
              </span>
            )}
            {tab === "URLs" && urlMonitors.filter((m) => m.isDown).length > 0 && (
              <span className="ml-1.5 text-[10px] bg-red-500 text-white rounded-full px-1.5">
                {urlMonitors.filter((m) => m.isDown).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* =============== Metrics Tab =============== */}
      {activeTab === "Metrics" && (
        <div className="grid lg:grid-cols-2 gap-4">
          {(["CPU", "MEMORY", "DISK", "LOAD"] as const).map((type) => {
            const data = chartArray.filter((d) => d[type] !== undefined).map((d) => ({
              time: new Date(d.time as number).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              value: d[type],
            }));
            const latest = data[data.length - 1]?.value;
            return (
              <Card key={type}>
                <CardHeader className="pb-1">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{type}</CardTitle>
                    {latest !== undefined && (
                      <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                        {type === "LOAD" ? latest.toFixed(2) : `${latest.toFixed(1)}%`}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height={120}>
                      <AreaChart data={data}>
                        <defs>
                          <linearGradient id={`grad-${type}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="var(--brand-primary)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="time" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis hide domain={type === "LOAD" ? [0, "auto"] : [0, 100]} />
                        <RechartsTooltip />
                        <Area type="monotone" dataKey="value" stroke="var(--brand-primary)" fill={`url(#grad-${type})`} strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[120px] flex items-center justify-center">
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>No data yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* =============== Alerts Tab =============== */}
      {activeTab === "Alerts" && (
        <Card>
          <CardContent className="py-3">
            {agent.alerts.length === 0 ? (
              <p className="text-sm py-8 text-center" style={{ color: "var(--text-muted)" }}>No alerts recorded.</p>
            ) : (
              <div className="space-y-2">
                {agent.alerts.map((alert) => (
                  <Link key={alert.id} href={`/portal/admin/guard/alerts/${alert.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    <Badge className={`text-[10px] ${severityColors[alert.severity] || ""}`}>{alert.severity}</Badge>
                    <span className="flex-1 text-sm truncate" style={{ color: "var(--text-primary)" }}>{alert.title}</span>
                    <Badge variant="outline" className="text-[10px]">{alert.status}</Badge>
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{timeAgo(alert.createdAt)}</span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* =============== Devices Tab =============== */}
      {activeTab === "Devices" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Network Devices ({agent.devices.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {agent.devices.length === 0 ? (
              <p className="text-sm py-8 text-center" style={{ color: "var(--text-muted)" }}>
                No devices discovered yet. Agent will scan the network automatically.
              </p>
            ) : (
              <div className="space-y-2">
                {agent.devices.map((device) => {
                  const Icon = deviceIcons[device.deviceType] || HelpCircle;
                  return (
                    <div key={device.id} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: "var(--bg-secondary)" }}>
                      <div className="p-2 rounded-lg bg-[var(--bg-primary)]">
                        <Icon className="h-4 w-4" style={{ color: "var(--text-secondary)" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                            {device.hostname || device.vendor || device.macAddress}
                          </p>
                          <Badge variant="outline" className="text-[10px]">{device.deviceType}</Badge>
                          {!device.isAuthorized && (
                            <Badge variant="destructive" className="text-[10px]">Unauthorized</Badge>
                          )}
                        </div>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {device.ipAddress || "—"} · MAC: {device.macAddress} {device.vendor ? `· ${device.vendor}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`w-2 h-2 rounded-full ml-auto ${device.isOnline ? "bg-green-500" : "bg-gray-400"}`} />
                        <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                          {timeAgo(device.lastSeen)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* =============== Commands Tab =============== */}
      {activeTab === "Commands" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Terminal className="h-4 w-4" /> Send Command
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <select
                  value={cmdType}
                  onChange={(e) => setCmdType(e.target.value)}
                  className="px-3 py-2 rounded-lg border text-sm"
                  style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                >
                  <option value="BLOCK_IP">Block IP</option>
                  <option value="UNBLOCK_IP">Unblock IP</option>
                  <option value="KILL_PROCESS">Kill Process</option>
                  <option value="RESTART_SERVICE">Restart Service</option>
                  <option value="RUN_SCAN">Run Scan</option>
                  <option value="NETWORK_SCAN">Network Scan</option>
                  <option value="CUSTOM">Custom Command</option>
                </select>
                <input
                  value={cmdPayload}
                  onChange={(e) => setCmdPayload(e.target.value)}
                  placeholder={cmdType === "BLOCK_IP" ? '{"ip": "1.2.3.4"}' : "Payload (JSON)"}
                  className="flex-1 px-3 py-2 rounded-lg border text-sm"
                  style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                />
                <Button onClick={sendCommand} disabled={sending} size="sm">
                  <Send className="h-4 w-4 mr-1" /> Send
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-3">
              {agent.commands.length === 0 ? (
                <p className="text-sm py-4 text-center" style={{ color: "var(--text-muted)" }}>No commands sent yet.</p>
              ) : (
                <div className="space-y-2">
                  {agent.commands.map((cmd) => (
                    <div key={cmd.id} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: "var(--bg-secondary)" }}>
                      <Badge variant="outline" className="text-[10px]">{cmd.type}</Badge>
                      <span className="flex-1 text-xs font-mono truncate" style={{ color: "var(--text-secondary)" }}>
                        {cmd.payload}
                      </span>
                      <Badge className={`text-[10px] ${
                        cmd.status === "COMPLETED" ? "bg-green-600 text-white" :
                        cmd.status === "FAILED" ? "bg-red-600 text-white" :
                        cmd.status === "SENT" ? "bg-blue-500 text-white" : "bg-yellow-500 text-white"
                      }`}>
                        {cmd.status}
                      </Badge>
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        {cmd.createdBy?.name} · {timeAgo(cmd.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* =============== Packages Tab =============== */}
      {activeTab === "Packages" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" /> Package Updates ({updatablePackages.length})
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={refreshPackages} disabled={refreshingPkgs}>
                    <RefreshCw className={`h-3.5 w-3.5 mr-1 ${refreshingPkgs ? "animate-spin" : ""}`} />
                    Refresh Inventory
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <input
                    type="checkbox"
                    checked={securityOnly}
                    onChange={(e) => setSecurityOnly(e.target.checked)}
                    className="rounded"
                  />
                  Security Only
                </label>
                <div className="flex gap-2">
                  {selectedPkgs.size > 0 && (
                    <Button size="sm" variant="outline" onClick={() => upgradePackages("selected")}>
                      <CheckSquare className="h-3.5 w-3.5 mr-1" /> Install Selected ({selectedPkgs.size})
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50 dark:border-red-700 dark:hover:bg-red-900/20" onClick={() => upgradePackages("security")}>
                    <Shield className="h-3.5 w-3.5 mr-1" /> Security Upgrade
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm("This will upgrade ALL packages. Continue?")) upgradePackages("full");
                    }}
                  >
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
                        <th className="py-2 pr-4">Package Name</th>
                        <th className="py-2 pr-4">Current</th>
                        <th className="py-2 pr-4">Available</th>
                        <th className="py-2 pr-4">Security?</th>
                        <th className="py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPackages.map((pkg) => (
                        <tr key={pkg.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                          <td className="py-2 pr-2">
                            <input
                              type="checkbox"
                              checked={selectedPkgs.has(pkg.id)}
                              onChange={(e) => {
                                const next = new Set(selectedPkgs);
                                e.target.checked ? next.add(pkg.id) : next.delete(pkg.id);
                                setSelectedPkgs(next);
                              }}
                              className="rounded"
                            />
                          </td>
                          <td className="py-2 pr-4 font-mono text-xs" style={{ color: "var(--text-primary)" }}>
                            {pkg.name}
                          </td>
                          <td className="py-2 pr-4 text-xs" style={{ color: "var(--text-secondary)" }}>
                            {pkg.version}
                          </td>
                          <td className="py-2 pr-4 text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                            {pkg.newVersion || "—"}
                          </td>
                          <td className="py-2 pr-4">
                            {pkg.isSecurityUpdate && (
                              <Badge className="bg-red-600 text-white text-[10px]">Security</Badge>
                            )}
                          </td>
                          <td className="py-2">
                            <Badge variant="outline" className="text-[10px]">{pkg.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Patch History */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Patch History</CardTitle>
            </CardHeader>
            <CardContent>
              {patchHistory.length === 0 ? (
                <p className="text-sm py-4 text-center" style={{ color: "var(--text-muted)" }}>No patch history yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs" style={{ color: "var(--text-muted)" }}>
                        <th className="py-2 pr-4">Package</th>
                        <th className="py-2 pr-4">From</th>
                        <th className="py-2 pr-4">To</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Approved By</th>
                        <th className="py-2">When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patchHistory.map((patch) => (
                        <tr key={patch.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                          <td className="py-2 pr-4 font-mono text-xs" style={{ color: "var(--text-primary)" }}>
                            {patch.packageName}
                          </td>
                          <td className="py-2 pr-4 text-xs" style={{ color: "var(--text-secondary)" }}>{patch.fromVersion}</td>
                          <td className="py-2 pr-4 text-xs" style={{ color: "var(--text-primary)" }}>{patch.toVersion}</td>
                          <td className="py-2 pr-4">
                            <Badge className={`text-[10px] ${statusBadge[patch.status] || "bg-gray-500 text-white"}`}>
                              {patch.status}
                            </Badge>
                          </td>
                          <td className="py-2 pr-4 text-xs" style={{ color: "var(--text-secondary)" }}>
                            {patch.approvedBy?.name || "—"}
                          </td>
                          <td className="py-2 text-xs" style={{ color: "var(--text-muted)" }}>
                            {timeAgo(patch.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* =============== Config Tab =============== */}
      {activeTab === "Config" && (
        <div className="space-y-4">
          {/* Fetch Config */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" /> Fetch Config
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <input
                  value={configFilePath}
                  onChange={(e) => setConfigFilePath(e.target.value)}
                  placeholder="/etc/nginx/nginx.conf"
                  className="flex-1 px-3 py-2 rounded-lg border text-sm font-mono"
                  style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                />
                <Button onClick={fetchConfig} disabled={fetchingConfig} size="sm">
                  {fetchingConfig ? "Fetching..." : "Fetch"}
                </Button>
              </div>
              {fetchedConfig !== null && (
                <pre
                  className="mt-3 p-3 rounded-lg text-xs font-mono overflow-auto max-h-64"
                  style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}
                >
                  {fetchedConfig}
                </pre>
              )}
            </CardContent>
          </Card>

          {/* Apply Template */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Apply Template</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border text-sm"
                  style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                >
                  <option value="">Select a template...</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.filePath})</option>
                  ))}
                </select>
                <Button onClick={deployTemplate} disabled={deployingConfig || !selectedTemplate} size="sm">
                  {deployingConfig ? "Deploying..." : "Deploy"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Config Deployment History */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Deployment History</CardTitle>
            </CardHeader>
            <CardContent>
              {configDeployments.length === 0 ? (
                <p className="text-sm py-4 text-center" style={{ color: "var(--text-muted)" }}>No config deployments yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs" style={{ color: "var(--text-muted)" }}>
                        <th className="py-2 pr-4">File Path</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Timestamp</th>
                        <th className="py-2 pr-4">Deployed By</th>
                        <th className="py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {configDeployments.map((dep) => (
                        <tr key={dep.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                          <td className="py-2 pr-4 font-mono text-xs" style={{ color: "var(--text-primary)" }}>
                            {dep.filePath}
                          </td>
                          <td className="py-2 pr-4">
                            <Badge className={`text-[10px] ${statusBadge[dep.status] || "bg-gray-500 text-white"}`}>
                              {dep.status}
                            </Badge>
                          </td>
                          <td className="py-2 pr-4 text-xs" style={{ color: "var(--text-muted)" }}>
                            {timeAgo(dep.createdAt)}
                          </td>
                          <td className="py-2 pr-4 text-xs" style={{ color: "var(--text-secondary)" }}>
                            {dep.deployedBy?.name || "—"}
                          </td>
                          <td className="py-2">
                            {dep.status === "COMPLETED" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7"
                                onClick={() => rollbackConfig(dep.id)}
                              >
                                Rollback
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* =============== Services Tab =============== */}
      {activeTab === "Services" && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" /> Services ({services.length})
              </CardTitle>
              <Button variant="outline" size="sm" onClick={refreshServices} disabled={refreshingSvc}>
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${refreshingSvc ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {services.length === 0 ? (
              <p className="text-sm py-8 text-center" style={{ color: "var(--text-muted)" }}>
                No services tracked yet. Agent will collect service data automatically.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs" style={{ color: "var(--text-muted)" }}>
                      <th className="py-2 pr-4">Service Name</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Enabled</th>
                      <th className="py-2 pr-4">Sub-state</th>
                      <th className="py-2 pr-4">Memory</th>
                      <th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((svc) => (
                      <tr key={svc.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                        <td className="py-2 pr-4 font-mono text-xs" style={{ color: "var(--text-primary)" }}>
                          {svc.serviceName}
                        </td>
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${svc.isActive ? "bg-green-500" : "bg-red-500"}`} />
                            <span className="text-xs" style={{ color: svc.isActive ? "#22c55e" : "#ef4444" }}>
                              {svc.isActive ? "active" : "inactive"}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 pr-4 text-xs" style={{ color: "var(--text-secondary)" }}>
                          {svc.isEnabled ? "yes" : "no"}
                        </td>
                        <td className="py-2 pr-4 text-xs" style={{ color: "var(--text-secondary)" }}>
                          {svc.subState || "—"}
                        </td>
                        <td className="py-2 pr-4 text-xs" style={{ color: "var(--text-secondary)" }}>
                          {formatBytes(svc.memoryUsage)}
                        </td>
                        <td className="py-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7"
                            onClick={() => restartService(svc.serviceName)}
                          >
                            Restart
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* =============== URLs Tab =============== */}
      {activeTab === "URLs" && (
        <div className="space-y-4">
          {/* Add Monitor Form */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="h-4 w-4" /> Add URL Monitor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  value={newMonitorUrl}
                  onChange={(e) => setNewMonitorUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="px-3 py-2 rounded-lg border text-sm"
                  style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                />
                <input
                  value={newMonitorName}
                  onChange={(e) => setNewMonitorName(e.target.value)}
                  placeholder="Monitor name"
                  className="px-3 py-2 rounded-lg border text-sm"
                  style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                />
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>
                      Expected Status
                    </label>
                    <input
                      type="number"
                      value={newMonitorExpected}
                      onChange={(e) => setNewMonitorExpected(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>
                      Interval (sec)
                    </label>
                    <input
                      type="number"
                      value={newMonitorInterval}
                      onChange={(e) => setNewMonitorInterval(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                    />
                  </div>
                </div>
                <div className="flex items-end">
                  <Button onClick={addMonitor} disabled={addingMonitor} className="w-full">
                    <Plus className="h-4 w-4 mr-1" /> {addingMonitor ? "Adding..." : "Add Monitor"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Monitor List */}
          {urlMonitors.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Globe className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p style={{ color: "var(--text-muted)" }}>No URL monitors configured.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {urlMonitors.map((mon) => (
                <Card key={mon.id} className={mon.isDown ? "border-red-300 dark:border-red-700" : ""}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <Badge className={mon.isDown ? "bg-red-600 text-white" : "bg-green-600 text-white"}>
                          {mon.isDown ? "DOWN" : "UP"}
                        </Badge>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                            {mon.name}
                          </p>
                          <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                            {mon.url}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {mon.lastResponseMs !== null && (
                          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                            {mon.lastResponseMs}ms
                          </span>
                        )}
                        {mon.lastChecked && (
                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                            {timeAgo(mon.lastChecked)}
                          </span>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700 h-7 w-7 p-0"
                          onClick={() => deleteMonitor(mon.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {mon.isDown && mon.downSince && (
                      <p className="text-xs mt-1 text-red-500">
                        Down since {new Date(mon.downSince).toLocaleString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =============== Logs Tab =============== */}
      {activeTab === "Logs" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" /> Log Viewer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>
                  Source
                </label>
                <select
                  value={logSource}
                  onChange={(e) => setLogSource(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                >
                  <option value="nginx">nginx</option>
                  <option value="syslog">syslog</option>
                  <option value="journal">journal</option>
                  <option value="custom">custom path</option>
                </select>
              </div>
              {logSource === "custom" && (
                <div>
                  <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>
                    Path
                  </label>
                  <input
                    value={logCustomPath}
                    onChange={(e) => setLogCustomPath(e.target.value)}
                    placeholder="/var/log/custom.log"
                    className="w-full px-3 py-2 rounded-lg border text-sm font-mono"
                    style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                  />
                </div>
              )}
              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>
                  Lines
                </label>
                <input
                  type="number"
                  value={logLines}
                  onChange={(e) => setLogLines(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>
                  Filter
                </label>
                <input
                  value={logFilter}
                  onChange={(e) => setLogFilter(e.target.value)}
                  placeholder="Optional grep filter"
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                />
              </div>
            </div>
            <Button onClick={fetchLogs} disabled={fetchingLogs} size="sm">
              <FileText className="h-3.5 w-3.5 mr-1" /> {fetchingLogs ? "Fetching..." : "Fetch Logs"}
            </Button>

            {(logContent || fetchingLogs) && (
              <div
                className="rounded-lg p-4 overflow-auto max-h-96 bg-gray-900 text-green-400 font-mono text-xs whitespace-pre-wrap"
              >
                {fetchingLogs && !logContent ? "Waiting for agent to return logs..." : logContent}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
