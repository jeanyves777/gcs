import { Client as SSHClient } from "ssh2";
import { readFileSync } from "fs";
import { join } from "path";

export type ProgressFn = (event: string, data: Record<string, unknown>) => void;

function execCommand(
  conn: SSHClient,
  command: string,
  timeout: number
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Command timed out after ${timeout / 1000}s`)),
      timeout
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
        if (code !== 0 && code !== null) {
          reject(new Error(`Exit code ${code}: ${stderr.trim() || stdout.trim()}`));
        } else {
          resolve({ stdout, stderr, code: code || 0 });
        }
      });
    });
  });
}

export async function runRemoteInstall(
  host: string,
  port: number,
  username: string,
  privateKey: string,
  apiKey: string,
  agentName: string,
  send: ProgressFn
): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://itatgcs.com";
  const apiUrl = `${baseUrl}/api/guard/agent`;

  // Read the agent script from the filesystem
  const agentScriptPath = join(process.cwd(), "public", "guard", "gcsguard-agent.sh");
  let agentScript: string;
  try {
    agentScript = readFileSync(agentScriptPath, "utf-8");
  } catch {
    throw new Error("Agent script not found on server. Contact support.");
  }

  // Step 1: Connect via SSH
  send("progress", { step: 1, total: 7, message: "Connecting to server via SSH..." });

  const conn = new SSHClient();

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      conn.end();
      reject(new Error("SSH connection timed out after 15 seconds. Check host and port."));
    }, 15000);

    conn.on("ready", () => {
      clearTimeout(timeout);
      resolve();
    });

    conn.on("error", (err: Error) => {
      clearTimeout(timeout);
      const msg = err.message || String(err);
      if (msg.includes("authentication")) {
        reject(new Error("SSH authentication failed. Check username and private key."));
      } else if (msg.includes("ECONNREFUSED")) {
        reject(new Error(`Connection refused on ${host}:${port}. Check host and port.`));
      } else if (msg.includes("ENOTFOUND")) {
        reject(new Error(`Host not found: ${host}. Check the hostname or IP address.`));
      } else {
        reject(new Error(`SSH connection failed: ${msg}`));
      }
    });

    conn.connect({
      host,
      port,
      username,
      privateKey,
      readyTimeout: 15000,
    });
  });

  try {
    // Step 2: Verify root access
    send("progress", { step: 2, total: 7, message: "Verifying root access..." });
    const idResult = await execCommand(conn, "id -u", 10000);
    if (idResult.stdout.trim() !== "0") {
      throw new Error("Root access required. Connect as root or use a user with sudo.");
    }

    // Step 3: Create directories
    send("progress", { step: 3, total: 7, message: "Creating directories..." });
    await execCommand(conn, "mkdir -p /etc/gcsguard /var/log/gcsguard", 10000);

    // Step 4: Install dependencies
    send("progress", { step: 4, total: 7, message: "Installing dependencies..." });
    await execCommand(
      conn,
      `if command -v apt-get &>/dev/null; then
        DEBIAN_FRONTEND=noninteractive apt-get update -qq 2>/dev/null
        DEBIAN_FRONTEND=noninteractive apt-get install -y -qq unattended-upgrades curl python3 2>/dev/null || true
      elif command -v dnf &>/dev/null; then
        dnf install -y -q dnf-automatic curl python3 2>/dev/null || true
      elif command -v yum &>/dev/null; then
        yum install -y -q yum-cron curl python3 2>/dev/null || true
      fi
      echo "DEPS_OK"`,
      90000 // 90s for package install
    );

    // Step 5: Write config file (base64 to avoid shell injection)
    send("progress", { step: 5, total: 7, message: "Writing agent configuration..." });
    const configContent = [
      "# GcsGuard Agent Configuration",
      `API_KEY="${apiKey}"`,
      `API_URL="${apiUrl}"`,
      `AGENT_NAME="${agentName}"`,
      "HEARTBEAT_INTERVAL=30",
      "INTEGRITY_INTERVAL=300",
      "NETWORK_SCAN_INTERVAL=600",
    ].join("\n");
    const configBase64 = Buffer.from(configContent).toString("base64");
    await execCommand(
      conn,
      `echo "${configBase64}" | base64 -d > /etc/gcsguard/agent.conf && chmod 600 /etc/gcsguard/agent.conf`,
      10000
    );

    // Step 6: Upload agent script (base64 transfer)
    send("progress", { step: 6, total: 7, message: "Uploading agent script..." });
    const agentBase64 = Buffer.from(agentScript).toString("base64");
    // Split into chunks for large scripts (base64 of ~50KB script = ~67KB)
    const chunkSize = 32000;
    const chunks = [];
    for (let i = 0; i < agentBase64.length; i += chunkSize) {
      chunks.push(agentBase64.slice(i, i + chunkSize));
    }
    // Write chunks to a temp file, then decode
    await execCommand(conn, `rm -f /tmp/gcsguard-agent.b64`, 5000);
    for (const chunk of chunks) {
      await execCommand(
        conn,
        `echo -n "${chunk}" >> /tmp/gcsguard-agent.b64`,
        10000
      );
    }
    await execCommand(
      conn,
      `base64 -d /tmp/gcsguard-agent.b64 > /usr/local/bin/gcsguard-agent && chmod +x /usr/local/bin/gcsguard-agent && rm -f /tmp/gcsguard-agent.b64`,
      15000
    );

    // Step 7: Create systemd service and start
    send("progress", { step: 7, total: 7, message: "Creating systemd service and starting agent..." });
    const serviceUnit = `[Unit]
Description=GcsGuard Security Monitoring Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/local/bin/gcsguard-agent
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=gcsguard

[Install]
WantedBy=multi-user.target`;
    const serviceBase64 = Buffer.from(serviceUnit).toString("base64");
    await execCommand(
      conn,
      `echo "${serviceBase64}" | base64 -d > /etc/systemd/system/gcsguard.service && systemctl daemon-reload && systemctl enable gcsguard && systemctl restart gcsguard`,
      20000
    );

    // Verify the service started
    await execCommand(conn, "sleep 2", 5000);
    const verifyResult = await execCommand(conn, "systemctl is-active gcsguard", 10000);
    if (!verifyResult.stdout.trim().includes("active")) {
      const logs = await execCommand(
        conn,
        "journalctl -u gcsguard --no-pager -n 15 2>/dev/null || echo 'No logs available'",
        5000
      );
      throw new Error(
        `Agent service did not start properly. Status: ${verifyResult.stdout.trim()}. Logs:\n${logs.stdout.trim()}`
      );
    }
  } finally {
    conn.end();
  }
}
