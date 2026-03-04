"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Brain, CheckCircle, XCircle, Shield, Send,
  AlertTriangle, Clock, Server,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface AlertDetail {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  evidence: string | null;
  status: string;
  aiAnalysis: string | null;
  aiRecommendation: string | null;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: { name: string | null } | null;
  agent: {
    id: string;
    name: string;
    hostname: string | null;
    ipAddress: string | null;
    os: string | null;
    organization: { name: string };
  };
  incident: { id: string; title: string } | null;
}

const severityColors: Record<string, string> = {
  CRITICAL: "bg-red-600 text-white",
  HIGH: "bg-orange-500 text-white",
  MEDIUM: "bg-yellow-500 text-white",
  LOW: "bg-blue-500 text-white",
};

export function AlertDetailClient({ alert: initial }: { alert: AlertDetail }) {
  const [alert, setAlert] = useState(initial);
  const [analyzing, setAnalyzing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [cmdType, setCmdType] = useState("BLOCK_IP");
  const [cmdPayload, setCmdPayload] = useState("");

  async function runAiAnalysis() {
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/guard/admin/alerts/${alert.id}/analyze`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setAlert((prev) => ({
          ...prev,
          aiAnalysis: data.analysis,
          aiRecommendation: data.recommendation,
          status: prev.status === "OPEN" ? "INVESTIGATING" : prev.status,
        }));
        toast.success("AI analysis complete");
      } else {
        toast.error("Analysis failed");
      }
    } finally {
      setAnalyzing(false);
    }
  }

  async function updateStatus(status: string) {
    setUpdating(true);
    try {
      const res = await fetch(`/api/guard/admin/alerts/${alert.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setAlert((prev) => ({ ...prev, status }));
        toast.success(`Alert marked as ${status.toLowerCase()}`);
      }
    } finally {
      setUpdating(false);
    }
  }

  async function sendCommand() {
    try {
      let payload;
      try { payload = JSON.parse(cmdPayload || "{}"); } catch { payload = { value: cmdPayload }; }
      const res = await fetch(`/api/guard/admin/agents/${alert.agent.id}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: cmdType, payload }),
      });
      if (res.ok) {
        toast.success("Command queued for agent");
        setCmdPayload("");
      }
    } catch {
      toast.error("Failed to send command");
    }
  }

  let evidenceData: string | Record<string, unknown> | null = null;
  try { evidenceData = alert.evidence ? JSON.parse(alert.evidence) : null; } catch { evidenceData = alert.evidence; }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/portal/admin/guard/alerts">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`${severityColors[alert.severity] || ""}`}>{alert.severity}</Badge>
            <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{alert.title}</h1>
            <Badge variant="outline">{alert.status}</Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
            <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> {alert.type}</span>
            <span className="flex items-center gap-1"><Server className="h-3 w-3" /> {alert.agent.name} ({alert.agent.hostname})</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(alert.createdAt).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {!alert.aiAnalysis && (
          <Button onClick={runAiAnalysis} disabled={analyzing} size="sm">
            <Brain className={`h-4 w-4 mr-1 ${analyzing ? "animate-pulse" : ""}`} />
            {analyzing ? "Analyzing..." : "Analyze with AI"}
          </Button>
        )}
        {alert.status !== "RESOLVED" && (
          <Button onClick={() => updateStatus("RESOLVED")} disabled={updating} variant="outline" size="sm">
            <CheckCircle className="h-4 w-4 mr-1" /> Resolve
          </Button>
        )}
        {alert.status !== "FALSE_POSITIVE" && (
          <Button onClick={() => updateStatus("FALSE_POSITIVE")} disabled={updating} variant="outline" size="sm">
            <XCircle className="h-4 w-4 mr-1" /> False Positive
          </Button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text-primary)" }}>
                {alert.description}
              </p>
            </CardContent>
          </Card>

          {/* Evidence */}
          {evidenceData && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Evidence</CardTitle>
              </CardHeader>
              <CardContent>
                <pre
                  className="text-xs p-3 rounded-lg overflow-x-auto whitespace-pre-wrap font-mono"
                  style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}
                >
                  {typeof evidenceData === "string" ? evidenceData : JSON.stringify(evidenceData, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* AI Analysis */}
          {alert.aiAnalysis && (
            <Card className="border-purple-200 dark:border-purple-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-600" />
                  AI Threat Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div className="whitespace-pre-wrap text-sm" style={{ color: "var(--text-primary)" }}>
                    {alert.aiAnalysis}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Recommendation */}
          {alert.aiRecommendation && (
            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  Recommended Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-sm" style={{ color: "var(--text-primary)" }}>
                  {alert.aiRecommendation}
                </div>
                {/* Quick action from recommendation */}
                <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                  <p className="text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                    Execute action on agent:
                  </p>
                  <div className="flex gap-2">
                    <select
                      value={cmdType}
                      onChange={(e) => setCmdType(e.target.value)}
                      className="px-2 py-1.5 rounded-md border text-xs"
                      style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                    >
                      <option value="BLOCK_IP">Block IP</option>
                      <option value="KILL_PROCESS">Kill Process</option>
                      <option value="RESTART_SERVICE">Restart Service</option>
                      <option value="RUN_SCAN">Run Scan</option>
                      <option value="CUSTOM">Custom</option>
                    </select>
                    <input
                      value={cmdPayload}
                      onChange={(e) => setCmdPayload(e.target.value)}
                      placeholder='{"ip": "x.x.x.x"}'
                      className="flex-1 px-2 py-1.5 rounded-md border text-xs font-mono"
                      style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                    />
                    <Button size="sm" onClick={sendCommand}>
                      <Send className="h-3 w-3 mr-1" /> Execute
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Alert Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Type", value: alert.type },
                { label: "Severity", value: alert.severity },
                { label: "Status", value: alert.status },
                { label: "Created", value: new Date(alert.createdAt).toLocaleString() },
                ...(alert.resolvedAt ? [{ label: "Resolved", value: new Date(alert.resolvedAt).toLocaleString() }] : []),
                ...(alert.resolvedBy ? [{ label: "Resolved By", value: alert.resolvedBy.name || "—" }] : []),
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{item.label}</p>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{item.value}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Agent</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link
                href={`/portal/admin/guard/agents/${alert.agent.id}`}
                className="text-sm font-medium hover:underline"
                style={{ color: "var(--brand-primary)" }}
              >
                {alert.agent.name}
              </Link>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {alert.agent.hostname} · {alert.agent.ipAddress}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {alert.agent.os} · {alert.agent.organization.name}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
