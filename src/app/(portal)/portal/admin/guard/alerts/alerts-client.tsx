"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronRight, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { toast } from "sonner";

interface Alert {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  status: string;
  aiAnalysis: string | null;
  createdAt: string;
  agent: {
    id: string;
    name: string;
    hostname: string | null;
    organization: { name: string };
  };
}

const severityColors: Record<string, string> = {
  CRITICAL: "bg-red-600 text-white",
  HIGH: "bg-orange-500 text-white",
  MEDIUM: "bg-yellow-500 text-white",
  LOW: "bg-blue-500 text-white",
  INFO: "bg-gray-400 text-white",
};

const statusColors: Record<string, string> = {
  OPEN: "border-red-500 text-red-600",
  INVESTIGATING: "border-yellow-500 text-yellow-600",
  RESOLVED: "border-green-500 text-green-600",
  FALSE_POSITIVE: "border-gray-400 text-gray-500",
};

const filters = ["ALL", "OPEN", "INVESTIGATING", "RESOLVED", "FALSE_POSITIVE"] as const;
const severityFilters = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function AlertsClient({ alerts: initialAlerts }: { alerts: Alert[] }) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [statusFilter, setStatusFilter] = useState<string>("OPEN");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = alerts.filter((a) => {
    if (statusFilter !== "ALL" && a.status !== statusFilter) return false;
    if (severityFilter !== "ALL" && a.severity !== severityFilter) return false;
    return true;
  });

  async function bulkAction(action: "RESOLVED" | "FALSE_POSITIVE") {
    const ids = Array.from(selected);
    for (const id of ids) {
      await fetch(`/api/guard/admin/alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });
    }
    setAlerts((prev) => prev.map((a) => (selected.has(a.id) ? { ...a, status: action } : a)));
    setSelected(new Set());
    toast.success(`${ids.length} alert${ids.length > 1 ? "s" : ""} updated`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <AlertTriangle className="h-6 w-6" style={{ color: "var(--brand-primary)" }} />
            Alert Center
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {alerts.filter((a) => a.status === "OPEN").length} open alerts
          </p>
        </div>
        {selected.size > 0 && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => bulkAction("RESOLVED")}>
              Resolve ({selected.size})
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkAction("FALSE_POSITIVE")}>
              False Positive ({selected.size})
            </Button>
          </div>
        )}
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "var(--bg-secondary)" }}>
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                statusFilter === f
                  ? "bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-secondary)]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "var(--bg-secondary)" }}>
          <Filter className="h-4 w-4 self-center mx-1" style={{ color: "var(--text-muted)" }} />
          {severityFilters.map((f) => (
            <button
              key={f}
              onClick={() => setSeverityFilter(f)}
              className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                severityFilter === f
                  ? "bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-secondary)]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Alert List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p style={{ color: "var(--text-muted)" }}>No alerts match your filters.</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((alert) => (
            <Card key={alert.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(alert.id)}
                    onChange={(e) => {
                      const next = new Set(selected);
                      e.target.checked ? next.add(alert.id) : next.delete(alert.id);
                      setSelected(next);
                    }}
                    className="rounded"
                  />
                  <Badge className={`text-[10px] shrink-0 ${severityColors[alert.severity] || ""}`}>
                    {alert.severity}
                  </Badge>
                  <Link href={`/portal/admin/guard/alerts/${alert.id}`} className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                      {alert.title}
                    </p>
                    <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                      {alert.type} · {alert.agent.name} ({alert.agent.hostname}) · {alert.agent.organization.name}
                    </p>
                  </Link>
                  <div className="flex items-center gap-2 shrink-0">
                    {alert.aiAnalysis && (
                      <Badge variant="outline" className="text-[10px] border-purple-500 text-purple-600">AI Analyzed</Badge>
                    )}
                    <Badge variant="outline" className={`text-[10px] ${statusColors[alert.status] || ""}`}>
                      {alert.status}
                    </Badge>
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      {timeAgo(alert.createdAt)}
                    </span>
                    <Link href={`/portal/admin/guard/alerts/${alert.id}`}>
                      <ChevronRight className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
