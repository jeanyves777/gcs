"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Rocket, Copy, CheckCircle, AlertTriangle, Terminal, Server } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GuardNav } from "@/components/guard/guard-nav";
import { toast } from "sonner";

interface Props {
  organizations: { id: string; name: string }[];
}

interface DeployResult {
  agent: { id: string; name: string; apiKeyPrefix: string; organization: string };
  apiKey: string;
  installCommand: string;
  manualInstall: { step1: string; step2: string; step3: string; step4: string };
}

export function DeployClient({ organizations }: Props) {
  const [orgId, setOrgId] = useState("");
  const [agentName, setAgentName] = useState("");
  const [deploying, setDeploying] = useState(false);
  const [result, setResult] = useState<DeployResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function deploy() {
    if (!orgId || !agentName.trim()) {
      toast.error("Select an organization and enter an agent name");
      return;
    }
    setDeploying(true);
    try {
      const res = await fetch("/api/guard/admin/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId, agentName: agentName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        toast.success("Agent created — save the API key now!");
      } else {
        const err = await res.json();
        toast.error(err.error || "Deployment failed");
      }
    } finally {
      setDeploying(false);
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied`);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <GuardNav />
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/portal/admin/guard">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Rocket className="h-6 w-6" style={{ color: "var(--brand-primary)" }} />
            Deploy GcsGuard Agent
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Generate installation credentials for a client server
          </p>
        </div>
      </div>

      {!result ? (
        <Card>
          <CardContent className="py-6 space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: "var(--text-primary)" }}>
                Organization
              </label>
              <select
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border text-sm"
                style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              >
                <option value="">Select an organization...</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: "var(--text-primary)" }}>
                Agent Name
              </label>
              <input
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="e.g., ACME Web Server, Client Production DB"
                className="w-full px-3 py-2.5 rounded-lg border text-sm"
                style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              />
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                A descriptive name to identify this server in the dashboard
              </p>
            </div>
            <Button onClick={deploy} disabled={deploying || !orgId || !agentName.trim()} className="w-full">
              <Server className="h-4 w-4 mr-2" />
              {deploying ? "Generating..." : "Generate Install Script"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Success */}
          <Card className="border-green-200 dark:border-green-800">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium" style={{ color: "var(--text-primary)" }}>
                    Agent &quot;{result.agent.name}&quot; created for {result.agent.organization}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    Key prefix: {result.agent.apiKeyPrefix}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Key Warning */}
          <Card className="border-yellow-300 dark:border-yellow-700">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-yellow-700 dark:text-yellow-400">
                    Save this API key now — it will never be shown again
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <code
                      className="flex-1 text-xs p-2 rounded font-mono break-all"
                      style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}
                    >
                      {result.apiKey}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(result.apiKey, "API Key")}
                    >
                      {copied === "API Key" ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Install Command */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Terminal className="h-4 w-4" /> Quick Install (One-Liner)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <code
                  className="flex-1 text-xs p-3 rounded font-mono break-all"
                  style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}
                >
                  {result.installCommand}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(result.installCommand, "Install command")}
                >
                  {copied === "Install command" ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
              <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                Run this command on the client&apos;s Linux server as root. It will install the GcsGuard agent and start monitoring automatically.
              </p>
            </CardContent>
          </Card>

          {/* Manual Install */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Manual Installation Steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(result.manualInstall).map(([step, cmd], i) => (
                <div key={step}>
                  <p className="text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                    Step {i + 1}
                  </p>
                  <pre
                    className="text-xs p-2 rounded font-mono whitespace-pre-wrap"
                    style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}
                  >
                    {cmd}
                  </pre>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Link href={`/portal/admin/guard/agents/${result.agent.id}`}>
              <Button>View Agent</Button>
            </Link>
            <Button variant="outline" onClick={() => { setResult(null); setAgentName(""); setOrgId(""); }}>
              Deploy Another
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
