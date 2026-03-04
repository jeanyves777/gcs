"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Server,
  AlertTriangle,
  Activity,
  Wifi,
  ChevronRight,
  Rocket,
  RefreshCw,
  Package,
  Globe,
  ShieldAlert,
  CheckCircle2,
  XOctagon,
  Clock,
  TrendingUp,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Agent {
  id: string;
  name: string;
  hostname: string | null;
  ipAddress: string | null;
  status: string;
  lastHeartbeat: string | null;
  organization: { name: string };
  _count: { alerts: number; devices: number };
}

interface Alert {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  agent: {
    name: string;
    hostname: string | null;
    organization: { name: string };
  };
}

interface Props {
  agents: Agent[];
  alertCounts: { critical: number; high: number; medium: number; low: number };
  recentAlerts: Alert[];
  patchStats: { totalPending: number; totalSecurity: number };
  serviceStats: { total: number; inactive: number };
  urlMonitorStats: { total: number; down: number };
}

const severityConfig: Record<string, { bg: string; text: string; dot: string }> = {
  CRITICAL: { bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400", dot: "bg-red-500" },
  HIGH: { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", dot: "bg-orange-500" },
  MEDIUM: { bg: "bg-yellow-500/10", text: "text-yellow-600 dark:text-yellow-400", dot: "bg-yellow-500" },
  LOW: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", dot: "bg-blue-500" },
  INFO: { bg: "bg-gray-500/10", text: "text-gray-600 dark:text-gray-400", dot: "bg-gray-400" },
};

function isOnline(lastHeartbeat: string | null) {
  if (!lastHeartbeat) return false;
  return Date.now() - new Date(lastHeartbeat).getTime() < 90_000;
}

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function GuardDashboardClient({ agents, alertCounts, recentAlerts, patchStats, serviceStats, urlMonitorStats }: Props) {
  const [alerts, setAlerts] = useState(recentAlerts);
  const [refreshing, setRefreshing] = useState(false);

  const onlineCount = agents.filter((a) => isOnline(a.lastHeartbeat)).length;
  const offlineCount = agents.filter((a) => a.status !== "PENDING" && !isOnline(a.lastHeartbeat)).length;
  const totalAlerts = alertCounts.critical + alertCounts.high + alertCounts.medium + alertCounts.low;
  const totalDevices = agents.reduce((sum, a) => sum + a._count.devices, 0);

  const threatScore = Math.min(alertCounts.critical * 30 + alertCounts.high * 15 + alertCounts.medium * 5, 100);
  const threatLevel = threatScore >= 50 ? "CRITICAL" : threatScore >= 30 ? "HIGH" : threatScore >= 10 ? "ELEVATED" : "LOW";

  async function refresh() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/guard/admin/alerts?status=OPEN&limit=20");
      if (res.ok) setAlerts(await res.json());
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const interval = setInterval(refresh, 10_000);
    return () => clearInterval(interval);
  }, []);

  // Threat ring config
  const ringColor = threatScore >= 50 ? "#ef4444" : threatScore >= 30 ? "#f97316" : threatScore >= 10 ? "#eab308" : "#22c55e";
  const ringBg = threatScore >= 50 ? "rgba(239,68,68,0.1)" : threatScore >= 30 ? "rgba(249,115,22,0.1)" : threatScore >= 10 ? "rgba(234,179,8,0.1)" : "rgba(34,197,94,0.1)";
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (threatScore / 100) * circumference;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5" style={{ color: "var(--text-primary)" }}>
            <div className="p-1.5 rounded-lg" style={{ background: "var(--brand-primary)", color: "white" }}>
              <ShieldCheck className="h-5 w-5" />
            </div>
            Security Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Real-time monitoring across {agents.length} agent{agents.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link href="/portal/admin/guard/deploy">
            <Button size="sm">
              <Rocket className="h-4 w-4 mr-1.5" />
              Deploy Agent
            </Button>
          </Link>
        </div>
      </div>

      {/* Threat Level + Key Stats Row */}
      <div className="grid lg:grid-cols-12 gap-4">
        {/* Threat Level Card */}
        <Card className="lg:col-span-4 overflow-hidden relative">
          <div className="absolute inset-0 opacity-[0.03]" style={{ background: `radial-gradient(circle at 30% 50%, ${ringColor}, transparent 70%)` }} />
          <CardContent className="py-5">
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                <svg width="96" height="96" viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r="40" fill="none" stroke={ringBg} strokeWidth="6" />
                  <circle
                    cx="48" cy="48" r="40" fill="none"
                    stroke={ringColor} strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                    transform="rotate(-90 48 48)"
                    style={{ transition: "stroke-dashoffset 1s ease" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold" style={{ color: ringColor }}>{threatScore}</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Threat Level
                </p>
                <p className="text-xl font-bold mt-0.5" style={{ color: ringColor }}>{threatLevel}</p>
                <div className="mt-2 space-y-0.5">
                  {alertCounts.critical > 0 && (
                    <p className="text-xs font-medium text-red-500">{alertCounts.critical} critical alert{alertCounts.critical > 1 ? "s" : ""}</p>
                  )}
                  {alertCounts.high > 0 && (
                    <p className="text-xs text-orange-500">{alertCounts.high} high severity</p>
                  )}
                  {alertCounts.critical === 0 && alertCounts.high === 0 && (
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>No critical threats</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid — 4 cards */}
        <div className="lg:col-span-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Agents */}
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Server className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                {offlineCount > 0 && (
                  <Badge variant="outline" className="text-[10px] border-red-300 text-red-500 dark:border-red-800">{offlineCount} offline</Badge>
                )}
              </div>
              <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{agents.length}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Total Agents</p>
              <div className="mt-3 flex items-center gap-1.5">
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
                  <div
                    className="h-full rounded-full bg-green-500 transition-all"
                    style={{ width: agents.length ? `${(onlineCount / agents.length) * 100}%` : "0%" }}
                  />
                </div>
                <span className="text-[10px] font-medium text-green-600">{onlineCount} online</span>
              </div>
            </CardContent>
          </Card>

          {/* Open Alerts */}
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                {alertCounts.critical > 0 && (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold" style={{ color: totalAlerts > 0 ? "#ef4444" : "var(--text-primary)" }}>{totalAlerts}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Open Alerts</p>
              <div className="mt-3 flex gap-1.5">
                {alertCounts.critical > 0 && <Badge className="text-[9px] px-1.5 py-0 bg-red-600 text-white hover:bg-red-600">{alertCounts.critical} CRIT</Badge>}
                {alertCounts.high > 0 && <Badge className="text-[9px] px-1.5 py-0 bg-orange-500 text-white hover:bg-orange-500">{alertCounts.high} HIGH</Badge>}
                {alertCounts.medium > 0 && <Badge className="text-[9px] px-1.5 py-0 bg-yellow-500 text-white hover:bg-yellow-500">{alertCounts.medium} MED</Badge>}
              </div>
            </CardContent>
          </Card>

          {/* Patches */}
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Package className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                {patchStats.totalSecurity > 0 && (
                  <Badge variant="outline" className="text-[10px] border-red-300 text-red-500 dark:border-red-800">{patchStats.totalSecurity} security</Badge>
                )}
              </div>
              <p className="text-2xl font-bold" style={{ color: patchStats.totalSecurity > 0 ? "#ef4444" : "var(--text-primary)" }}>
                {patchStats.totalPending}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Pending Patches</p>
              <div className="mt-3">
                <Link href="/portal/admin/guard/patches" className="text-[10px] font-medium hover:underline" style={{ color: "var(--brand-primary)" }}>
                  Manage patches →
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* URL Monitors */}
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-indigo-500/10">
                  <Globe className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                {urlMonitorStats.down > 0 && (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold" style={{ color: urlMonitorStats.down > 0 ? "#ef4444" : "var(--text-primary)" }}>{urlMonitorStats.total}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>URL Monitors</p>
              <div className="mt-3">
                {urlMonitorStats.down > 0 ? (
                  <span className="text-[10px] font-medium text-red-500">{urlMonitorStats.down} endpoint{urlMonitorStats.down > 1 ? "s" : ""} down</span>
                ) : (
                  <span className="text-[10px] font-medium text-green-600">All endpoints healthy</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-md bg-purple-500/10">
                <Wifi className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{totalDevices}</span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>Network Devices</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-md bg-teal-500/10">
                <Activity className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{serviceStats.total}</span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>Services Monitored</span>
                {serviceStats.inactive > 0 && (
                  <Badge variant="outline" className="text-[10px] border-red-300 text-red-500 dark:border-red-800">{serviceStats.inactive} inactive</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-md bg-green-500/10">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{onlineCount}/{agents.length}</span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>Agents Online</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content: Agent Status + Live Feed */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Agent Status */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Server className="h-4 w-4" style={{ color: "var(--brand-primary)" }} />
                Agent Fleet
              </CardTitle>
              <Link href="/portal/admin/guard/agents" className="text-xs font-medium hover:underline" style={{ color: "var(--brand-primary)" }}>
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {agents.length === 0 ? (
                <div className="py-8 text-center">
                  <Server className="h-8 w-8 mx-auto mb-2 opacity-15" />
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>No agents deployed yet</p>
                  <Link href="/portal/admin/guard/deploy">
                    <Button size="sm" variant="outline" className="mt-3">
                      <Rocket className="h-3.5 w-3.5 mr-1.5" />
                      Deploy First Agent
                    </Button>
                  </Link>
                </div>
              ) : (
                agents.slice(0, 8).map((agent) => {
                  const online = isOnline(agent.lastHeartbeat);
                  return (
                    <Link
                      key={agent.id}
                      href={`/portal/admin/guard/agents/${agent.id}`}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors group"
                    >
                      <div className="relative">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "var(--bg-secondary)" }}>
                          <Server className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--bg-primary)] ${online ? "bg-green-500" : agent.status === "PENDING" ? "bg-yellow-500" : "bg-red-500"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                          {agent.name}
                        </p>
                        <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>
                          {agent.hostname || "Pending setup"} · {agent.organization.name}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        {agent._count.alerts > 0 && (
                          <Badge className="text-[9px] px-1.5 py-0 bg-red-600 text-white hover:bg-red-600">
                            {agent._count.alerts}
                          </Badge>
                        )}
                        <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                          {agent.lastHeartbeat ? timeAgo(agent.lastHeartbeat) : "never"}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-50 transition-opacity shrink-0" />
                    </Link>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Live Alert Feed */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" style={{ color: "var(--brand-primary)" }} />
                Live Alert Feed
                {alerts.length > 0 && (
                  <span className="relative flex h-2 w-2 ml-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                )}
              </CardTitle>
              <Link href="/portal/admin/guard/alerts" className="text-xs font-medium hover:underline" style={{ color: "var(--brand-primary)" }}>
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {alerts.length === 0 ? (
                <div className="py-8 text-center">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500 opacity-40" />
                  <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>All clear — no open alerts</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>System is operating normally</p>
                </div>
              ) : (
                alerts.slice(0, 10).map((alert) => {
                  const config = severityConfig[alert.severity] || severityConfig.INFO;
                  return (
                    <Link
                      key={alert.id}
                      href={`/portal/admin/guard/alerts/${alert.id}`}
                      className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors group"
                    >
                      <div className={`p-1.5 rounded-md shrink-0 mt-0.5 ${config.bg}`}>
                        <AlertTriangle className={`h-3.5 w-3.5 ${config.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                            {alert.title}
                          </p>
                          <Badge className={`text-[9px] px-1.5 py-0 shrink-0 ${config.bg} ${config.text} border-0`}>
                            {alert.severity}
                          </Badge>
                        </div>
                        <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
                          {alert.agent.name} ({alert.agent.hostname}) · {alert.agent.organization.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                          {timeAgo(alert.createdAt)}
                        </span>
                        <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-50 transition-opacity" />
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
