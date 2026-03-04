"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Rocket, Copy, CheckCircle, AlertTriangle, Terminal,
  Server, KeyRound, Loader2, Wifi,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  organizations: { id: string; name: string }[];
}

interface DeployResult {
  agent: { id: string; name: string; apiKeyPrefix: string; organization: string };
  apiKey: string;
  installCommand?: string;
  manualInstall?: { step1: string; step2: string; step3: string; step4: string };
}

export function DeployClient({ organizations }: Props) {
  const [orgId, setOrgId] = useState("");
  const [agentName, setAgentName] = useState("");
  const [deploying, setDeploying] = useState(false);
  const [result, setResult] = useState<DeployResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Deploy mode
  const [mode, setMode] = useState<"manual" | "remote">("manual");

  // SSH fields
  const [sshHost, setSshHost] = useState("");
  const [sshPort, setSshPort] = useState("22");
  const [sshUsername, setSshUsername] = useState("root");
  const [sshPrivateKey, setSshPrivateKey] = useState("");

  // Remote deploy state
  const [remoteProgress, setRemoteProgress] = useState<{ step: number; total: number; message: string } | null>(null);
  const [remoteError, setRemoteError] = useState<string | null>(null);

  // Manual deploy (existing flow)
  async function deployManual() {
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

  // Remote deploy via SSH
  async function deployRemote() {
    if (!orgId || !agentName.trim()) {
      toast.error("Select an organization and enter an agent name");
      return;
    }
    if (!sshHost.trim() || !sshPrivateKey.trim()) {
      toast.error("SSH host and private key are required");
      return;
    }

    setDeploying(true);
    setRemoteProgress({ step: 0, total: 7, message: "Initializing..." });
    setRemoteError(null);

    try {
      const res = await fetch("/api/guard/admin/deploy/remote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: orgId,
          agentName: agentName.trim(),
          sshHost: sshHost.trim(),
          sshPort: parseInt(sshPort) || 22,
          sshUsername: sshUsername.trim() || "root",
          sshPrivateKey,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Deployment failed");
        setDeploying(false);
        return;
      }

      // Read SSE stream
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7);
          } else if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (eventType === "progress") {
                setRemoteProgress(data);
              } else if (eventType === "complete") {
                setResult(data);
                toast.success("Agent deployed successfully via SSH!");
              } else if (eventType === "error") {
                setRemoteError(data.message);
                toast.error("Installation failed");
              }
            } catch {
              // Ignore malformed SSE data
            }
          }
        }
      }
    } catch (err) {
      setRemoteError(err instanceof Error ? err.message : "Network error during deployment");
      toast.error("Connection error");
    } finally {
      setDeploying(false);
      setRemoteProgress(null);
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied`);
    setTimeout(() => setCopied(null), 2000);
  }

  function resetAll() {
    setResult(null);
    setRemoteError(null);
    setRemoteProgress(null);
    setAgentName("");
    setOrgId("");
    setSshHost("");
    setSshPort("22");
    setSshUsername("root");
    setSshPrivateKey("");
  }

  const isRemoteDeploying = deploying && mode === "remote";

  return (
    <div className="space-y-6 max-w-3xl">
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
            Install security monitoring agent on a client server
          </p>
        </div>
      </div>

      {/* Remote Deploy Progress */}
      {isRemoteDeploying && remoteProgress && (
        <Card>
          <CardContent className="py-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--brand-primary)" }} />
                <div>
                  <p className="font-medium" style={{ color: "var(--text-primary)" }}>
                    Installing GcsGuard Agent...
                  </p>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    Step {remoteProgress.step} of {remoteProgress.total}: {remoteProgress.message}
                  </p>
                </div>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(5, (remoteProgress.step / remoteProgress.total) * 100)}%`,
                    background: "var(--brand-primary)",
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Remote Deploy Error */}
      {remoteError && !result && (
        <Card className="border-red-300 dark:border-red-800">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-red-700 dark:text-red-400">Installation Failed</p>
                <p className="text-sm mt-1 whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
                  {remoteError}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setRemoteError(null)}
                >
                  Try Again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Form or Result */}
      {!result && !isRemoteDeploying && !remoteError ? (
        <div className="space-y-4">
          {/* Mode Selector */}
          <div
            className="flex p-1 rounded-lg"
            style={{ background: "var(--bg-secondary)" }}
          >
            <button
              onClick={() => setMode("manual")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                mode === "manual" ? "shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
              style={mode === "manual" ? { background: "var(--bg-primary)", color: "var(--text-primary)" } : undefined}
            >
              <Terminal className="h-4 w-4" />
              Manual Install
            </button>
            <button
              onClick={() => setMode("remote")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                mode === "remote" ? "shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
              style={mode === "remote" ? { background: "var(--bg-primary)", color: "var(--text-primary)" } : undefined}
            >
              <Wifi className="h-4 w-4" />
              Remote Install (SSH)
            </button>
          </div>

          {/* Common Fields */}
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

              {/* SSH Fields (remote mode only) */}
              {mode === "remote" && (
                <>
                  <div
                    className="border-t pt-4 mt-2"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                      <KeyRound className="h-3 w-3" /> SSH Connection
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium block mb-1.5" style={{ color: "var(--text-primary)" }}>
                        SSH Host
                      </label>
                      <input
                        value={sshHost}
                        onChange={(e) => setSshHost(e.target.value)}
                        placeholder="192.168.1.50 or server.example.com"
                        className="w-full px-3 py-2.5 rounded-lg border text-sm"
                        style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-1.5" style={{ color: "var(--text-primary)" }}>
                        SSH Port
                      </label>
                      <input
                        value={sshPort}
                        onChange={(e) => setSshPort(e.target.value)}
                        type="number"
                        min={1}
                        max={65535}
                        className="w-full px-3 py-2.5 rounded-lg border text-sm"
                        style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium block mb-1.5" style={{ color: "var(--text-primary)" }}>
                      SSH Username
                    </label>
                    <input
                      value={sshUsername}
                      onChange={(e) => setSshUsername(e.target.value)}
                      placeholder="root"
                      className="w-full px-3 py-2.5 rounded-lg border text-sm"
                      style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium block mb-1.5" style={{ color: "var(--text-primary)" }}>
                      SSH Private Key
                    </label>
                    <textarea
                      value={sshPrivateKey}
                      onChange={(e) => setSshPrivateKey(e.target.value)}
                      placeholder={"-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----"}
                      rows={6}
                      autoComplete="off"
                      spellCheck={false}
                      className="w-full px-3 py-2.5 rounded-lg border text-sm font-mono"
                      style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                    />
                    <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                      <KeyRound className="h-3 w-3" />
                      Used once for installation, never stored. Paste the full PEM key content.
                    </p>
                  </div>
                </>
              )}

              {/* Submit Button */}
              {mode === "manual" ? (
                <Button onClick={deployManual} disabled={deploying || !orgId || !agentName.trim()} className="w-full">
                  <Server className="h-4 w-4 mr-2" />
                  {deploying ? "Generating..." : "Generate Install Script"}
                </Button>
              ) : (
                <Button
                  onClick={deployRemote}
                  disabled={deploying || !orgId || !agentName.trim() || !sshHost.trim() || !sshPrivateKey.trim()}
                  className="w-full"
                >
                  <Rocket className="h-4 w-4 mr-2" />
                  {deploying ? "Deploying..." : "Deploy Agent via SSH"}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      ) : result ? (
        <div className="space-y-4">
          {/* Success */}
          <Card className="border-green-200 dark:border-green-800">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium" style={{ color: "var(--text-primary)" }}>
                    Agent &quot;{result.agent.name}&quot; {mode === "remote" ? "deployed to" : "created for"} {result.agent.organization}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    Key prefix: {result.agent.apiKeyPrefix}
                    {mode === "remote" && " — Agent installed and running on server"}
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
                    {mode === "remote"
                      ? "API key was auto-configured on the server. Save it for reference."
                      : "Save this API key now — it will never be shown again"}
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

          {/* Install Command (manual mode only) */}
          {mode === "manual" && result.installCommand && (
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
                    onClick={() => copyToClipboard(result.installCommand!, "Install command")}
                  >
                    {copied === "Install command" ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
                <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                  Run this command on the client&apos;s Linux server as root. It will install the GcsGuard agent and start monitoring automatically.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Manual Install Steps (manual mode only) */}
          {mode === "manual" && result.manualInstall && (
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
          )}

          <div className="flex gap-2">
            <Link href={`/portal/admin/guard/agents/${result.agent.id}`}>
              <Button>View Agent</Button>
            </Link>
            <Button variant="outline" onClick={resetAll}>
              Deploy Another
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
