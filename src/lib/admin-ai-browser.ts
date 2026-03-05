/**
 * GCS Browser Automation — SSH bridge to browser-agent.js on the production server.
 * Follows the same pattern as admin-ai-ssh-tools.ts.
 */

import { Client as SSHClient } from "ssh2";
import { readFileSync } from "fs";

const SERVER_HOST = "72.62.3.184";
const SERVER_USER = "root";
const AGENT_SCRIPT = "/var/www/gcs/scripts/browser-agent.js";

function getPrivateKey(): string {
  if (process.env.GCS_SERVER_SSH_KEY) {
    return Buffer.from(process.env.GCS_SERVER_SSH_KEY, "base64").toString("utf-8");
  }
  const home = process.env.HOME || process.env.USERPROFILE || "";
  return readFileSync(`${home}/.ssh/gcs_server`, "utf-8");
}

function connectSSH(): Promise<SSHClient> {
  return new Promise((resolve, reject) => {
    const conn = new SSHClient();
    const timeout = setTimeout(() => {
      conn.end();
      reject(new Error("SSH connection timed out after 15s"));
    }, 15000);

    conn.on("ready", () => {
      clearTimeout(timeout);
      resolve(conn);
    });
    conn.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    conn.connect({
      host: SERVER_HOST,
      port: 22,
      username: SERVER_USER,
      privateKey: getPrivateKey(),
    });
  });
}

function execCommand(
  conn: SSHClient,
  command: string,
  timeoutMs = 60000
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Browser command timed out after ${timeoutMs / 1000}s`)),
      timeoutMs
    );

    conn.exec(command, (err, stream) => {
      if (err) {
        clearTimeout(timer);
        reject(err);
        return;
      }

      let stdout = "";
      let stderr = "";

      stream.on("data", (data: Buffer) => {
        stdout += data.toString();
      });
      stream.stderr.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      stream.on("close", (code: number) => {
        clearTimeout(timer);
        resolve({ stdout, stderr, code: code || 0 });
      });
    });
  });
}

async function withSSH<T>(fn: (conn: SSHClient) => Promise<T>): Promise<T> {
  const conn = await connectSSH();
  try {
    return await fn(conn);
  } finally {
    conn.end();
  }
}

// Encode command as base64 JSON and run browser-agent.js via SSH
async function runBrowserAgent(
  command: Record<string, unknown>,
  timeoutMs = 30000
): Promise<string> {
  return withSSH(async (conn) => {
    const b64 = Buffer.from(JSON.stringify(command)).toString("base64");
    const cmd = `node ${AGENT_SCRIPT} ${b64}`;
    const result = await execCommand(conn, cmd, timeoutMs);

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
  });
}

// ─── Exported Tool Functions ────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolInput = Record<string, any>;

export async function browserOpen(input: ToolInput): Promise<string> {
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
