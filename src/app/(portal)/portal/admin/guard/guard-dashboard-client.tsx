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

const severityColors: Record<string, string> = {
  CRITICAL: "bg-red-600 text-white",
  HIGH: "bg-orange-500 text-white",
  MEDIUM: "bg-yellow-500 text-white",
  LOW: "bg-blue-500 text-white",
  INFO: "bg-gray-400 text-white",
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
  const threatColor = threatScore >= 50 ? "text-red-500" : threatScore >= 30 ? "text-orange-500" : threatScore >= 10 ? "text-yellow-500" : "text-green-500";

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <ShieldCheck className="h-7 w-7" style={{ color: "var(--brand-primary)" }} />
            GcsGuard
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            AI-Powered Security Operations Center
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link href="/portal/admin/guard/deploy">
            <Button size="sm">
              <Rocket className="h-4 w-4 mr-1" />
              Deploy Agent
            </Button>
          </Link>
        </div>
      </div>

      {/* Threat Level Banner */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center border-4"
                style={{
                  borderColor: threatScore >= 50 ? "#ef4444" : threatScore >= 30 ? "#f97316" : threatScore >= 10 ? "#eab308" : "#22c55e",
                }}
              >
                <span className={`text-xl font-bold ${threatColor}`}>{threatScore}</span>
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                  Threat Level
                </p>
                <p className={`text-2xl font-bold ${threatColor}`}>{threatLevel}</p>
              </div>
            </div>
            <div className="text-right text-sm" style={{ color: "var(--text-secondary)" }}>
              {alertCounts.critical > 0 && (
                <p className="text-red-500 font-semibold">{alertCounts.critical} critical alert{alertCounts.critical > 1 ? "s" : ""}</p>
              )}
              {alertCounts.high > 0 && (
                <p className="text-orange-500">{alertCounts.high} high severity</p>
              )}
              <p>{agents.length} agent{agents.length !== 1 ? "s" : ""} monitored</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid — 7 cards in a responsive grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Server className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{agents.length}</p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Total Agents</p>
              </div>
            </div>
            <div className="mt-2 flex gap-2 text-xs">
              <span className="text-green-600">{onlineCount} online</span>
              {offlineCount > 0 && <span className="text-red-500">{offlineCount} offline</span>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{totalAlerts}</p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Open Alerts</p>
              </div>
            </div>
            <div className="mt-2 flex gap-2 text-xs">
              {alertCounts.critical > 0 && <span className="text-red-600">{alertCounts.critical} critical</span>}
              {alertCounts.high > 0 && <span className="text-orange-500">{alertCounts.high} high</span>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{onlineCount}</p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Agents Online</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Wifi className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{totalDevices}</p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Network Devices</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* New: Pending Patches */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Package className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${patchStats.totalSecurity > 0 ? "text-red-600" : ""}`} style={patchStats.totalSecurity === 0 ? { color: "var(--text-primary)" } : undefined}>
                  {patchStats.totalPending}
                </p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Pending Patches</p>
              </div>
            </div>
            {patchStats.totalSecurity > 0 && (
              <p className="mt-2 text-xs text-red-600 font-medium">{patchStats.totalSecurity} security</p>
            )}
          </CardContent>
        </Card>

        {/* New: Services */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30">
                <Activity className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{serviceStats.total}</p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Services</p>
              </div>
            </div>
            {serviceStats.inactive > 0 && (
              <p className="mt-2 text-xs text-red-600 font-medium">{serviceStats.inactive} inactive</p>
            )}
          </CardContent>
        </Card>

        {/* New: URL Monitors */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                <Globe className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{urlMonitorStats.total}</p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>URL Monitors</p>
              </div>
            </div>
            {urlMonitorStats.down > 0 && (
              <p className="mt-2 text-xs text-red-600 font-medium">{urlMonitorStats.down} DOWN</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Agent Status */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Agent Status</CardTitle>
              <Link href="/portal/admin/guard/agents" className="text-xs hover:underline" style={{ color: "var(--brand-primary)" }}>
                View all <ChevronRight className="inline h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {agents.length === 0 ? (
                <p className="text-sm py-4 text-center" style={{ color: "var(--text-muted)" }}>
                  No agents deployed yet.{" "}
                  <Link href="/portal/admin/guard/deploy" className="underline" style={{ color: "var(--brand-primary)" }}>
                    Deploy your first agent
                  </Link>
                </p>
              ) : (
                agents.slice(0, 8).map((agent) => (
                  <Link
                    key={agent.id}
                    href={`/portal/admin/guard/agents/${agent.id}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${isOnline(agent.lastHeartbeat) ? "bg-green-500" : agent.status === "PENDING" ? "bg-yellow-500" : "bg-red-500"}`}
                      />
                      <div>
                        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          {agent.name}
                        </p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {agent.hostname || "Pending setup"} · {agent.organization.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {agent._count.alerts > 0 && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          {agent._count.alerts}
                        </Badge>
                      )}
                      <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {agent.lastHeartbeat ? timeAgo(agent.lastHeartbeat) : "never"}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Alert Feed */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Live Alert Feed</CardTitle>
              <Link href="/portal/admin/guard/alerts" className="text-xs hover:underline" style={{ color: "var(--brand-primary)" }}>
                View all <ChevronRight className="inline h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.length === 0 ? (
                <p className="text-sm py-8 text-center" style={{ color: "var(--text-muted)" }}>
                  No open alerts. All systems secure.
                </p>
              ) : (
                alerts.slice(0, 10).map((alert) => (
                  <Link
                    key={alert.id}
                    href={`/portal/admin/guard/alerts/${alert.id}`}
                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    <Badge className={`text-[10px] shrink-0 mt-0.5 ${severityColors[alert.severity] || ""}`}>
                      {alert.severity}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                        {alert.title}
                      </p>
                      <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                        {alert.agent.name} ({alert.agent.hostname}) · {alert.agent.organization.name}
                      </p>
                    </div>
                    <span className="text-[10px] shrink-0" style={{ color: "var(--text-muted)" }}>
                      {timeAgo(alert.createdAt)}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
