/**
 * GCS Browser Automation — Bridge to browser-agent.js on the production server.
 *
 * Uses execOnServer() which routes through the local daemon in production
 * or falls back to SSH for local development.
 */

import { execOnServer } from "./admin-ai-exec";

const AGENT_SCRIPT = "/var/www/gcs/scripts/browser-agent.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolInput = Record<string, any>;

// Encode command as base64 JSON and run browser-agent.js
async function runBrowserAgent(
  command: Record<string, unknown>,
  timeoutMs = 30000
): Promise<string> {
  const b64 = Buffer.from(JSON.stringify(command)).toString("base64");
  const cmd = `node ${AGENT_SCRIPT} ${b64}`;
  const result = await execOnServer(cmd, timeoutMs);

  if (result.code !== 0) {
    // Try to parse error from stdout (agent outputs JSON even on error)
    const output = result.stdout.trim() || result.stderr.trim();
    try {
      JSON.parse(output);
      return output;
    } catch {
      return JSON.stringify({ error: output || "Browser agent failed" });
    }
  }

  // Validate JSON output
  const output = result.stdout.trim();
  try {
    JSON.parse(output);
    return output;
  } catch {
    return JSON.stringify({
      error: "Invalid response from browser agent",
      raw: output.substring(0, 500),
    });
  }
}

// ─── Exported Tool Functions ────────────────────────────────────────────────

export async function browserOpen(input: ToolInput): Promise<string> {
  // Auto-cleanup: close ALL existing sessions before opening a new one.
  // This prevents orphaned sessions from blocking new launches.
  try {
    const listResult = await runBrowserAgent({ command: "list" }, 15000);
    const parsed = JSON.parse(listResult);
    if (parsed.sessions && Array.isArray(parsed.sessions)) {
      for (const session of parsed.sessions) {
        try {
          await runBrowserAgent({ command: "close", sessionId: session.sessionId }, 15000);
        } catch {
          // Best-effort cleanup — continue even if one close fails
        }
      }
    }
  } catch {
    // If listing fails, proceed with open anyway — the agent will handle it
  }

  return runBrowserAgent(
    {
      command: "open",
      url: input.url,
      viewport: input.viewport,
    },
    90000 // 90s — includes Chromium cold start time
  );
}

export async function browserAction(input: ToolInput): Promise<string> {
  return runBrowserAgent(
    {
      command: "action",
      sessionId: input.session_id,
      actions: input.actions,
    },
    180000 // 180s — human-speed typing + multi-step actions
  );
}

export async function browserClose(input: ToolInput): Promise<string> {
  return runBrowserAgent(
    {
      command: "close",
      sessionId: input.session_id,
    },
    15000
  );
}

export async function browserSessions(): Promise<string> {
  return runBrowserAgent({ command: "list" }, 15000);
}
