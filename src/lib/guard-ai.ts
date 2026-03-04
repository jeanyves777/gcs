import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface AlertForAnalysis {
  type: string;
  severity: string;
  title: string;
  description: string;
  evidence: string | null;
  agent: {
    hostname: string | null;
    ipAddress: string | null;
    os: string | null;
  };
  recentAlerts?: { type: string; title: string; createdAt: Date }[];
}

export async function analyzeAlert(alert: AlertForAnalysis): Promise<{
  analysis: string;
  recommendation: string;
}> {
  const systemPrompt = `You are a senior cybersecurity analyst at General Computing Solutions (GCS), a managed security services provider. You analyze security alerts from client servers monitored by GcsGuard, our AI-powered security platform.

Your role:
- Classify the threat accurately based on the evidence
- Assess the true severity (the agent may over/under-classify)
- Identify the attack vector and potential impact
- Recommend specific, actionable remediation steps
- Consider false positive likelihood

Always be concise but thorough. Use technical language appropriate for a SOC analyst audience.`;

  const userPrompt = `Analyze this security alert from a monitored client server:

**Alert Type:** ${alert.type}
**Reported Severity:** ${alert.severity}
**Title:** ${alert.title}
**Description:** ${alert.description}

**Server Info:**
- Hostname: ${alert.agent.hostname || "Unknown"}
- IP: ${alert.agent.ipAddress || "Unknown"}
- OS: ${alert.agent.os || "Unknown"}

${alert.evidence ? `**Raw Evidence:**\n\`\`\`\n${alert.evidence}\n\`\`\`` : "No raw evidence provided."}

${
  alert.recentAlerts?.length
    ? `**Recent alerts from this server (last 24h):**\n${alert.recentAlerts.map((a) => `- [${a.type}] ${a.title} (${a.createdAt.toISOString()})`).join("\n")}`
    : ""
}

Provide your analysis in two sections:

**THREAT ANALYSIS:**
(Classification, severity assessment, attack vector, confidence level, false positive likelihood, potential impact)

**RECOMMENDED ACTIONS:**
(Numbered list of specific, executable actions the SOC team should take — be specific with commands, IPs, file paths, etc.)`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const analysisSplit = text.split("**RECOMMENDED ACTIONS:**");
  const analysis = (analysisSplit[0] || text)
    .replace("**THREAT ANALYSIS:**", "")
    .trim();
  const recommendation = (analysisSplit[1] || "").trim();

  return { analysis, recommendation };
}

export async function summarizeIncident(
  alerts: { type: string; severity: string; title: string; description: string; createdAt: Date }[]
): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    messages: [
      {
        role: "user",
        content: `Summarize this security incident comprised of ${alerts.length} related alerts:\n\n${alerts
          .map(
            (a) =>
              `[${a.severity}] ${a.title}: ${a.description} (${a.createdAt.toISOString()})`
          )
          .join("\n")}\n\nProvide a 2-3 paragraph executive summary: what happened, the timeline, severity assessment, and current status.`,
      },
    ],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}
