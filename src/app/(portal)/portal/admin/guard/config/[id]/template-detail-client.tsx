"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Rocket, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Deployment {
  id: string;
  filePath: string;
  status: string;
  createdAt: string;
  agent: { id: string; name: string; hostname: string | null };
  deployedBy: { name: string | null };
}

interface Template {
  id: string;
  name: string;
  filePath: string;
  content: string;
  description: string | null;
  restartService: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: { name: string | null };
  deployments: Deployment[];
}

interface AgentOption {
  id: string;
  name: string;
  hostname: string | null;
}

const statusBadge: Record<string, string> = {
  COMPLETED: "bg-green-600 text-white",
  FAILED: "bg-red-600 text-white",
  PENDING: "bg-yellow-500 text-white",
  DEPLOYING: "bg-blue-500 text-white",
  ROLLED_BACK: "bg-orange-500 text-white",
};

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function TemplateDetailClient({ template, agents }: { template: Template; agents: AgentOption[] }) {
  const [name, setName] = useState(template.name);
  const [filePath, setFilePath] = useState(template.filePath);
  const [description, setDescription] = useState(template.description || "");
  const [restartService, setRestartService] = useState(template.restartService || "");
  const [content, setContent] = useState(template.content);
  const [saving, setSaving] = useState(false);

  const [deployments, setDeployments] = useState(template.deployments);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [deploying, setDeploying] = useState(false);

  async function saveTemplate() {
    setSaving(true);
    try {
      const res = await fetch(`/api/guard/admin/config-templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          filePath: filePath.trim(),
          description: description.trim() || null,
          restartService: restartService.trim() || null,
          content,
        }),
      });
      if (res.ok) {
        toast.success("Template saved");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to save");
      }
    } finally { setSaving(false); }
  }

  async function deployToAgent() {
    if (!selectedAgent) {
      toast.error("Select an agent");
      return;
    }
    setDeploying(true);
    try {
      const res = await fetch(`/api/guard/admin/agents/${selectedAgent}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: template.id }),
      });
      if (res.ok) {
        const dep = await res.json();
        setDeployments((prev) => [dep, ...prev]);
        toast.success("Config deployment queued");
        setSelectedAgent("");
      } else toast.error("Failed to deploy config");
    } finally { setDeploying(false); }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/portal/admin/guard/config">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <Settings className="h-6 w-6" style={{ color: "var(--brand-primary)" }} />
              {template.name}
            </h1>
            <Badge variant="outline">v{template.version}</Badge>
          </div>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Created by {template.createdBy?.name || "—"} · {timeAgo(template.createdAt)}
          </p>
        </div>
      </div>

      {/* Editor */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Template Editor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>File Path</label>
              <input
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm font-mono"
                style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>Restart Service</label>
              <input
                value={restartService}
                onChange={(e) => setRestartService(e.target.value)}
                placeholder="e.g., nginx"
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={20}
              className="w-full px-3 py-2 rounded-lg border text-sm font-mono"
              style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={saveTemplate} disabled={saving} size="sm">
              <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save Template"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Deploy to Agent */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Rocket className="h-4 w-4" /> Deploy to Agent
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border text-sm"
              style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
            >
              <option value="">Select an agent...</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.hostname || "—"})</option>
              ))}
            </select>
            <Button onClick={deployToAgent} disabled={deploying || !selectedAgent} size="sm">
              <Rocket className="h-4 w-4 mr-1" /> {deploying ? "Deploying..." : "Deploy"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Deployment History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Deployment History</CardTitle>
        </CardHeader>
        <CardContent>
          {deployments.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: "var(--text-muted)" }}>
              No deployments yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs" style={{ color: "var(--text-muted)" }}>
                    <th className="py-2 pr-4">Agent</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Deployed By</th>
                    <th className="py-2">When</th>
                  </tr>
                </thead>
                <tbody>
                  {deployments.map((dep) => (
                    <tr key={dep.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                      <td className="py-2 pr-4">
                        <Link
                          href={`/portal/admin/guard/agents/${dep.agent.id}`}
                          className="text-xs hover:underline"
                          style={{ color: "var(--brand-primary)" }}
                        >
                          {dep.agent.name} ({dep.agent.hostname || "—"})
                        </Link>
                      </td>
                      <td className="py-2 pr-4">
                        <Badge className={`text-[10px] ${statusBadge[dep.status] || "bg-gray-500 text-white"}`}>
                          {dep.status}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4 text-xs" style={{ color: "var(--text-secondary)" }}>
                        {dep.deployedBy?.name || "—"}
                      </td>
                      <td className="py-2 text-xs" style={{ color: "var(--text-muted)" }}>
                        {timeAgo(dep.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
