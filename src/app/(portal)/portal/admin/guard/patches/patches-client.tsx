"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Package, Shield, Server, RefreshCw, AlertTriangle, Search,
  Download, Trash2, ArrowUpCircle, CheckCircle2, XCircle, Clock,
  Filter, ChevronLeft, ChevronRight, RotateCcw, Play, History,
  Boxes, LayoutDashboard, Terminal, Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AgentSummary {
  id: string;
  name: string;
  hostname: string | null;
  ipAddress: string | null;
  os: string | null;
  distro: string | null;
  distroVersion: string | null;
  packageManager: string | null;
  status: string;
  pendingUpdates: number;
  securityUpdates: number;
  lastPatchCheck: string | null;
  organization: { id: string; name: string };
  _count: { packages: number };
}

interface PackageItem {
  id: string;
  name: string;
  version: string;
  newVersion: string | null;
  source: string;
  isSecurityUpdate: boolean;
  status: string;
  lastChecked: string;
  agent: { id: string; name: string; hostname: string | null };
}

interface PatchHistoryItem {
  id: string;
  packageName: string;
  fromVersion: string;
  toVersion: string;
  source: string;
  status: string;
  output: string | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
  agent: { id: string; name: string; hostname: string | null };
  approvedBy: { name: string } | null;
}

interface TrackedCommand {
  id: string;
  type: string;
  payload: string;
  status: string;
  result: string | null;
  createdAt: string;
  sentAt: string | null;
  completedAt: string | null;
  agent: { id: string; name: string; hostname: string | null };
  createdBy: { name: string };
}

interface Props {
  agents: AgentSummary[];
  totalPending: number;
  totalSecurity: number;
}

type Tab = "overview" | "packages" | "history";

// ─── Component ──────────────────────────────────────────────────────────────

export function PatchesClient({ agents: initialAgents, totalPending: initPending, totalSecurity: initSecurity }: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const [agents, setAgents] = useState<AgentSummary[]>(initialAgents);
  const [totalPending, setTotalPending] = useState(initPending);
  const [totalSecurity, setTotalSecurity] = useState(initSecurity);
  const [totalPackages, setTotalPackages] = useState(0);
  const [recentHistory, setRecentHistory] = useState<PatchHistoryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Packages tab state
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [pkgSearch, setPkgSearch] = useState("");
  const [pkgAgent, setPkgAgent] = useState("");
  const [pkgStatus, setPkgStatus] = useState("");
  const [pkgSource, setPkgSource] = useState("");
  const [pkgSecurityOnly, setPkgSecurityOnly] = useState(false);
  const [pkgPage, setPkgPage] = useState(1);
  const [pkgTotal, setPkgTotal] = useState(0);
  const [pkgTotalPages, setPkgTotalPages] = useState(1);

  // History tab state
  const [history, setHistory] = useState<PatchHistoryItem[]>([]);
  const [histAgent, setHistAgent] = useState("");
  const [histStatus, setHistStatus] = useState("");
  const [histPage, setHistPage] = useState(1);
  const [histTotal, setHistTotal] = useState(0);
  const [histTotalPages, setHistTotalPages] = useState(1);

  // Selected packages for bulk actions
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Action in progress
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Install new package
  const [installAgent, setInstallAgent] = useState("");
  const [installPkgName, setInstallPkgName] = useState("");

  // Live command tracking
  const [trackedIds, setTrackedIds] = useState<string[]>([]);
  const [trackedCommands, setTrackedCommands] = useState<TrackedCommand[]>([]);
  const [showTracker, setShowTracker] = useState(false);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/guard/admin/patches?view=overview");
      const data = await res.json();
      setAgents(data.agents || []);
      setTotalPending(data.summary?.totalPending || 0);
      setTotalSecurity(data.summary?.totalSecurity || 0);
      setTotalPackages(data.summary?.totalPackages || 0);
      setRecentHistory(data.recentHistory || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ view: "packages", page: String(pkgPage), limit: "50" });
      if (pkgSearch) params.set("search", pkgSearch);
      if (pkgAgent) params.set("agentId", pkgAgent);
      if (pkgStatus) params.set("status", pkgStatus);
      if (pkgSource) params.set("source", pkgSource);
      if (pkgSecurityOnly) params.set("securityOnly", "true");

      const res = await fetch(`/api/guard/admin/patches?${params}`);
      const data = await res.json();
      setPackages(data.packages || []);
      setPkgTotal(data.total || 0);
      setPkgTotalPages(data.totalPages || 1);
    } catch { /* ignore */ }
    setLoading(false);
  }, [pkgSearch, pkgAgent, pkgStatus, pkgSource, pkgSecurityOnly, pkgPage]);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ view: "history", page: String(histPage), limit: "50" });
      if (histAgent) params.set("agentId", histAgent);
      if (histStatus) params.set("status", histStatus);

      const res = await fetch(`/api/guard/admin/patches?${params}`);
      const data = await res.json();
      setHistory(data.history || []);
      setHistTotal(data.total || 0);
      setHistTotalPages(data.totalPages || 1);
    } catch { /* ignore */ }
    setLoading(false);
  }, [histAgent, histStatus, histPage]);

  useEffect(() => {
    if (tab === "overview") fetchOverview();
  }, [tab, fetchOverview]);

  useEffect(() => {
    if (tab === "packages") fetchPackages();
  }, [tab, fetchPackages]);

  useEffect(() => {
    if (tab === "history") fetchHistory();
  }, [tab, fetchHistory]);

  // Auto-refresh after commands complete (polls until package counts change)
  const [postRefreshCount, setPostRefreshCount] = useState(0);

  // Poll tracked commands every 3s while any are active
  useEffect(() => {
    if (trackedIds.length === 0) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/guard/admin/patches?view=commands&ids=${trackedIds.join(",")}`);
        const data = await res.json();
        const cmds: TrackedCommand[] = data.commands || [];
        setTrackedCommands(cmds);

        // Check if all are done
        const allDone = cmds.every((c) => c.status === "COMPLETED" || c.status === "FAILED");
        if (allDone && cmds.length > 0) {
          // Notify
          const failed = cmds.filter((c) => c.status === "FAILED");
          const completed = cmds.filter((c) => c.status === "COMPLETED");
          if (failed.length > 0) toast.error(`${failed.length} command(s) failed`);
          if (completed.length > 0) {
            toast.success(`${completed.length} command(s) completed — refreshing inventory...`);
          }
          // Stop command polling, start post-refresh polling
          setTrackedIds([]);
          setPostRefreshCount(8); // Poll 8 times (every 5s = 40s window for package refresh)
        }
      } catch { /* ignore */ }
    };

    poll(); // immediate first poll
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [trackedIds]);

  // Post-completion refresh: keep polling overview until counts update
  useEffect(() => {
    if (postRefreshCount <= 0) return;

    const refresh = async () => {
      await fetchOverview();
      if (tab === "packages") await fetchPackages();
      if (tab === "history") await fetchHistory();
      setPostRefreshCount((c) => c - 1);
    };

    refresh(); // immediate
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [postRefreshCount, tab, fetchOverview, fetchPackages, fetchHistory]);

  function trackCommand(commandId: string) {
    setTrackedIds((prev) => [...prev, commandId]);
    setShowTracker(true);
  }

  // ─── Actions ─────────────────────────────────────────────────────────────

  async function refreshAllAgents() {
    setRefreshing(true);
    try {
      const results = await Promise.allSettled(
        agents.map((a) =>
          fetch(`/api/guard/admin/agents/${a.id}/packages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "refresh" }),
          })
        )
      );
      const success = results.filter((r) => r.status === "fulfilled").length;
      toast.success(`Package refresh queued for ${success} agent${success !== 1 ? "s" : ""}`);
      setTimeout(fetchOverview, 2000);
    } finally {
      setRefreshing(false);
    }
  }

  async function upgradeAgent(agentId: string, type: "security" | "all") {
    setActionLoading(agentId);
    try {
      const res = await fetch(`/api/guard/admin/agents/${agentId}/patches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "upgrade", type }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`${type === "security" ? "Security" : "Full"} upgrade queued`);
        if (data.command?.id) trackCommand(data.command.id);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to queue upgrade");
      }
    } catch {
      toast.error("Network error");
    }
    setActionLoading(null);
  }

  async function installPackages(agentId: string, pkgNames: string[]) {
    setActionLoading(agentId);
    try {
      const res = await fetch(`/api/guard/admin/agents/${agentId}/patches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "install", packages: pkgNames }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Install queued: ${pkgNames.join(", ")}`);
        if (data.command?.id) trackCommand(data.command.id);
        if (tab === "packages") fetchPackages();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to queue install");
      }
    } catch {
      toast.error("Network error");
    }
    setActionLoading(null);
  }

  async function uninstallPackages(agentId: string, pkgNames: string[]) {
    setActionLoading(agentId);
    try {
      const res = await fetch(`/api/guard/admin/agents/${agentId}/patches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "uninstall", packages: pkgNames }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Uninstall queued: ${pkgNames.join(", ")}`);
        if (data.command?.id) trackCommand(data.command.id);
        if (tab === "packages") fetchPackages();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to queue uninstall");
      }
    } catch {
      toast.error("Network error");
    }
    setActionLoading(null);
  }

  async function bulkUpdateSelected() {
    if (selected.size === 0) return;
    setActionLoading("bulk");

    // Group by agent
    const byAgent = new Map<string, string[]>();
    for (const pkgId of selected) {
      const pkg = packages.find((p) => p.id === pkgId);
      if (!pkg || pkg.status !== "UPDATE_AVAILABLE") continue;
      const list = byAgent.get(pkg.agent.id) || [];
      list.push(pkg.name);
      byAgent.set(pkg.agent.id, list);
    }

    let success = 0;
    for (const [agentId, pkgNames] of byAgent) {
      try {
        const res = await fetch(`/api/guard/admin/agents/${agentId}/patches`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "install", packages: pkgNames }),
        });
        if (res.ok) {
          const data = await res.json();
          success += pkgNames.length;
          if (data.command?.id) trackCommand(data.command.id);
        }
      } catch { /* ignore */ }
    }

    toast.success(`Update queued for ${success} package${success !== 1 ? "s" : ""}`);
    setSelected(new Set());
    setActionLoading(null);
    fetchPackages();
  }

  async function handleInstallNew() {
    if (!installAgent || !installPkgName.trim()) {
      toast.error("Select an agent and enter package name(s)");
      return;
    }
    const pkgNames = installPkgName.split(/[,\s]+/).filter(Boolean);
    await installPackages(installAgent, pkgNames);
    setInstallPkgName("");
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAllUpdatable() {
    const updatable = packages.filter((p) => p.status === "UPDATE_AVAILABLE").map((p) => p.id);
    setSelected(new Set(updatable));
  }

  const statusBadge = (status: string) => {
    const map: Record<string, { color: string; label: string }> = {
      INSTALLED: { color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", label: "Installed" },
      UPDATE_AVAILABLE: { color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", label: "Update Available" },
      UPDATING: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", label: "Updating" },
      UPDATED: { color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", label: "Updated" },
    };
    const s = map[status] || { color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400", label: status };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>;
  };

  const historyStatusBadge = (status: string) => {
    const map: Record<string, { color: string; icon: React.ReactNode }> = {
      PENDING: { color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", icon: <Clock className="h-3 w-3 mr-1" /> },
      APPROVED: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
      INSTALLING: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: <Loader2 className="h-3 w-3 mr-1 animate-spin" /> },
      COMPLETED: { color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
      FAILED: { color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: <XCircle className="h-3 w-3 mr-1" /> },
      ROLLED_BACK: { color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", icon: <RotateCcw className="h-3 w-3 mr-1" /> },
    };
    const s = map[status] || { color: "bg-gray-100 text-gray-700", icon: null };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>{s.icon}{status}</span>;
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: "packages", label: "All Packages", icon: <Boxes className="h-4 w-4" /> },
    { id: "history", label: "Patch History", icon: <History className="h-4 w-4" /> },
  ];

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5" style={{ color: "var(--text-primary)" }}>
            <div className="p-2 rounded-xl" style={{ background: "var(--brand-primary)", color: "white" }}>
              <Package className="h-5 w-5" />
            </div>
            Patch Management
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Manage packages, updates, and system upgrades across all agents
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refreshAllAgents} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh All Agents
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <ArrowUpCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{totalPending}</p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Pending Updates</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${totalSecurity > 0 ? "text-red-600" : ""}`}
                   style={totalSecurity === 0 ? { color: "var(--text-primary)" } : undefined}>
                  {totalSecurity}
                </p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Security Updates</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Boxes className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{totalPackages}</p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Total Packages</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Command Tracker */}
      {(showTracker && trackedCommands.length > 0) && (
        <Card className="border-2" style={{ borderColor: "var(--brand-primary)" }}>
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <Terminal className="h-4 w-4" />
                Live Command Status
                {trackedCommands.some((c) => c.status === "PENDING" || c.status === "SENT" || c.status === "EXECUTING") && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: "var(--brand-primary)" }} />
                )}
              </h3>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => { setShowTracker(false); setTrackedIds([]); setTrackedCommands([]); }}>
                <XCircle className="h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-2">
              {trackedCommands.map((cmd) => (
                <CommandStatusRow key={cmd.id} cmd={cmd} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: "var(--bg-secondary)" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              tab === t.id
                ? "bg-white dark:bg-zinc-800 shadow-sm"
                : "hover:bg-white/50 dark:hover:bg-zinc-700/50"
            }`}
            style={{ color: tab === t.id ? "var(--text-primary)" : "var(--text-secondary)" }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--brand-primary)" }} />
        </div>
      )}

      {/* ═══ Overview Tab ═══ */}
      {tab === "overview" && !loading && (
        <div className="space-y-4">
          {/* Install New Package */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <Download className="h-4 w-4" />
                Install New Package
              </h3>
              <div className="flex flex-wrap gap-2">
                <select
                  value={installAgent}
                  onChange={(e) => setInstallAgent(e.target.value)}
                  className="h-9 rounded-md border px-3 text-sm"
                  style={{ background: "var(--bg-primary)", color: "var(--text-primary)", borderColor: "var(--border-primary)" }}
                >
                  <option value="">Select Agent</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.hostname || a.ipAddress || "—"})
                    </option>
                  ))}
                </select>
                <Input
                  placeholder="Package name(s), e.g. nginx curl htop"
                  value={installPkgName}
                  onChange={(e) => setInstallPkgName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleInstallNew()}
                  className="flex-1 min-w-[200px] h-9"
                />
                <Button size="sm" onClick={handleInstallNew} disabled={!installAgent || !installPkgName.trim()}>
                  <Play className="h-3.5 w-3.5 mr-1" />
                  Install
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Agents Table */}
          <Card>
            <CardContent className="pt-4 pb-2">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <Server className="h-4 w-4" />
                Agents
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ color: "var(--text-secondary)" }}>
                      <th className="text-left py-2 px-3 font-medium">Agent</th>
                      <th className="text-left py-2 px-3 font-medium">OS</th>
                      <th className="text-center py-2 px-3 font-medium">Packages</th>
                      <th className="text-center py-2 px-3 font-medium">Pending</th>
                      <th className="text-center py-2 px-3 font-medium">Security</th>
                      <th className="text-left py-2 px-3 font-medium">Last Check</th>
                      <th className="text-right py-2 px-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-10" style={{ color: "var(--text-muted)" }}>
                          <Package className="h-8 w-8 mx-auto mb-2 opacity-20" />
                          No agents found
                        </td>
                      </tr>
                    ) : (
                      agents.map((agent) => (
                        <tr key={agent.id} className="border-t" style={{ borderColor: "var(--border-primary)" }}>
                          <td className="py-2.5 px-3">
                            <p className="font-medium" style={{ color: "var(--text-primary)" }}>{agent.name}</p>
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                              {agent.hostname || agent.ipAddress || "—"} · {agent.organization.name}
                            </p>
                          </td>
                          <td className="py-2.5 px-3">
                            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                              {agent.distro || agent.os || "—"} {agent.distroVersion || ""}
                            </p>
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                              {agent.packageManager || "—"}
                            </p>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                              {agent._count.packages}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {agent.pendingUpdates > 0 ? (
                              <Badge variant="outline" className="text-orange-600 border-orange-300 dark:text-orange-400 dark:border-orange-600">
                                {agent.pendingUpdates}
                              </Badge>
                            ) : (
                              <span style={{ color: "var(--text-muted)" }}>0</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {agent.securityUpdates > 0 ? (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-0.5" />
                                {agent.securityUpdates}
                              </Badge>
                            ) : (
                              <span className="text-green-600 dark:text-green-400 text-xs">None</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-xs" style={{ color: "var(--text-muted)" }}>
                            {formatDate(agent.lastPatchCheck)}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1 justify-end">
                              <Button
                                variant="ghost" size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => upgradeAgent(agent.id, "security")}
                                disabled={actionLoading === agent.id || agent.securityUpdates === 0}
                                title="Security upgrade"
                              >
                                {actionLoading === agent.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shield className="h-3 w-3" />}
                              </Button>
                              <Button
                                variant="ghost" size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => upgradeAgent(agent.id, "all")}
                                disabled={actionLoading === agent.id || agent.pendingUpdates === 0}
                                title="Full upgrade"
                              >
                                <ArrowUpCircle className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost" size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => { setPkgAgent(agent.id); setTab("packages"); }}
                                title="View packages"
                              >
                                <Boxes className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Recent Patch History */}
          {recentHistory.length > 0 && (
            <Card>
              <CardContent className="pt-4 pb-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                    <History className="h-4 w-4" />
                    Recent Patch Activity
                  </h3>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setTab("history")}>
                    View All
                  </Button>
                </div>
                <div className="space-y-2">
                  {recentHistory.slice(0, 8).map((h) => (
                    <div key={h.id} className="flex items-center justify-between py-1.5 border-t" style={{ borderColor: "var(--border-primary)" }}>
                      <div className="flex items-center gap-2 min-w-0">
                        {historyStatusBadge(h.status)}
                        <span className="font-mono text-xs truncate" style={{ color: "var(--text-primary)" }}>
                          {h.packageName}
                        </span>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {h.fromVersion} → {h.toVersion}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {h.agent.name}
                        </span>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {formatDate(h.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ═══ Packages Tab ═══ */}
      {tab === "packages" && !loading && (
        <div className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-3 pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <Filter className="h-4 w-4 shrink-0" style={{ color: "var(--text-muted)" }} />
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "var(--text-muted)" }} />
                  <Input
                    placeholder="Search packages..."
                    value={pkgSearch}
                    onChange={(e) => { setPkgSearch(e.target.value); setPkgPage(1); }}
                    className="h-8 pl-8 text-sm"
                  />
                </div>
                <select
                  value={pkgAgent}
                  onChange={(e) => { setPkgAgent(e.target.value); setPkgPage(1); }}
                  className="h-8 rounded-md border px-2 text-xs"
                  style={{ background: "var(--bg-primary)", color: "var(--text-primary)", borderColor: "var(--border-primary)" }}
                >
                  <option value="">All Agents</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <select
                  value={pkgStatus}
                  onChange={(e) => { setPkgStatus(e.target.value); setPkgPage(1); }}
                  className="h-8 rounded-md border px-2 text-xs"
                  style={{ background: "var(--bg-primary)", color: "var(--text-primary)", borderColor: "var(--border-primary)" }}
                >
                  <option value="">All Statuses</option>
                  <option value="INSTALLED">Installed</option>
                  <option value="UPDATE_AVAILABLE">Update Available</option>
                  <option value="UPDATING">Updating</option>
                </select>
                <select
                  value={pkgSource}
                  onChange={(e) => { setPkgSource(e.target.value); setPkgPage(1); }}
                  className="h-8 rounded-md border px-2 text-xs"
                  style={{ background: "var(--bg-primary)", color: "var(--text-primary)", borderColor: "var(--border-primary)" }}
                >
                  <option value="">All Sources</option>
                  <option value="apt">apt</option>
                  <option value="yum">yum</option>
                  <option value="dnf">dnf</option>
                  <option value="npm">npm</option>
                  <option value="pip">pip</option>
                </select>
                <label className="flex items-center gap-1 text-xs cursor-pointer" style={{ color: "var(--text-secondary)" }}>
                  <input
                    type="checkbox"
                    checked={pkgSecurityOnly}
                    onChange={(e) => { setPkgSecurityOnly(e.target.checked); setPkgPage(1); }}
                    className="rounded"
                  />
                  Security only
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Actions */}
          {selected.size > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg" style={{ background: "var(--brand-primary)", color: "white" }}>
              <span className="text-sm font-medium">{selected.size} selected</span>
              <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={bulkUpdateSelected} disabled={actionLoading === "bulk"}>
                {actionLoading === "bulk" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <ArrowUpCircle className="h-3 w-3 mr-1" />}
                Update Selected
              </Button>
              <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => setSelected(new Set())}>
                Clear
              </Button>
            </div>
          )}

          {/* Packages Table */}
          <Card>
            <CardContent className="pt-3 pb-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {pkgTotal} package{pkgTotal !== 1 ? "s" : ""} found
                </p>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAllUpdatable}>
                  Select All Updatable
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ color: "var(--text-secondary)" }}>
                      <th className="text-left py-2 px-2 w-8">
                        <input
                          type="checkbox"
                          checked={selected.size > 0 && selected.size === packages.filter((p) => p.status === "UPDATE_AVAILABLE").length}
                          onChange={(e) => e.target.checked ? selectAllUpdatable() : setSelected(new Set())}
                          className="rounded"
                        />
                      </th>
                      <th className="text-left py-2 px-3 font-medium">Package</th>
                      <th className="text-left py-2 px-3 font-medium">Version</th>
                      <th className="text-left py-2 px-3 font-medium">Status</th>
                      <th className="text-left py-2 px-3 font-medium">Source</th>
                      <th className="text-left py-2 px-3 font-medium">Agent</th>
                      <th className="text-right py-2 px-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {packages.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-10" style={{ color: "var(--text-muted)" }}>
                          <Boxes className="h-8 w-8 mx-auto mb-2 opacity-20" />
                          No packages found
                        </td>
                      </tr>
                    ) : (
                      packages.map((pkg) => (
                        <tr key={pkg.id} className="border-t" style={{ borderColor: "var(--border-primary)" }}>
                          <td className="py-2 px-2">
                            {pkg.status === "UPDATE_AVAILABLE" && (
                              <input
                                type="checkbox"
                                checked={selected.has(pkg.id)}
                                onChange={() => toggleSelect(pkg.id)}
                                className="rounded"
                              />
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs" style={{ color: "var(--text-primary)" }}>
                                {pkg.name}
                              </span>
                              {pkg.isSecurityUpdate && (
                                <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
                              {pkg.version}
                            </span>
                            {pkg.newVersion && (
                              <>
                                <span className="mx-1" style={{ color: "var(--text-muted)" }}>→</span>
                                <span className="font-mono text-xs text-green-600 dark:text-green-400">
                                  {pkg.newVersion}
                                </span>
                              </>
                            )}
                          </td>
                          <td className="py-2 px-3">{statusBadge(pkg.status)}</td>
                          <td className="py-2 px-3">
                            <Badge variant="outline" className="text-xs font-mono">{pkg.source}</Badge>
                          </td>
                          <td className="py-2 px-3">
                            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                              {pkg.agent.name}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1 justify-end">
                              {pkg.status === "UPDATE_AVAILABLE" && (
                                <Button
                                  variant="ghost" size="sm" className="h-7 px-2 text-xs"
                                  onClick={() => installPackages(pkg.agent.id, [pkg.name])}
                                  disabled={actionLoading === pkg.agent.id}
                                  title="Update"
                                >
                                  <ArrowUpCircle className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost" size="sm" className="h-7 px-2 text-xs text-red-500 hover:text-red-700"
                                onClick={() => {
                                  if (confirm(`Uninstall ${pkg.name} from ${pkg.agent.name}?`)) {
                                    uninstallPackages(pkg.agent.id, [pkg.name]);
                                  }
                                }}
                                disabled={actionLoading === pkg.agent.id}
                                title="Uninstall"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pkgTotalPages > 1 && (
                <div className="flex items-center justify-between pt-3 border-t mt-2" style={{ borderColor: "var(--border-primary)" }}>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Page {pkgPage} of {pkgTotalPages}
                  </p>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="h-7" disabled={pkgPage <= 1} onClick={() => setPkgPage((p) => p - 1)}>
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-7" disabled={pkgPage >= pkgTotalPages} onClick={() => setPkgPage((p) => p + 1)}>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══ History Tab ═══ */}
      {tab === "history" && !loading && (
        <div className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-3 pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <Filter className="h-4 w-4 shrink-0" style={{ color: "var(--text-muted)" }} />
                <select
                  value={histAgent}
                  onChange={(e) => { setHistAgent(e.target.value); setHistPage(1); }}
                  className="h-8 rounded-md border px-2 text-xs"
                  style={{ background: "var(--bg-primary)", color: "var(--text-primary)", borderColor: "var(--border-primary)" }}
                >
                  <option value="">All Agents</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <select
                  value={histStatus}
                  onChange={(e) => { setHistStatus(e.target.value); setHistPage(1); }}
                  className="h-8 rounded-md border px-2 text-xs"
                  style={{ background: "var(--bg-primary)", color: "var(--text-primary)", borderColor: "var(--border-primary)" }}
                >
                  <option value="">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="INSTALLING">Installing</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="FAILED">Failed</option>
                  <option value="ROLLED_BACK">Rolled Back</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* History Table */}
          <Card>
            <CardContent className="pt-3 pb-2">
              <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                {histTotal} record{histTotal !== 1 ? "s" : ""} found
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ color: "var(--text-secondary)" }}>
                      <th className="text-left py-2 px-3 font-medium">Package</th>
                      <th className="text-left py-2 px-3 font-medium">Version Change</th>
                      <th className="text-left py-2 px-3 font-medium">Status</th>
                      <th className="text-left py-2 px-3 font-medium">Agent</th>
                      <th className="text-left py-2 px-3 font-medium">Source</th>
                      <th className="text-left py-2 px-3 font-medium">Approved By</th>
                      <th className="text-left py-2 px-3 font-medium">Date</th>
                      <th className="text-right py-2 px-3 font-medium">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-10" style={{ color: "var(--text-muted)" }}>
                          <History className="h-8 w-8 mx-auto mb-2 opacity-20" />
                          No patch history found
                        </td>
                      </tr>
                    ) : (
                      history.map((h) => (
                        <HistoryRow key={h.id} h={h} formatDate={formatDate} historyStatusBadge={historyStatusBadge} />
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {histTotalPages > 1 && (
                <div className="flex items-center justify-between pt-3 border-t mt-2" style={{ borderColor: "var(--border-primary)" }}>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Page {histPage} of {histTotalPages}
                  </p>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="h-7" disabled={histPage <= 1} onClick={() => setHistPage((p) => p - 1)}>
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-7" disabled={histPage >= histTotalPages} onClick={() => setHistPage((p) => p + 1)}>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── History Row with expandable details ────────────────────────────────────

function HistoryRow({
  h,
  formatDate,
  historyStatusBadge,
}: {
  h: PatchHistoryItem;
  formatDate: (d: string | null) => string;
  historyStatusBadge: (s: string) => React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr className="border-t" style={{ borderColor: "var(--border-primary)" }}>
        <td className="py-2 px-3">
          <span className="font-mono text-xs" style={{ color: "var(--text-primary)" }}>{h.packageName}</span>
        </td>
        <td className="py-2 px-3">
          <span className="font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
            {h.fromVersion}
          </span>
          <span className="mx-1" style={{ color: "var(--text-muted)" }}>→</span>
          <span className="font-mono text-xs text-green-600 dark:text-green-400">
            {h.toVersion}
          </span>
        </td>
        <td className="py-2 px-3">{historyStatusBadge(h.status)}</td>
        <td className="py-2 px-3 text-xs" style={{ color: "var(--text-secondary)" }}>
          {h.agent.name}
        </td>
        <td className="py-2 px-3">
          <Badge variant="outline" className="text-xs font-mono">{h.source}</Badge>
        </td>
        <td className="py-2 px-3 text-xs" style={{ color: "var(--text-secondary)" }}>
          {h.approvedBy?.name || "—"}
        </td>
        <td className="py-2 px-3 text-xs" style={{ color: "var(--text-muted)" }}>
          <div>{formatDate(h.createdAt)}</div>
          {h.completedAt && (
            <div className="text-green-600 dark:text-green-400">
              Done: {formatDate(h.completedAt)}
            </div>
          )}
        </td>
        <td className="py-2 px-3 text-right">
          {(h.output || h.error) && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setExpanded(!expanded)}>
              <Terminal className="h-3 w-3" />
            </Button>
          )}
        </td>
      </tr>
      {expanded && (h.output || h.error) && (
        <tr>
          <td colSpan={8} className="px-3 pb-3">
            <pre className="text-xs p-3 rounded-lg overflow-x-auto max-h-48 whitespace-pre-wrap"
                 style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}>
              {h.error ? `ERROR: ${h.error}\n\n` : ""}
              {(() => {
                if (!h.output) return "";
                try {
                  const parsed = JSON.parse(h.output);
                  return typeof parsed === "string" ? parsed : (parsed.output || parsed.summary || JSON.stringify(parsed, null, 2));
                } catch {
                  return h.output;
                }
              })()}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Command Status Row (Live Tracker) ──────────────────────────────────────

function CommandStatusRow({ cmd }: { cmd: TrackedCommand }) {
  const [showOutput, setShowOutput] = useState(false);

  const typeLabel: Record<string, string> = {
    INSTALL_PACKAGES: "Install",
    SYSTEM_UPGRADE: "Upgrade",
    UNINSTALL_PACKAGES: "Uninstall",
    ROLLBACK_PACKAGE: "Rollback",
    COLLECT_PACKAGES: "Refresh",
  };

  const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string; pulse?: boolean }> = {
    PENDING: { color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", icon: <Clock className="h-3.5 w-3.5" />, label: "Waiting for agent...", pulse: true },
    SENT: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: <ArrowUpCircle className="h-3.5 w-3.5" />, label: "Sent to agent", pulse: true },
    EXECUTING: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, label: "Executing on server...", pulse: true },
    COMPLETED: { color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: "Completed" },
    FAILED: { color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: <XCircle className="h-3.5 w-3.5" />, label: "Failed" },
  };

  const s = statusConfig[cmd.status] || statusConfig.PENDING;
  const elapsed = cmd.completedAt
    ? Math.round((new Date(cmd.completedAt).getTime() - new Date(cmd.createdAt).getTime()) / 1000)
    : Math.round((Date.now() - new Date(cmd.createdAt).getTime()) / 1000);

  let payload: { packages?: string[]; type?: string } = {};
  try { payload = JSON.parse(cmd.payload); } catch { /* ignore */ }
  const detail = payload.packages?.join(", ") || payload.type || "";

  let resultText = "";
  let resultSummary = "";
  if (cmd.result) {
    try {
      const parsed = JSON.parse(cmd.result);
      if (typeof parsed === "string") {
        try {
          const inner = JSON.parse(parsed);
          resultText = inner.output || inner.stdout || parsed;
          resultSummary = inner.summary || (inner.packageCount ? `${inner.packageCount} packages` : "");
        } catch {
          resultText = parsed;
        }
      } else {
        resultText = parsed.output || parsed.stdout || JSON.stringify(parsed, null, 2);
        resultSummary = parsed.summary || (parsed.packageCount ? `${parsed.packageCount} packages` : "");
      }
    } catch {
      resultText = cmd.result;
    }
  }

  // Status label with more context
  const statusLabel = s.pulse
    ? `${s.label} (${elapsed}s)`
    : `${s.label} in ${elapsed}s`;

  return (
    <div className={`rounded-lg p-3 ${s.pulse ? "animate-pulse" : ""}`} style={{ background: "var(--bg-secondary)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`p-1.5 rounded-md ${s.color}`}>
            {s.icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {typeLabel[cmd.type] || cmd.type}
              </span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {cmd.agent.hostname || cmd.agent.name}
              </span>
            </div>
            <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
              {detail && <span className="font-mono">{detail.length > 80 ? detail.slice(0, 80) + "..." : detail}</span>}
            </p>
            {resultSummary && (
              <p className="text-xs mt-0.5 font-mono" style={{ color: cmd.status === "FAILED" ? "var(--error)" : "var(--success, #22c55e)" }}>
                {resultSummary.slice(0, 120)}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
            {s.icon}
            {statusLabel}
          </span>
          {resultText && (
            <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={() => setShowOutput(!showOutput)}>
              <Terminal className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      {showOutput && resultText && (
        <pre className="mt-2 text-xs p-2 rounded overflow-x-auto max-h-64 whitespace-pre-wrap"
             style={{ background: "var(--bg-primary)", color: "var(--text-secondary)" }}>
          {resultText.slice(0, 8000)}
        </pre>
      )}
    </div>
  );
}
