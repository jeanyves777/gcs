"use client";

import Link from "next/link";
import { Globe, Activity, Server } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";


interface UrlMonitor {
  id: string;
  url: string;
  name: string;
  isDown: boolean;
  lastStatus: number | null;
  lastResponseMs: number | null;
  lastChecked: string | null;
  downSince: string | null;
  agent: { id: string; name: string; hostname: string | null };
}

interface ServiceStatus {
  id: string;
  serviceName: string;
  isActive: boolean;
  isEnabled: boolean;
  subState: string | null;
  memoryUsage: number | null;
  agent: { id: string; name: string; hostname: string | null };
}

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function formatBytes(bytes: number | null) {
  if (bytes === null || bytes === undefined) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  urlMonitors: UrlMonitor[];
  services: ServiceStatus[];
}

export function MonitoringClient({ urlMonitors, services }: Props) {
  const downMonitors = urlMonitors.filter((m) => m.isDown);
  const upMonitors = urlMonitors.filter((m) => !m.isDown);
  const inactiveServices = services.filter((s) => !s.isActive);
  const activeServices = services.filter((s) => s.isActive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2.5" style={{ color: "var(--text-primary)" }}>
          <div className="p-1.5 rounded-lg" style={{ background: "var(--brand-primary)", color: "white" }}>
            <Activity className="h-5 w-5" />
          </div>
          Monitoring Overview
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          URL monitors and service status across all agents
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{urlMonitors.length}</p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>URL Monitors</p>
              </div>
            </div>
            {downMonitors.length > 0 && (
              <p className="mt-1 text-xs text-red-600 font-medium">{downMonitors.length} DOWN</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Globe className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{upMonitors.length}</p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>URLs Up</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Server className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{services.length}</p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Services Monitored</p>
              </div>
            </div>
            {inactiveServices.length > 0 && (
              <p className="mt-1 text-xs text-red-600 font-medium">{inactiveServices.length} inactive</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{activeServices.length}</p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Services Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* URL Monitors Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" /> URL Monitors
          </CardTitle>
        </CardHeader>
        <CardContent>
          {urlMonitors.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: "var(--text-muted)" }}>
              No URL monitors configured across any agents.
            </p>
          ) : (
            <div className="space-y-2">
              {/* DOWN first */}
              {downMonitors.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-red-600 mb-2 uppercase tracking-wider">Down ({downMonitors.length})</p>
                  {downMonitors.map((mon) => (
                    <div
                      key={mon.id}
                      className="flex items-center justify-between p-2.5 rounded-lg mb-1 border border-red-200 dark:border-red-800"
                      style={{ background: "var(--bg-secondary)" }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Badge className="bg-red-600 text-white shrink-0">DOWN</Badge>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                            {mon.name}
                          </p>
                          <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                            {mon.url}
                          </p>
                          {mon.downSince && (
                            <p className="text-[10px] text-red-500">
                              Down since {new Date(mon.downSince).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Link
                          href={`/portal/admin/guard/agents/${mon.agent.id}`}
                          className="text-xs hover:underline"
                          style={{ color: "var(--brand-primary)" }}
                        >
                          {mon.agent.name}
                        </Link>
                        {mon.lastChecked && (
                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                            {timeAgo(mon.lastChecked)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* UP */}
              {upMonitors.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-green-600 mb-2 uppercase tracking-wider">Up ({upMonitors.length})</p>
                  {upMonitors.map((mon) => (
                    <div
                      key={mon.id}
                      className="flex items-center justify-between p-2.5 rounded-lg mb-1"
                      style={{ background: "var(--bg-secondary)" }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Badge className="bg-green-600 text-white shrink-0">UP</Badge>
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
                        <Link
                          href={`/portal/admin/guard/agents/${mon.agent.id}`}
                          className="text-xs hover:underline"
                          style={{ color: "var(--brand-primary)" }}
                        >
                          {mon.agent.name}
                        </Link>
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Services Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="h-4 w-4" /> Service Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: "var(--text-muted)" }}>
              No services being tracked across any agents.
            </p>
          ) : (
            <div className="space-y-2">
              {/* Inactive first */}
              {inactiveServices.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-red-600 mb-2 uppercase tracking-wider">
                    Inactive ({inactiveServices.length})
                  </p>
                  {inactiveServices.map((svc) => (
                    <div
                      key={svc.id}
                      className="flex items-center justify-between p-2.5 rounded-lg mb-1 border border-red-200 dark:border-red-800"
                      style={{ background: "var(--bg-secondary)" }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                        <div>
                          <p className="text-sm font-medium font-mono" style={{ color: "var(--text-primary)" }}>
                            {svc.serviceName}
                          </p>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                            {svc.subState || "inactive"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Link
                          href={`/portal/admin/guard/agents/${svc.agent.id}`}
                          className="text-xs hover:underline"
                          style={{ color: "var(--brand-primary)" }}
                        >
                          {svc.agent.name}
                        </Link>
                        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                          {formatBytes(svc.memoryUsage)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Active */}
              {activeServices.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-green-600 mb-2 uppercase tracking-wider">
                    Active ({activeServices.length})
                  </p>
                  {activeServices.map((svc) => (
                    <div
                      key={svc.id}
                      className="flex items-center justify-between p-2.5 rounded-lg mb-1"
                      style={{ background: "var(--bg-secondary)" }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                        <div>
                          <p className="text-sm font-medium font-mono" style={{ color: "var(--text-primary)" }}>
                            {svc.serviceName}
                          </p>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                            {svc.subState || "running"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Link
                          href={`/portal/admin/guard/agents/${svc.agent.id}`}
                          className="text-xs hover:underline"
                          style={{ color: "var(--brand-primary)" }}
                        >
                          {svc.agent.name}
                        </Link>
                        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                          {formatBytes(svc.memoryUsage)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
