"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  Activity,
  HardDrive,
  Cpu,
  Shield,
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

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "rgb(239, 68, 68)",
  HIGH: "rgb(249, 115, 22)",
  MEDIUM: "rgb(234, 179, 8)",
  LOW: "rgb(59, 130, 246)",
};

// ─── Component ──────────────────────────────────────────────────────────────

export function InternalDashboardClient({
  initialData,
}: {
  initialData: DashboardData;
}) {
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
        setData({
          agent: json.agent,
          metricSnapshots: json.metricSnapshots ?? [],
          latestScan: json.latestScan ?? null,
        });
      }
    } catch (err) {
      console.error("Refresh failed:", err);
    }
  }, []);

  // Auto-refresh every 10s
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(refreshData, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshData]);

  const handleScan = async () => {
    setIsScanning(true);
    setScanProgress(0);
    setScanError(null);

    const progressInterval = setInterval(() => {
      setScanProgress((p) => Math.min(p + Math.random() * 15, 90));
    }, 500);

    try {
      const res = await fetch("/api/guard/internal/scan", { method: "POST" });
      clearInterval(progressInterval);
      setScanProgress(100);

      if (!res.ok) {
        const err = await res.json();
        setScanError(err.error || "Scan failed");
      } else {
        // Refresh to get the latest data from DB
        await refreshData();
      }
    } catch (err) {
      clearInterval(progressInterval);
      setScanError(String(err));
    } finally {
      setTimeout(() => {
        setIsScanning(false);
        setScanProgress(0);
      }, 1000);
    }
  };

  const threatScore = latest?.threatScore ?? 0;
  const threatLevel = latest?.threatLevel ?? "LOW";
  const grade = latest?.grade ?? "-";

  return (
    <div className="space-y-6">
      {/* ─── Agent Status Header ──────────────────────────────────── */}
      <Card className="overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Left: Agent identity + status */}
          <CardContent className="flex-1 pt-5 pb-4">
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: agent.status === "ONLINE"
                    ? "linear-gradient(135deg, rgb(34,197,94), rgb(22,163,74))"
                    : "linear-gradient(135deg, rgb(239,68,68), rgb(185,28,28))",
                }}
              >
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold">{agent.name}</h2>
                  <Badge variant={agent.status === "ONLINE" ? "default" : "destructive"} className="gap-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${agent.status === "ONLINE" ? "bg-green-300 animate-pulse" : "bg-red-300"}`} />
                    {agent.status}
                  </Badge>
                  {grade !== "-" && (
                    <Badge variant={grade === "A" ? "default" : grade === "F" ? "destructive" : "secondary"} className="text-xs">
                      Grade {grade}
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 mt-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">IP</span>
                    <span className="font-medium ml-auto">{agent.ipAddress ?? "127.0.0.1"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Server className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Host</span>
                    <span className="font-medium ml-auto">{agent.hostname ?? "localhost"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Uptime</span>
                    <span className="font-medium ml-auto">{formatUptime(latest?.uptime ?? 0)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Last Scan</span>
                    <span className="font-medium ml-auto">{agent.lastHeartbeat ? timeAgo(agent.lastHeartbeat) : "Never"}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          {/* Right: Quick stats panel */}
          <div className="md:w-64 border-t md:border-t-0 md:border-l p-4 flex flex-row md:flex-col justify-around gap-2" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <div>
                <p className="text-lg font-bold leading-none">{agent.alerts.length}</p>
                <p className="text-[10px] text-muted-foreground">Open Findings</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-lg font-bold leading-none">{agent.serviceStatuses.filter(s => s.isActive).length}/{agent.serviceStatuses.length}</p>
                <p className="text-[10px] text-muted-foreground">Services Up</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Wifi className="w-4 h-4 text-purple-500" />
              <div>
                <p className="text-lg font-bold leading-none">{latestScan?.ports?.length ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">Open Ports</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Package className="w-4 h-4 text-amber-500" />
              <div>
                <p className="text-lg font-bold leading-none">
                  {agent.securityUpdates > 0 ? (
                    <span className="text-red-500">{agent.securityUpdates}</span>
                  ) : (
                    agent.pendingUpdates
                  )}
                </p>
                <p className="text-[10px] text-muted-foreground">{agent.securityUpdates > 0 ? "Security Patches" : "Pending Updates"}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ─── Top Row: Threat + Metrics ────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-5">
        {/* Threat Score Ring */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Threat Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <div className="relative w-28 h-28">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground opacity-20" />
                  <circle cx="50" cy="50" r="45" fill="none"
                    stroke={SEVERITY_COLORS[threatLevel] ?? "rgb(34, 197, 94)"}
                    strokeWidth="3"
                    strokeDasharray={`${(threatScore / 100) * 282.6} 282.6`}
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-2xl font-bold">{threatScore}</div>
                  <div className="text-[10px] text-muted-foreground">{threatLevel}</div>
                </div>
              </div>
            </div>
            <div className="text-center mt-2">
              <Badge variant={grade === "A" ? "default" : grade === "F" ? "destructive" : "secondary"}>
                Grade: {grade}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* CPU */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Cpu className="w-4 h-4" /> CPU
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold">{latest?.cpuPercent?.toFixed(1) ?? 0}%</div>
            <Progress value={latest?.cpuPercent ?? 0} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Load: {latest?.loadAvg?.[0]?.toFixed(2) ?? 0}
            </p>
          </CardContent>
        </Card>

        {/* Memory */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4" /> Memory
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold">{latest?.memPercent ?? 0}%</div>
            <Progress value={latest?.memPercent ?? 0} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {formatBytes(latest?.memUsed ?? 0)} / {formatBytes(latest?.memTotal ?? 0)}
            </p>
          </CardContent>
        </Card>

        {/* Disk */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <HardDrive className="w-4 h-4" /> Disk
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold">{latest?.diskPercent ?? 0}%</div>
            <Progress value={latest?.diskPercent ?? 0} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {formatBytes((latest?.diskTotal ?? 0) - (latest?.diskUsed ?? 0))} free
            </p>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Server className="w-4 h-4" /> System
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Uptime</span>
              <span className="font-medium">{formatUptime(latest?.uptime ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Processes</span>
              <span className="font-medium">{latest?.processes ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Net In</span>
              <span className="font-medium">{formatBytes(latest?.networkRx ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Net Out</span>
              <span className="font-medium">{formatBytes(latest?.networkTx ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Patches</span>
              <span className="font-medium">
                {agent.securityUpdates > 0 ? (
                  <span className="text-red-500">{agent.securityUpdates} security</span>
                ) : (
                  `${agent.pendingUpdates} pending`
                )}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Scan Control ────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Scan Control</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 items-center">
            <Button onClick={handleScan} disabled={isScanning} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${isScanning ? "animate-spin" : ""}`} />
              {isScanning ? "Scanning..." : "Run Full Scan"}
            </Button>
            <Button variant="outline" onClick={() => setAutoRefresh(!autoRefresh)} size="sm">
              Auto-refresh: {autoRefresh ? "ON" : "OFF"}
            </Button>
            {agent.lastHeartbeat && (
              <span className="text-xs text-muted-foreground ml-auto">
                Last scan: {timeAgo(agent.lastHeartbeat)}
              </span>
            )}
          </div>
          {isScanning && (
            <div className="space-y-1">
              <Progress value={scanProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">{scanProgress.toFixed(0)}%</p>
            </div>
          )}
          {scanError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{scanError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* ─── Security Findings (from DB alerts) ──────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Security Findings ({agent.alerts.length})
          </CardTitle>
          <CardDescription>
            {agent.alerts.filter(a => a.severity === "CRITICAL").length} critical
            {" \u2022 "}
            {agent.alerts.filter(a => a.severity === "HIGH").length} high
            {" \u2022 "}
            {agent.alerts.filter(a => a.severity === "MEDIUM").length} medium
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {agent.alerts.length === 0 ? (
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                All systems secure. No active threats detected.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              {agent.alerts.slice(0, 15).map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 p-3 border rounded-lg"
                  style={{ borderLeftWidth: 4, borderLeftColor: SEVERITY_COLORS[alert.severity] ?? "#888" }}
                >
                  {alert.severity === "CRITICAL" ? (
                    <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  ) : alert.severity === "HIGH" ? (
                    <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{alert.title}</p>
                      <Badge variant={alert.severity === "CRITICAL" ? "destructive" : "secondary"} className="shrink-0">
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{alert.description}</p>
                    {alert.aiRecommendation && (
                      <details className="text-xs">
                        <summary className="cursor-pointer font-medium text-blue-600">View fix</summary>
                        <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto whitespace-pre-wrap">
                          {alert.aiRecommendation}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
              {agent.alerts.length > 15 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{agent.alerts.length - 15} more findings
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Open Ports (from latest scan) ────────────────────────── */}
      {latestScan?.ports && latestScan.ports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Open Ports ({latestScan.ports.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {latestScan.ports.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-2 border rounded text-sm">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-3 h-3 text-muted-foreground" />
                    <span className="font-mono">{p.port}</span>
                    <span className="text-muted-foreground">{p.service}</span>
                  </div>
                  <Badge
                    variant={p.risk === "critical" || p.risk === "high" ? "destructive" : "secondary"}
                    className="text-[10px]"
                  >
                    {p.risk}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Services ────────────────────────────────────────────── */}
      {agent.serviceStatuses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Services ({agent.serviceStatuses.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
              {agent.serviceStatuses.map((svc) => (
                <div key={svc.id} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm font-medium">{svc.serviceName}</span>
                  {svc.isActive ? (
                    <Badge className="bg-green-600 text-white">Active</Badge>
                  ) : (
                    <Badge variant="destructive">Down</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── File Integrity (from latest scan) ───────────────────── */}
      {latestScan?.fileIntegrity && latestScan.fileIntegrity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              File Integrity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {latestScan.fileIntegrity.map((fi, i) => (
                <div key={i} className="flex items-center justify-between p-2 border rounded text-sm">
                  <span className="font-mono text-xs truncate flex-1">{fi.path}</span>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="font-mono text-xs text-muted-foreground">{fi.permissions}</span>
                    {fi.status === "ok" ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : fi.status === "danger" ? (
                      <XCircle className="w-4 h-4 text-red-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Performance Trend ───────────────────────────────────── */}
      {metricSnapshots.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Performance History ({metricSnapshots.length} scans)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium mb-2">CPU Usage</div>
              <div className="flex gap-1 items-end h-12">
                {metricSnapshots.slice().reverse().map((m, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-blue-500 rounded-t opacity-70 hover:opacity-100 transition-opacity"
                    style={{ height: `${Math.max(m.cpuPercent, 2)}%`, minHeight: "2px" }}
                    title={`CPU: ${m.cpuPercent.toFixed(1)}% — ${new Date(m.timestamp).toLocaleTimeString()}`}
                  />
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium mb-2">Memory Usage</div>
              <div className="flex gap-1 items-end h-12">
                {metricSnapshots.slice().reverse().map((m, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-purple-500 rounded-t opacity-70 hover:opacity-100 transition-opacity"
                    style={{ height: `${Math.max(m.memPercent, 2)}%`, minHeight: "2px" }}
                    title={`Memory: ${m.memPercent}% — ${new Date(m.timestamp).toLocaleTimeString()}`}
                  />
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium mb-2">Disk Usage</div>
              <div className="flex gap-1 items-end h-12">
                {metricSnapshots.slice().reverse().map((m, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-amber-500 rounded-t opacity-70 hover:opacity-100 transition-opacity"
                    style={{ height: `${Math.max(m.diskPercent, 2)}%`, minHeight: "2px" }}
                    title={`Disk: ${m.diskPercent}% — ${new Date(m.timestamp).toLocaleTimeString()}`}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

{/* Agent info moved to top */}
    </div>
  );
}
