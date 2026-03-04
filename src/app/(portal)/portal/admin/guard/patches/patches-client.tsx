"use client";

import { useState } from "react";
import Link from "next/link";
import { Package, Shield, Server, RefreshCw, AlertTriangle, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GuardNav } from "@/components/guard/guard-nav";
import { toast } from "sonner";

interface AgentPatch {
  id: string;
  name: string;
  hostname: string | null;
  pendingUpdates: number;
  securityUpdates: number;
  organization: { name: string };
}

interface Props {
  agents: AgentPatch[];
  totalPending: number;
  totalSecurity: number;
}

export function PatchesClient({ agents, totalPending, totalSecurity }: Props) {
  const [refreshing, setRefreshing] = useState(false);

  async function refreshAll() {
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
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="space-y-6">
      <GuardNav />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Package className="h-6 w-6" style={{ color: "var(--brand-primary)" }} />
            Patch Management
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Overview of pending updates across all agents
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refreshAll} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
          Refresh All
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Package className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{totalPending}</p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Total Pending Patches</p>
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
                <p className={`text-2xl font-bold ${totalSecurity > 0 ? "text-red-600" : ""}`} style={totalSecurity === 0 ? { color: "var(--text-primary)" } : undefined}>
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
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Server className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{agents.length}</p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Agents Affected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent List */}
      <div className="space-y-3">
        {agents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p style={{ color: "var(--text-muted)" }}>All agents are up to date. No pending patches.</p>
            </CardContent>
          </Card>
        ) : (
          agents.map((agent) => (
            <Link key={agent.id} href={`/portal/admin/guard/agents/${agent.id}?tab=Packages`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg" style={{ background: "var(--bg-secondary)" }}>
                        <Server className="h-5 w-5" style={{ color: "var(--text-secondary)" }} />
                      </div>
                      <div>
                        <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
                          {agent.name}
                        </p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {agent.hostname || "—"} · {agent.organization.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          {agent.pendingUpdates} pending
                        </p>
                        {agent.securityUpdates > 0 && (
                          <div className="flex items-center gap-1 justify-end">
                            <AlertTriangle className="h-3 w-3 text-red-500" />
                            <span className="text-xs text-red-600 font-medium">
                              {agent.securityUpdates} security
                            </span>
                          </div>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
