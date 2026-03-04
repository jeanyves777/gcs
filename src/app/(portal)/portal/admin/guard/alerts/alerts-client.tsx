"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, ChevronRight, Filter, CheckCircle2,
  XOctagon, Search, ShieldAlert, Clock, Brain, Eye,
} from "lucide-react";
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

const severityConfig: Record<string, { bg: string; text: string; badge: string; dot: string }> = {
  CRITICAL: { bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400", badge: "bg-red-600 text-white hover:bg-red-600", dot: "bg-red-500" },
  HIGH: { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", badge: "bg-orange-500 text-white hover:bg-orange-500", dot: "bg-orange-500" },
  MEDIUM: { bg: "bg-yellow-500/10", text: "text-yellow-600 dark:text-yellow-400", badge: "bg-yellow-500 text-white hover:bg-yellow-500", dot: "bg-yellow-500" },
  LOW: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", badge: "bg-blue-500 text-white hover:bg-blue-500", dot: "bg-blue-500" },
  INFO: { bg: "bg-gray-500/10", text: "text-gray-600 dark:text-gray-400", badge: "bg-gray-400 text-white hover:bg-gray-400", dot: "bg-gray-400" },
};

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  OPEN: { label: "Open", icon: AlertTriangle, color: "text-red-500" },
  INVESTIGATING: { label: "Investigating", icon: Search, color: "text-yellow-600" },
  RESOLVED: { label: "Resolved", icon: CheckCircle2, color: "text-green-600" },
  FALSE_POSITIVE: { label: "False Positive", icon: XOctagon, color: "text-gray-500" },
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

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
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

  // Count alerts by severity (open only)
  const openAlerts = alerts.filter((a) => a.status === "OPEN");
  const criticalCount = openAlerts.filter((a) => a.severity === "CRITICAL").length;
  const highCount = openAlerts.filter((a) => a.severity === "HIGH").length;
  const mediumCount = openAlerts.filter((a) => a.severity === "MEDIUM").length;
  const lowCount = openAlerts.filter((a) => a.severity === "LOW").length;

  const allSelected = filtered.length > 0 && filtered.every((a) => selected.has(a.id));

  function toggleSelectAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((a) => a.id)));
    }
  }

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5" style={{ color: "var(--text-primary)" }}>
            <div className="p-1.5 rounded-lg" style={{ background: "var(--brand-primary)", color: "white" }}>
              <ShieldAlert className="h-5 w-5" />
            </div>
            Alert Center
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {alerts.length} total alert{alerts.length !== 1 ? "s" : ""} · {openAlerts.length} open
          </p>
        </div>
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{selected.size} selected</span>
            <Button size="sm" variant="outline" onClick={() => bulkAction("RESOLVED")}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              Resolve
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkAction("FALSE_POSITIVE")}>
              <XOctagon className="h-3.5 w-3.5 mr-1.5" />
              False Positive
            </Button>
          </div>
        )}
      </div>

      {/* Severity Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Critical", count: criticalCount, color: "red", icon: AlertTriangle },
          { label: "High", count: highCount, color: "orange", icon: AlertTriangle },
          { label: "Medium", count: mediumCount, color: "yellow", icon: AlertTriangle },
          { label: "Low", count: lowCount, color: "blue", icon: AlertTriangle },
        ].map(({ label, count, color, icon: Icon }) => (
          <button
            key={label}
            onClick={() => {
              setSeverityFilter(severityFilter === label.toUpperCase() ? "ALL" : label.toUpperCase());
              setStatusFilter("OPEN");
            }}
            className={`text-left rounded-xl border p-3 transition-all ${
              severityFilter === label.toUpperCase()
                ? `ring-2 ring-${color}-500/50 border-${color}-300 dark:border-${color}-700`
                : "hover:border-[var(--border-hover)]"
            }`}
            style={{ background: "var(--bg-primary)", borderColor: severityFilter === label.toUpperCase() ? undefined : "var(--border)" }}
          >
            <div className="flex items-center justify-between">
              <div className={`p-1.5 rounded-md bg-${color}-500/10`}>
                <Icon className={`h-3.5 w-3.5 text-${color}-600 dark:text-${color}-400`} />
              </div>
              {count > 0 && (
                <span className={`relative flex h-2 w-2`}>
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-${color}-400 opacity-75`} />
                  <span className={`relative inline-flex rounded-full h-2 w-2 bg-${color}-500`} />
                </span>
              )}
            </div>
            <p className="text-2xl font-bold mt-2" style={{ color: count > 0 ? undefined : "var(--text-primary)" }}>
              <span className={count > 0 ? `text-${color}-600 dark:text-${color}-400` : ""}>{count}</span>
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-3">
          {/* Status Filter */}
          <div className="flex gap-0.5 p-1 rounded-lg" style={{ background: "var(--bg-secondary)" }}>
            {filters.map((f) => {
              const cfg = f !== "ALL" ? statusConfig[f] : null;
              const count = f === "ALL" ? alerts.length : alerts.filter((a) => a.status === f).length;
              return (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    statusFilter === f
                      ? "shadow-sm"
                      : "hover:text-[var(--text-primary)]"
                  }`}
                  style={
                    statusFilter === f
                      ? { background: "var(--bg-primary)", color: "var(--text-primary)" }
                      : { color: "var(--text-secondary)" }
                  }
                >
                  {cfg && <cfg.icon className={`h-3 w-3 ${statusFilter === f ? cfg.color : ""}`} />}
                  {f === "FALSE_POSITIVE" ? "False Pos." : f.charAt(0) + f.slice(1).toLowerCase()}
                  {count > 0 && (
                    <span className="text-[10px] opacity-60">({count})</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Severity Filter */}
          <div className="flex gap-0.5 p-1 rounded-lg" style={{ background: "var(--bg-secondary)" }}>
            <Filter className="h-3.5 w-3.5 self-center mx-1.5" style={{ color: "var(--text-muted)" }} />
            {severityFilters.map((f) => (
              <button
                key={f}
                onClick={() => setSeverityFilter(f)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                  severityFilter === f
                    ? "shadow-sm"
                    : "hover:text-[var(--text-primary)]"
                }`}
                style={
                  severityFilter === f
                    ? { background: "var(--bg-primary)", color: "var(--text-primary)" }
                    : { color: "var(--text-secondary)" }
                }
              >
                {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Alert List */}
      <div className="space-y-2">
        {/* Select All header */}
        {filtered.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-1.5">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="rounded"
            />
            <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Select all ({filtered.length})
            </span>
          </div>
        )}

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-500 opacity-30" />
              <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                No alerts match your filters
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Try adjusting your filter criteria
              </p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((alert) => {
            const sev = severityConfig[alert.severity] || severityConfig.INFO;
            const stat = statusConfig[alert.status];
            return (
              <Card
                key={alert.id}
                className={`transition-all hover:shadow-sm ${
                  selected.has(alert.id) ? "ring-1 ring-[var(--brand-primary)]" : ""
                }`}
                style={
                  alert.severity === "CRITICAL"
                    ? { borderLeftWidth: "3px", borderLeftColor: "#ef4444" }
                    : alert.severity === "HIGH"
                    ? { borderLeftWidth: "3px", borderLeftColor: "#f97316" }
                    : undefined
                }
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div className="pt-0.5">
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
                    </div>

                    {/* Severity Icon */}
                    <div className={`p-1.5 rounded-md shrink-0 mt-0.5 ${sev.bg}`}>
                      <AlertTriangle className={`h-3.5 w-3.5 ${sev.text}`} />
                    </div>

                    {/* Content */}
                    <Link href={`/portal/admin/guard/alerts/${alert.id}`} className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                          {alert.title}
                        </p>
                        <Badge className={`text-[9px] px-1.5 py-0 shrink-0 ${sev.badge}`}>
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="text-[11px] mt-1 truncate" style={{ color: "var(--text-muted)" }}>
                        <span className="font-medium" style={{ color: "var(--text-secondary)" }}>{alert.type}</span>
                        {" · "}
                        {alert.agent.name} ({alert.agent.hostname})
                        {" · "}
                        {alert.agent.organization.name}
                      </p>
                    </Link>

                    {/* Right side: status + metadata */}
                    <div className="flex items-center gap-3 shrink-0">
                      {alert.aiAnalysis && (
                        <Badge variant="outline" className="text-[10px] border-purple-300 text-purple-600 dark:border-purple-700 dark:text-purple-400 gap-1">
                          <Brain className="h-2.5 w-2.5" />
                          AI
                        </Badge>
                      )}
                      {stat && (
                        <div className={`flex items-center gap-1 ${stat.color}`}>
                          <stat.icon className="h-3 w-3" />
                          <span className="text-[10px] font-medium">{stat.label}</span>
                        </div>
                      )}
                      <div className="text-right">
                        <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                          {timeAgo(alert.createdAt)}
                        </p>
                        <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                          {formatDate(alert.createdAt)}
                        </p>
                      </div>
                      <Link href={`/portal/admin/guard/alerts/${alert.id}`}>
                        <ChevronRight className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
