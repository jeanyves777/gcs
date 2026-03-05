#!/usr/bin/env node
/**
 * GCS Agent Daemon — Executes shell commands for the AI admin system.
 *
 * Replaces SSH-to-self on the production server. The Next.js app sends
 * HTTP requests to this daemon instead of SSHing into the same machine.
 *
 * - Listens on 127.0.0.1:9876 (localhost only — not exposed externally)
 * - Auth: Bearer token from GCS_DAEMON_TOKEN env var
 * - Managed by systemd as gcs-daemon.service
 * - Survives Next.js rebuilds/restarts (separate process)
 *
 * Endpoints:
 *   POST /exec   — { command, timeoutMs? } → { stdout, stderr, code }
 *   GET  /health  — { ok, uptime, pid }
 */

const http = require("http");
const { spawn } = require("child_process");
const crypto = require("crypto");

// ─── Config ──────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.GCS_DAEMON_PORT || "9876", 10);
const TOKEN = process.env.GCS_DAEMON_TOKEN;
const DEFAULT_TIMEOUT = 60000; // 60 seconds
const MAX_TIMEOUT = 300000; // 5 minutes (for builds)
const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB (for base64 file writes)

if (!TOKEN) {
  console.error("FATAL: GCS_DAEMON_TOKEN environment variable is not set.");
  console.error("Generate one with: openssl rand -hex 32");
  process.exit(1);
}

// ─── Auth ────────────────────────────────────────────────────────────────────

function verifyAuth(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
  const provided = authHeader.slice(7);
  if (provided.length !== TOKEN.length) return false;
  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(provided, "utf-8"),
    Buffer.from(TOKEN, "utf-8")
  );
}

// ─── Request Body Parser ─────────────────────────────────────────────────────

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    let size = 0;

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }
      body += chunk;
    });

    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });

    req.on("error", reject);
  });
}

// ─── Command Execution ──────────────────────────────────────────────────────

function execCommand(command, timeoutMs) {
  return new Promise((resolve) => {
    const timeout = Math.min(Math.max(timeoutMs || DEFAULT_TIMEOUT, 1000), MAX_TIMEOUT);
    let stdout = "";
    let stderr = "";
    let killed = false;

    // Use bash -c to match SSH behavior (SSH executes through user's shell)
    const child = spawn("bash", ["-c", command], {
      cwd: "/var/www/gcs",
      detached: true, // Create process group so we can kill all children
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env, // Inherit daemon's env (includes PATH with nvm node)
    });

    const timer = setTimeout(() => {
      killed = true;
      try {
        // Kill the entire process group (negative PID)
        process.kill(-child.pid, "SIGKILL");
      } catch {
        // Process may have already exited
        try {
          child.kill("SIGKILL");
        } catch {
          // Already dead
        }
      }
    }, timeout);

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (killed) {
        resolve({
          stdout,
          stderr: stderr + `\n(killed: command timed out after ${timeout / 1000}s)`,
          code: code || 137,
        });
      } else {
        resolve({ stdout, stderr, code: code || 0 });
      }
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ stdout, stderr: err.message, code: 1 });
    });
  });
}

// ─── HTTP Server ─────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  // ── Health check (no auth required) ──
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        uptime: Math.round(process.uptime()),
        pid: process.pid,
      })
    );
    return;
  }

  // ── Auth check ──
  if (!verifyAuth(req.headers.authorization)) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  // ── POST /exec ──
  if (req.method === "POST" && req.url === "/exec") {
    try {
      const body = await parseBody(req);
      const { command, timeoutMs } = body;

      if (!command || typeof command !== "string") {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "command (string) is required" }));
        return;
      }

      const result = await execCommand(command, timeoutMs);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ── 404 ──
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

// ─── Start ───────────────────────────────────────────────────────────────────

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[GCS Daemon] Listening on 127.0.0.1:${PORT} (PID ${process.pid})`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("[GCS Daemon] Received SIGTERM, shutting down...");
  server.close(() => process.exit(0));
});

process.on("SIGINT", () => {
  console.log("[GCS Daemon] Received SIGINT, shutting down...");
  server.close(() => process.exit(0));
});
