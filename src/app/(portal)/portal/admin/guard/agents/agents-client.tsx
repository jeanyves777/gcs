"use client";

import { useState } from "react";
import Link from "next/link";
import { Server, Wifi, AlertTriangle, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";


interface Agent {
  id: string;
  name: string;
  hostname: string | null;
  ipAddress: string | null;
  os: string | null;
  status: string;
  lastHeartbeat: string | null;
  createdAt: string;
  organization: { id: string; name: string };
  _count: { alerts: number; devices: number };
}

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

const statusFilters = ["ALL", "ONLINE", "OFFLINE", "PENDING"] as const;

export function AgentsClient({ agents }: { agents: Agent[] }) {
  const [filter, setFilter] = useState<string>("ALL");

  const filtered = agents.filter((a) => {
    if (filter === "ALL") return true;
    if (filter === "ONLINE") return isOnline(a.lastHeartbeat);
    if (filter === "OFFLINE") return a.status !== "PENDING" && !isOnline(a.lastHeartbeat);
    if (filter === "PENDING") return a.status === "PENDING";
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5" style={{ color: "var(--text-primary)" }}>
            <div className="p-1.5 rounded-lg" style={{ background: "var(--brand-primary)", color: "white" }}>
              <Server className="h-5 w-5" />
            </div>
            Agents
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {agents.length} agent{agents.length !== 1 ? "s" : ""} deployed
          </p>
        </div>
        <Link href="/portal/admin/guard/deploy">
          <Button size="sm">Deploy New Agent</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: "var(--bg-secondary)" }}>
        {statusFilters.map((f) => {
          const count =
            f === "ALL"
              ? agents.length
              : f === "ONLINE"
                ? agents.filter((a) => isOnline(a.lastHeartbeat)).length
                : f === "OFFLINE"
                  ? agents.filter((a) => a.status !== "PENDING" && !isOnline(a.lastHeartbeat)).length
                  : agents.filter((a) => a.status === "PENDING").length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {f} ({count})
            </button>
          );
        })}
      </div>

      {/* Agent List */}
      <div className="grid gap-3">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Server className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p style={{ color: "var(--text-muted)" }}>No agents match this filter.</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((agent) => {
            const online = isOnline(agent.lastHeartbeat);
            return (
              <Link key={agent.id} href={`/portal/admin/guard/agents/${agent.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="p-2 rounded-lg" style={{ background: "var(--bg-secondary)" }}>
                            <Server className="h-5 w-5" style={{ color: "var(--text-secondary)" }} />
                          </div>
                          <div
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${
                              online ? "bg-green-500" : agent.status === "PENDING" ? "bg-yellow-500" : "bg-red-500"
                            }`}
                            style={{ borderColor: "var(--bg-primary)" }}
                          />
                        </div>
                        <div>
                          <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
                            {agent.name}
                          </p>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                            {agent.hostname || "Pending first heartbeat"} · {agent.ipAddress || "—"} · {agent.os || "—"}
                          </p>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                            {agent.organization.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {agent._count.alerts > 0 && (
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                            <Badge variant="destructive" className="text-[10px]">
                              {agent._count.alerts}
                            </Badge>
                          </div>
                        )}
                        {agent._count.devices > 0 && (
                          <div className="flex items-center gap-1">
                            <Wifi className="h-3.5 w-3.5" style={{ color: "var(--text-muted)" }} />
                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                              {agent._count.devices}
                            </span>
                          </div>
                        )}
                        <div className="text-right">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              online ? "border-green-500 text-green-600" : agent.status === "PENDING" ? "border-yellow-500 text-yellow-600" : "border-red-500 text-red-600"
                            }`}
                          >
                            {online ? "ONLINE" : agent.status}
                          </Badge>
                          <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                            {agent.lastHeartbeat ? timeAgo(agent.lastHeartbeat) : "Never connected"}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
