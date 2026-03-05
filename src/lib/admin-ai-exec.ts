/**
 * Transport abstraction for server command execution.
 *
 * Production (GCS_DAEMON_URL set):  HTTP POST to local daemon (no SSH)
 * Development (no daemon):          SSH to remote server (fallback)
 *
 * Both paths return the same shape: { stdout, stderr, code }
 */

import { Client as SSHClient } from "ssh2";
import { readFileSync } from "fs";

// ─── Public API ──────────────────────────────────────────────────────────────

export async function execOnServer(
  command: string,
  timeoutMs = 60000
): Promise<{ stdout: string; stderr: string; code: number }> {
  const daemonUrl = process.env.GCS_DAEMON_URL;
  if (daemonUrl) {
    return execViaDaemon(daemonUrl, command, timeoutMs);
  }
  return execViaSSH(command, timeoutMs);
}

// ─── Daemon Path (Production) ────────────────────────────────────────────────

async function execViaDaemon(
  baseUrl: string,
  command: string,
  timeoutMs: number
): Promise<{ stdout: string; stderr: string; code: number }> {
  const token = process.env.GCS_DAEMON_TOKEN;
  if (!token) {
    throw new Error("GCS_DAEMON_TOKEN not set — cannot communicate with daemon");
  }

  // Add 5s buffer over the command timeout — daemon handles its own timeout,
  // this is a safety net in case the HTTP connection itself hangs.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs + 5000);

  try {
    const res = await fetch(`${baseUrl}/exec`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ command, timeoutMs }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Daemon error (${res.status}): ${text}`);
    }

    return (await res.json()) as { stdout: string; stderr: string; code: number };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Daemon request timed out after ${(timeoutMs + 5000) / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ─── SSH Path (Local Development Fallback) ───────────────────────────────────

const SERVER_HOST = "72.62.3.184";
const SERVER_USER = "root";

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

function execSSHCommand(
  conn: SSHClient,
  command: string,
  timeoutMs: number
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Command timed out after ${timeoutMs / 1000}s`)),
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

async function execViaSSH(
  command: string,
  timeoutMs: number
): Promise<{ stdout: string; stderr: string; code: number }> {
  const conn = await connectSSH();
  try {
    return await execSSHCommand(conn, command, timeoutMs);
  } finally {
    conn.end();
  }
}
