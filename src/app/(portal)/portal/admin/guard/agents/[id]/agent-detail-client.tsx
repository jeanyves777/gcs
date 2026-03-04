"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Server, Activity, AlertTriangle, Terminal, Wifi,
  Printer, Phone, Monitor, HelpCircle, Camera, Cpu, Send,
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

const tabs = ["Metrics", "Alerts", "Devices", "Commands"] as const;

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

export function AgentDetailClient({ agent, metrics }: { agent: Agent; metrics: Metric[] }) {
  const [activeTab, setActiveTab] = useState<string>("Metrics");
  const [cmdType, setCmdType] = useState("BLOCK_IP");
  const [cmdPayload, setCmdPayload] = useState("");
  const [sending, setSending] = useState(false);
  const online = isOnline(agent.lastHeartbeat);

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
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: "var(--bg-secondary)" }}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
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
          </button>
        ))}
      </div>

      {/* Tab Content */}
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
    </div>
  );
}
