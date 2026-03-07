/**
 * GCS Internal Security Scanner
 * Runs directly on the production server with full root-level access.
 * No agent needed — we ARE the server.
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as net from "net";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface SystemMetrics {
  cpuPercent: number;
  memTotal: number;
  memUsed: number;
  memPercent: number;
  diskTotal: number;
  diskUsed: number;
  diskPercent: number;
  loadAvg: [number, number, number];
  uptime: number; // seconds
  processes: number;
  networkRx: number; // bytes
  networkTx: number; // bytes
}

export interface SecurityFinding {
  id: string;
  category: "system" | "network" | "auth" | "files" | "packages" | "services" | "firewall" | "ssl";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  title: string;
  description: string;
  remediation: string;
  value?: string;
}

export interface PortInfo {
  port: number;
  protocol: string;
  state: string;
  service: string;
  address: string;
  risk: "critical" | "high" | "medium" | "low" | "info";
}

export interface ServiceInfo {
  name: string;
  status: "active" | "inactive" | "failed" | "unknown";
  enabled: boolean;
  pid?: string;
  uptime?: string;
}

export interface PatchInfo {
  total: number;
  security: number;
  packages: string[];
}

export interface AuthEvent {
  timestamp: string;
  type: "success" | "failure" | "ban";
  user: string;
  ip: string;
  message: string;
}

export interface FileIntegrityResult {
  path: string;
  status: "ok" | "warning" | "danger";
  permissions: string;
  owner: string;
  issue?: string;
}

export interface ActiveConnection {
  protocol: string;
  localAddr: string;
  localPort: number;
  remoteAddr: string;
  remotePort: number;
  state: string;
  process: string;
  pid: string;
}

export interface NetworkNeighbor {
  ip: string;
  mac: string;
  interface: string;
  state: string;
}

export interface SSHSession {
  user: string;
  ip: string;
  loginTime: string;
  tty: string;
  keyFingerprint?: string;
}

export interface ConnectionAudit {
  activeConnections: ActiveConnection[];
  sshSessions: SSHSession[];
  neighbors: NetworkNeighbor[];
  adminKeyFingerprint: string;
  trustedSessionActive: boolean;
}

export type ServerRole = "web" | "database" | "mail" | "app" | "ci_cd" | "monitoring" | "dns" | "proxy" | "storage";

export interface ServerType {
  roles: ServerRole[];
  primary: ServerRole;
  label: string;          // e.g. "Web + App + Database Server"
  expectedPorts: number[];
  unexpectedServices: string[]; // services that shouldn't be on this server type
}

export interface ScanResult {
  timestamp: string;
  serverType: ServerType;
  metrics: SystemMetrics;
  findings: SecurityFinding[];
  ports: PortInfo[];
  services: ServiceInfo[];
  patches: PatchInfo;
  authEvents: AuthEvent[];
  fileIntegrity: FileIntegrityResult[];
  connectionAudit: ConnectionAudit;
  threatScore: number;
  threatLevel: "LOW" | "ELEVATED" | "HIGH" | "CRITICAL";
  grade: "A" | "B" | "C" | "D" | "F";
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function run(cmd: string, timeoutMs = 8000): string {
  try {
    return execSync(cmd, { timeout: timeoutMs, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch {
    return "";
  }
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Server Type Detection ────────────────────────────────────────────────────

// Port → role mapping
const PORT_ROLES: Record<number, ServerRole> = {
  80: "web", 443: "web", 8443: "web",
  3000: "app", 3001: "app", 4000: "app", 5000: "app", 8000: "app", 9000: "app",
  8080: "app", // common for web apps and reverse proxies
  5432: "database", 3306: "database", 27017: "database", 6379: "database", 1433: "database",
  25: "mail", 465: "mail", 587: "mail", 993: "mail", 143: "mail", 110: "mail", 995: "mail",
  53: "dns",
  3128: "proxy",
  9090: "monitoring", 9100: "monitoring", 3100: "monitoring",
  21: "storage", 2049: "storage",
  8081: "ci_cd", 8082: "ci_cd",
};

// Each role's expected ports (always includes 22 for SSH)
const ROLE_PORTS: Record<ServerRole, number[]> = {
  web:        [22, 53, 80, 443],
  app:        [22, 53, 3000, 3001, 4000, 5000, 8000, 9000],
  database:   [22, 53, 5432, 3306, 27017, 6379, 1433],
  mail:       [22, 53, 25, 465, 587, 993, 143, 110, 995],
  dns:        [22, 53],
  proxy:      [22, 53, 80, 443, 8080, 3128],
  monitoring: [22, 53, 9090, 9100, 3100],
  storage:    [22, 53, 21, 2049],
  ci_cd:      [22, 53, 8081, 8082],
};

// Services that should NOT be on certain server types
const UNEXPECTED_SERVICES: Record<ServerRole, string[]> = {
  web:        ["cups", "avahi-daemon", "bluetooth", "ModemManager", "NetworkManager-wait-online"],
  app:        ["cups", "avahi-daemon", "bluetooth", "ModemManager"],
  database:   ["cups", "avahi-daemon", "bluetooth", "apache2", "httpd"],
  mail:       ["cups", "avahi-daemon", "bluetooth"],
  dns:        ["cups", "avahi-daemon", "bluetooth", "apache2"],
  proxy:      ["cups", "avahi-daemon", "bluetooth"],
  monitoring: ["cups", "avahi-daemon", "bluetooth"],
  storage:    ["cups", "avahi-daemon", "bluetooth"],
  ci_cd:      ["cups", "avahi-daemon", "bluetooth"],
};

const ROLE_LABELS: Record<ServerRole, string> = {
  web: "Web Server", app: "Application Server", database: "Database Server",
  mail: "Mail Server", dns: "DNS Server", proxy: "Reverse Proxy",
  monitoring: "Monitoring Server", storage: "File/Storage Server", ci_cd: "CI/CD Server",
};

export function detectServerType(ports: PortInfo[]): ServerType {
  const listeningPorts = ports.map(p => p.port);
  const detectedRoles = new Set<ServerRole>();

  // Detect roles from listening ports
  for (const port of listeningPorts) {
    const role = PORT_ROLES[port];
    if (role) detectedRoles.add(role);
  }

  // Also detect from running processes/services
  if (run("which nginx 2>/dev/null") || run("which apache2 2>/dev/null") || run("which httpd 2>/dev/null")) {
    detectedRoles.add("web");
  }
  if (run("which psql 2>/dev/null") || run("which mysql 2>/dev/null") || run("which mongod 2>/dev/null")) {
    detectedRoles.add("database");
  }
  if (run("which postfix 2>/dev/null") || run("which dovecot 2>/dev/null") || run("which sendmail 2>/dev/null")) {
    detectedRoles.add("mail");
  }
  if (run("which jenkins 2>/dev/null") || run("which gitlab-runner 2>/dev/null")) {
    detectedRoles.add("ci_cd");
  }
  if (run("which prometheus 2>/dev/null") || run("which grafana-server 2>/dev/null")) {
    detectedRoles.add("monitoring");
  }
  if (run("which squid 2>/dev/null") || run("which haproxy 2>/dev/null")) {
    detectedRoles.add("proxy");
  }

  // Fallback if nothing detected
  if (detectedRoles.size === 0) detectedRoles.add("app");

  const roles = Array.from(detectedRoles);

  // Primary role: web > app > database > mail > proxy > others
  const priority: ServerRole[] = ["web", "app", "database", "mail", "proxy", "dns", "monitoring", "storage", "ci_cd"];
  const primary = priority.find(r => detectedRoles.has(r)) || roles[0];

  // Build expected ports: union of all detected roles
  const expectedPorts = new Set<number>([22, 53]); // SSH + DNS always expected
  for (const role of roles) {
    for (const port of ROLE_PORTS[role]) expectedPorts.add(port);
  }
  // Also add the daemon port if it's listening (role-specific local services)
  if (listeningPorts.includes(9876)) expectedPorts.add(9876);

  // Build unexpected services: intersection of all roles
  const unexpectedSets = roles.map(r => new Set(UNEXPECTED_SERVICES[r]));
  const unexpectedServices = unexpectedSets.length > 0
    ? Array.from(unexpectedSets.reduce((a, b) => new Set([...a].filter(x => b.has(x)))))
    : [];

  // Build label
  const label = roles.map(r => ROLE_LABELS[r]).join(" + ");

  return {
    roles,
    primary,
    label,
    expectedPorts: Array.from(expectedPorts).sort((a, b) => a - b),
    unexpectedServices,
  };
}

// ─── System Metrics ────────────────────────────────────────────────────────────

export function getSystemMetrics(): SystemMetrics {
  // CPU
  let cpuPercent = 0;
  try {
    const cpuOut = run("top -bn1 | grep 'Cpu(s)' | awk '{print $2}'");
    cpuPercent = parseFloat(cpuOut) || 0;
    if (!cpuPercent) {
      const idle = run("top -bn1 | grep 'Cpu(s)' | sed 's/.*, *\\([0-9.]*\\)%* id.*/\\1/'");
      cpuPercent = Math.max(0, 100 - parseFloat(idle));
    }
  } catch { cpuPercent = 0; }

  // Memory from /proc/meminfo
  let memTotal = 0, memUsed = 0, memPercent = 0;
  try {
    const memRaw = fs.readFileSync("/proc/meminfo", "utf8");
    const getKb = (key: string) => {
      const m = memRaw.match(new RegExp(`^${key}:\\s+(\\d+)`, "m"));
      return m ? parseInt(m[1]) * 1024 : 0;
    };
    memTotal = getKb("MemTotal");
    const memFree = getKb("MemFree");
    const buffers = getKb("Buffers");
    const cached = getKb("Cached");
    const sReclaimable = getKb("SReclaimable");
    memUsed = memTotal - memFree - buffers - cached - sReclaimable;
    memPercent = memTotal > 0 ? Math.round((memUsed / memTotal) * 100) : 0;
  } catch { }

  // Disk
  let diskTotal = 0, diskUsed = 0, diskPercent = 0;
  try {
    const dfOut = run("df -B1 / | tail -1");
    const parts = dfOut.split(/\s+/);
    diskTotal = parseInt(parts[1]) || 0;
    diskUsed = parseInt(parts[2]) || 0;
    diskPercent = parseInt(parts[4]) || 0;
  } catch { }

  // Load average
  const loadAvg = os.loadavg() as [number, number, number];

  // Uptime
  const uptime = os.uptime();

  // Process count
  let processes = 0;
  try {
    processes = parseInt(run("ps aux | wc -l")) - 1;
  } catch { }

  // Network I/O (eth0 or first interface)
  let networkRx = 0, networkTx = 0;
  try {
    const netRaw = fs.readFileSync("/proc/net/dev", "utf8");
    const lines = netRaw.split("\n").filter(l => l.includes(":") && !l.includes("lo:"));
    if (lines[0]) {
      const parts = lines[0].trim().split(/\s+/);
      networkRx = parseInt(parts[1]) || 0;
      networkTx = parseInt(parts[9]) || 0;
    }
  } catch { }

  return { cpuPercent, memTotal, memUsed, memPercent, diskTotal, diskUsed, diskPercent, loadAvg, uptime, processes, networkRx, networkTx };
}

// ─── Open Ports ────────────────────────────────────────────────────────────────

export function scanOpenPorts(): PortInfo[] {
  const ports: PortInfo[] = [];
  const serviceMap: Record<number, string> = {
    21: "FTP", 22: "SSH", 23: "Telnet", 25: "SMTP", 53: "DNS",
    80: "HTTP", 110: "POP3", 143: "IMAP", 443: "HTTPS", 445: "SMB",
    631: "CUPS", 993: "IMAPS", 995: "POP3S", 1433: "MSSQL", 3000: "Node",
    3306: "MySQL", 3389: "RDP", 5432: "PostgreSQL", 5900: "VNC",
    6379: "Redis", 8080: "HTTP-Alt", 8443: "HTTPS-Alt", 9200: "Elasticsearch", 9876: "GCS-Daemon", 27017: "MongoDB"
  };
  const riskMap: Record<number, "critical" | "high" | "medium" | "low" | "info"> = {
    21: "critical", 23: "critical", 445: "critical", 3389: "critical",
    5900: "high", 1433: "high", 3306: "high", 27017: "high", 9200: "high",
    25: "medium", 110: "medium", 143: "medium", 6379: "medium",
    8080: "medium", 631: "medium",
    22: "info", 80: "info", 443: "info", 5432: "info",
    3000: "low", 9876: "info", 53: "info",
  };

  try {
    // Use ss to get listening ports
    const ssOut = run("ss -tlnup 2>/dev/null || netstat -tlnup 2>/dev/null");
    const lines = ssOut.split("\n").filter(l => l.includes("LISTEN") || l.includes("0.0.0.0") || l.includes(":::"));

    const seen = new Set<string>();
    for (const line of lines) {
      // Parse address:port
      const match = line.match(/(?:LISTEN\s+\d+\s+\d+\s+)?(\S+):(\d+)\s/);
      if (!match) continue;
      const addr = match[1];
      const port = parseInt(match[2]);
      if (!port || port > 65535) continue;
      const key = `${addr}:${port}`;
      if (seen.has(key)) continue;
      seen.add(key);

      // Extract service from process name if available
      const procMatch = line.match(/users:\(\("([^"]+)"/);
      const procName = procMatch ? procMatch[1] : "";

      ports.push({
        port,
        protocol: "TCP",
        state: "LISTEN",
        service: serviceMap[port] || procName || "unknown",
        address: addr,
        risk: riskMap[port] || "info",
      });
    }
  } catch { }

  return ports.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    return order[a.risk] - order[b.risk];
  });
}

// ─── Services ─────────────────────────────────────────────────────────────────

export function checkServices(): ServiceInfo[] {
  const important = ["nginx", "postgresql", "ssh", "ufw", "fail2ban", "pm2-root", "cups", "snapd"];
  return important.map(name => {
    const status = run(`systemctl is-active ${name} 2>/dev/null`);
    const enabled = run(`systemctl is-enabled ${name} 2>/dev/null`);
    const pidOut = run(`systemctl show ${name} --property=MainPID 2>/dev/null | cut -d= -f2`);
    const upOut = run(`systemctl show ${name} --property=ActiveEnterTimestamp 2>/dev/null | cut -d= -f2`);
    return {
      name,
      status: (["active", "inactive", "failed"].includes(status) ? status : "unknown") as ServiceInfo["status"],
      enabled: enabled === "enabled",
      pid: pidOut !== "0" ? pidOut : undefined,
      uptime: upOut || undefined,
    };
  });
}

// ─── Patches ──────────────────────────────────────────────────────────────────

export function checkPatches(): PatchInfo {
  try {
    run("apt-get update -qq 2>/dev/null", 30000);
  } catch { }
  const allOut = run("apt list --upgradable 2>/dev/null | grep -v Listing | head -50", 15000);
  const secOut = run("apt list --upgradable 2>/dev/null | grep -i security | head -20", 15000);
  const packages = allOut.split("\n").filter(Boolean).map(l => l.split("/")[0]);
  const secCount = secOut.split("\n").filter(Boolean).length;
  return { total: packages.length, security: secCount, packages: packages.slice(0, 20) };
}

// ─── Auth Log ─────────────────────────────────────────────────────────────────

export function checkAuthLog(): AuthEvent[] {
  const events: AuthEvent[] = [];
  try {
    const log = run("grep -i 'sshd' /var/log/auth.log 2>/dev/null | tail -100");
    for (const line of log.split("\n").filter(Boolean)) {
      const tsMatch = line.match(/^(\w+\s+\d+\s+\d+:\d+:\d+)/);
      const ts = tsMatch ? tsMatch[1] : "";
      const ipMatch = line.match(/from\s+(\d+\.\d+\.\d+\.\d+)/);
      const ip = ipMatch ? ipMatch[1] : "unknown";
      const userMatch = line.match(/(?:user|for)\s+(\S+)/i);
      const user = userMatch ? userMatch[1] : "unknown";

      if (/Invalid user|Failed password|authentication failure/i.test(line)) {
        events.push({ timestamp: ts, type: "failure", user, ip, message: line.slice(0, 120) });
      } else if (/Accepted publickey|Accepted password/i.test(line)) {
        events.push({ timestamp: ts, type: "success", user, ip, message: line.slice(0, 120) });
      } else if (/Ban |BANNED/i.test(line)) {
        events.push({ timestamp: ts, type: "ban", user, ip, message: line.slice(0, 120) });
      }
    }
  } catch { }

  // Also check fail2ban status
  try {
    const f2b = run("fail2ban-client status sshd 2>/dev/null");
    const bannedMatch = f2b.match(/Banned IP list:\s+(.+)/);
    if (bannedMatch) {
      const ips = bannedMatch[1].trim().split(/\s+/);
      for (const ip of ips.filter(Boolean)) {
        events.push({ timestamp: new Date().toISOString(), type: "ban", user: "sshd", ip, message: `Fail2Ban active ban: ${ip}` });
      }
    }
  } catch { }

  return events.slice(-50);
}

// ─── File Integrity ───────────────────────────────────────────────────────────

export function checkFileIntegrity(): FileIntegrityResult[] {
  const results: FileIntegrityResult[] = [];
  const criticalPaths = [
    "/var/www/gcs/.env",
    "/var/www/gcs/.env.production",
    "/etc/nginx/sites-available/itatgcs.com",
    "/etc/nginx/nginx.conf",
    "/etc/ssh/sshd_config",
    "/etc/passwd",
    "/etc/shadow",
    "/etc/sudoers",
    "/var/www/gcs/package.json",
  ];

  for (const p of criticalPaths) {
    try {
      const stat = run(`stat -c "%a %U %G" "${p}" 2>/dev/null`);
      if (!stat) { results.push({ path: p, status: "warning", permissions: "???", owner: "???", issue: "File not found or inaccessible" }); continue; }
      const [perms, owner] = stat.split(" ");
      const permNum = parseInt(perms);

      let status: FileIntegrityResult["status"] = "ok";
      let issue: string | undefined;

      // Check dangerous permissions
      if (p.includes(".env") && permNum > 600) {
        status = "danger";
        issue = `World-readable .env file (${perms}) — should be 600`;
      } else if (p.includes("shadow") && permNum > 640) {
        status = "danger";
        issue = `Shadow file too permissive (${perms})`;
      } else if (p.includes("sudoers") && permNum > 440) {
        status = "danger";
        issue = `Sudoers too permissive (${perms})`;
      } else if (p.includes("sshd_config") && permNum > 644) {
        status = "warning";
        issue = `SSH config writable by non-root (${perms})`;
      }

      results.push({ path: p, status, permissions: perms, owner, issue });
    } catch {
      results.push({ path: p, status: "warning", permissions: "???", owner: "???", issue: "Error reading file" });
    }
  }
  return results;
}

// ─── Security Findings ────────────────────────────────────────────────────────

export function runSecurityChecks(
  ports: PortInfo[],
  services: ServiceInfo[],
  patches: PatchInfo,
  authEvents: AuthEvent[],
  fileIntegrity: FileIntegrityResult[],
  metrics: SystemMetrics,
  serverType: ServerType
): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  // --- Firewall (iptables — UFW is disabled on this server) ---
  const iptablesRules = run("iptables -L INPUT -n 2>/dev/null | wc -l");
  const ruleCount = parseInt(iptablesRules) || 0;
  if (ruleCount <= 2) {
    // Only header + default policy = no rules
    findings.push({ id: uid(), category: "firewall", severity: "CRITICAL", title: "No Firewall Rules Active", description: "iptables has no INPUT rules. Server ports are fully exposed.", remediation: "Add iptables rules to restrict access. Do NOT use ufw (broken on this server)." });
  } else {
    findings.push({ id: uid(), category: "firewall", severity: "INFO", title: `Firewall Active (${ruleCount - 2} iptables rules)`, description: "iptables INPUT chain has active filtering rules.", remediation: "No action needed." });
  }

  // --- Fail2Ban ---
  const f2bActive = services.find(s => s.name === "fail2ban")?.status === "active";
  if (!f2bActive) {
    findings.push({ id: uid(), category: "auth", severity: "HIGH", title: "Fail2Ban is not running", description: "Brute-force protection is offline.", remediation: "Run: systemctl start fail2ban && systemctl enable fail2ban" });
  } else {
    const bannedCount = authEvents.filter(e => e.type === "ban").length;
    findings.push({ id: uid(), category: "auth", severity: "INFO", title: `Fail2Ban Active (${bannedCount} IPs banned)`, description: "Brute-force protection is running.", remediation: "No action needed." });
  }

  // --- SSH ---
  const sshConfig = run("cat /etc/ssh/sshd_config 2>/dev/null");
  if (sshConfig.includes("PasswordAuthentication yes")) {
    findings.push({ id: uid(), category: "auth", severity: "HIGH", title: "SSH Password Auth Enabled", description: "Password-based SSH login is enabled. Brute-force risk.", remediation: "Set PasswordAuthentication no in /etc/ssh/sshd_config" });
  } else {
    findings.push({ id: uid(), category: "auth", severity: "INFO", title: "SSH: Key-only Authentication", description: "Password SSH login is disabled. Good.", remediation: "No action needed." });
  }

  if (sshConfig.match(/^Port\s+22/m) || !sshConfig.match(/^Port\s+/m)) {
    // Check if fail2ban is protecting SSH — if so, port 22 is acceptable
    const f2bActive = run("systemctl is-active fail2ban 2>/dev/null").trim() === "active";
    const keyOnly = sshConfig.includes("PasswordAuthentication no");
    if (f2bActive && keyOnly) {
      findings.push({ id: uid(), category: "network", severity: "INFO", title: "SSH on Port 22 (Protected)", description: "Default SSH port with fail2ban active and key-only auth. Acceptable security posture.", remediation: "No action needed — fail2ban blocks brute force, password auth is disabled." });
    } else {
      findings.push({ id: uid(), category: "network", severity: "LOW", title: "SSH on Default Port 22", description: "Using the default SSH port increases automated attack surface.", remediation: f2bActive ? "Password auth is still enabled — disable it." : "Enable fail2ban and disable password authentication." });
    }
  }

  const rootLogin = sshConfig.match(/^PermitRootLogin\s+(.+)/m)?.[1]?.trim();
  if (rootLogin === "yes") {
    findings.push({ id: uid(), category: "auth", severity: "CRITICAL", title: "Root SSH Login Allowed", description: "Direct root login via SSH is permitted.", remediation: "Set PermitRootLogin prohibit-password or no in sshd_config" });
  } else {
    findings.push({ id: uid(), category: "auth", severity: "INFO", title: `SSH Root Login: ${rootLogin || "prohibit-password"}`, description: "Root login is properly restricted.", remediation: "No action needed." });
  }

  // --- Brute Force ---
  const recentFailures = authEvents.filter(e => e.type === "failure").length;
  const f2bRunning = run("systemctl is-active fail2ban 2>/dev/null").trim() === "active";
  const f2bBanned = parseInt(run("fail2ban-client status sshd 2>/dev/null | grep 'Currently banned' | awk '{print $NF}'").trim() || "0", 10);
  if (recentFailures > 20 && !f2bRunning) {
    findings.push({ id: uid(), category: "auth", severity: "HIGH", title: `${recentFailures} SSH Brute-Force Attempts (Unprotected!)`, description: `${recentFailures} failed SSH login attempts and fail2ban is NOT running.`, remediation: "Install and enable fail2ban immediately: apt install fail2ban && systemctl enable --now fail2ban", value: `${recentFailures} attempts` });
  } else if (recentFailures > 20) {
    findings.push({ id: uid(), category: "auth", severity: "MEDIUM", title: `${recentFailures} SSH Login Attempts (${f2bBanned} IPs Banned)`, description: `${recentFailures} failed attempts detected. Fail2ban is active and has banned ${f2bBanned} IPs.`, remediation: "Fail2ban is handling this. Review banned IPs: fail2ban-client status sshd", value: `${recentFailures} attempts` });
  } else if (recentFailures > 0 && f2bRunning) {
    findings.push({ id: uid(), category: "auth", severity: "INFO", title: `${recentFailures} Failed SSH Logins (Fail2ban Active)`, description: `${recentFailures} failed attempts — normal internet noise. Fail2ban is active with ${f2bBanned} IPs currently banned.`, remediation: "No action needed — fail2ban is protecting SSH.", value: `${recentFailures} attempts` });
  } else if (recentFailures > 0) {
    findings.push({ id: uid(), category: "auth", severity: "MEDIUM", title: `${recentFailures} Failed SSH Logins`, description: "Failed SSH attempts detected without fail2ban protection.", remediation: "Install fail2ban: apt install fail2ban && systemctl enable --now fail2ban", value: `${recentFailures} attempts` });
  }

  // --- Unnecessary / Dangerous Ports (based on detected server type) ---
  const flaggedPorts = ports.filter(p => !serverType.expectedPorts.includes(p.port));
  for (const dp of flaggedPorts) {
    const isLocalOnly = dp.address === "127.0.0.1" || dp.address === "::1" || dp.address.startsWith("127.");
    const severity = isLocalOnly ? "LOW" : (dp.risk === "critical" ? "CRITICAL" : dp.risk === "high" ? "HIGH" : "MEDIUM");
    findings.push({
      id: uid(),
      category: "network",
      severity,
      title: `${isLocalOnly ? "[Local] " : ""}Port ${dp.port} Open (${dp.service})`,
      description: `${dp.service} is listening on ${dp.address}:${dp.port}.${isLocalOnly ? " Localhost only — lower risk." : ` Publicly accessible — not expected for ${serverType.label}.`}`,
      remediation: isLocalOnly ? "Verify this service is required." : `This port is not expected on a ${serverType.label}. Disable the service or firewall port ${dp.port}.`,
      value: `${dp.address}:${dp.port}`,
    });
  }

  // --- Patches ---
  if (patches.security > 0) {
    findings.push({ id: uid(), category: "packages", severity: "HIGH", title: `${patches.security} Security Updates Pending`, description: `${patches.security} security patches are available and not applied.`, remediation: "Run: apt-get upgrade -y", value: `${patches.security} updates` });
  }
  if (patches.total > 0 && patches.security === 0) {
    findings.push({ id: uid(), category: "packages", severity: "MEDIUM", title: `${patches.total} Package Updates Available`, description: "Non-security package updates are pending.", remediation: "Run: apt-get upgrade -y", value: `${patches.total} updates` });
  } else if (patches.total === 0) {
    findings.push({ id: uid(), category: "packages", severity: "INFO", title: "All Packages Up to Date", description: "No pending package updates.", remediation: "No action needed." });
  }

  // --- File Integrity ---
  for (const fi of fileIntegrity) {
    if (fi.status === "danger") {
      findings.push({ id: uid(), category: "files", severity: "HIGH", title: `Dangerous Permissions: ${fi.path.split("/").pop()}`, description: fi.issue || "File has dangerous permissions.", remediation: `chmod 600 ${fi.path}`, value: fi.permissions });
    } else if (fi.status === "warning") {
      findings.push({ id: uid(), category: "files", severity: "MEDIUM", title: `Permission Warning: ${fi.path.split("/").pop()}`, description: fi.issue || "File permissions may be too permissive.", remediation: `Review and tighten permissions on ${fi.path}`, value: fi.permissions });
    }
  }

  // --- Services ---
  const nginxUp = services.find(s => s.name === "nginx")?.status === "active";
  if (!nginxUp) {
    findings.push({ id: uid(), category: "services", severity: "CRITICAL", title: "Nginx is DOWN", description: "Web server is not running — site is offline.", remediation: "Run: systemctl start nginx" });
  }

  // --- System Resources ---
  if (metrics.cpuPercent > 90) {
    findings.push({ id: uid(), category: "system", severity: "HIGH", title: `CPU Critical: ${metrics.cpuPercent.toFixed(1)}%`, description: "CPU usage is critically high. Possible attack or runaway process.", remediation: "Run: top -bn1 to identify the culprit process.", value: `${metrics.cpuPercent.toFixed(1)}%` });
  } else if (metrics.cpuPercent > 70) {
    findings.push({ id: uid(), category: "system", severity: "MEDIUM", title: `CPU High: ${metrics.cpuPercent.toFixed(1)}%`, description: "CPU usage is elevated.", remediation: "Monitor with: top or htop", value: `${metrics.cpuPercent.toFixed(1)}%` });
  }

  if (metrics.memPercent > 90) {
    findings.push({ id: uid(), category: "system", severity: "HIGH", title: `Memory Critical: ${metrics.memPercent}%`, description: "Memory usage is critically high.", remediation: "Identify memory hogs with: ps aux --sort=-%mem | head", value: `${metrics.memPercent}%` });
  }

  if (metrics.diskPercent > 90) {
    findings.push({ id: uid(), category: "system", severity: "CRITICAL", title: `Disk Almost Full: ${metrics.diskPercent}%`, description: "Disk usage is critical. System may crash or become unstable.", remediation: "Free up disk space: find /var/log -name '*.gz' -delete", value: `${metrics.diskPercent}%` });
  } else if (metrics.diskPercent > 75) {
    findings.push({ id: uid(), category: "system", severity: "MEDIUM", title: `Disk Usage High: ${metrics.diskPercent}%`, description: "Disk is filling up.", remediation: "Monitor disk usage regularly.", value: `${metrics.diskPercent}%` });
  }

  // --- Unexpected Services (based on server type) ---
  for (const svcName of serverType.unexpectedServices) {
    const svc = services.find(s => s.name === svcName);
    const snapInstalled = run(`snap list ${svcName} 2>/dev/null`).includes(svcName);
    const isActive = svc?.status === "active" || snapInstalled;
    if (isActive) {
      findings.push({
        id: uid(), category: "services", severity: "MEDIUM",
        title: `Unexpected Service: ${svcName}`,
        description: `${svcName} is running on a ${serverType.label} — not expected for this server type and increases attack surface.`,
        remediation: `Remove: snap remove ${svcName} OR systemctl stop ${svcName} && systemctl disable ${svcName}`,
      });
    }
  }
  // Also check CUPS specifically (can hide as snap)
  const cupsSnap = run("snap list cups 2>/dev/null").includes("cups");
  const cupsListening = ports.some(p => p.port === 631);
  if (cupsListening || cupsSnap) {
    findings.push({ id: uid(), category: "services", severity: "MEDIUM", title: "CUPS Printing Service Running", description: `Print service is active on a ${serverType.label} — unnecessary attack surface.`, remediation: "Remove: snap remove cups OR systemctl stop cups && systemctl disable cups" });
  }

  // --- SSL ---
  const sslExpiry = run("echo | openssl s_client -connect itatgcs.com:443 -servername itatgcs.com 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null");
  if (sslExpiry) {
    const match = sslExpiry.match(/notAfter=(.+)/);
    if (match) {
      const expiry = new Date(match[1]);
      const daysLeft = Math.floor((expiry.getTime() - Date.now()) / 86400000);
      if (daysLeft < 14) {
        findings.push({ id: uid(), category: "ssl", severity: "CRITICAL", title: `SSL Certificate Expires in ${daysLeft} days`, description: `Certificate expires on ${expiry.toDateString()}`, remediation: "Renew SSL certificate: certbot renew", value: `${daysLeft} days` });
      } else if (daysLeft < 30) {
        findings.push({ id: uid(), category: "ssl", severity: "HIGH", title: `SSL Certificate Expires in ${daysLeft} days`, description: `Certificate expires on ${expiry.toDateString()}`, remediation: "Schedule SSL renewal soon.", value: `${daysLeft} days` });
      } else {
        findings.push({ id: uid(), category: "ssl", severity: "INFO", title: `SSL Certificate Valid (${daysLeft} days)`, description: `Certificate expires on ${expiry.toDateString()}`, remediation: "No action needed.", value: `${daysLeft} days` });
      }
    }
  }

  // --- Nginx headers ---
  const nextConfig = run("cat /var/www/gcs/next.config.ts 2>/dev/null | grep -c 'X-Frame-Options\\|Content-Security-Policy'");
  if (parseInt(nextConfig) >= 1) {
    findings.push({ id: uid(), category: "network", severity: "INFO", title: "Security Headers Active", description: "X-Frame-Options, CSP, HSTS and other security headers are configured.", remediation: "No action needed." });
  }

  return findings;
}

// ─── Threat Score ─────────────────────────────────────────────────────────────

export function computeThreatScore(findings: SecurityFinding[]): { score: number; level: ScanResult["threatLevel"]; grade: ScanResult["grade"] } {
  let score = 0;
  for (const f of findings) {
    if (f.severity === "CRITICAL") score += 30;
    else if (f.severity === "HIGH") score += 15;
    else if (f.severity === "MEDIUM") score += 5;
    else if (f.severity === "LOW") score += 1;
  }
  score = Math.min(score, 100);

  const level: ScanResult["threatLevel"] = score >= 50 ? "CRITICAL" : score >= 30 ? "HIGH" : score >= 10 ? "ELEVATED" : "LOW";

  // Grade: invert score
  const safeScore = 100 - score;
  const grade: ScanResult["grade"] = safeScore >= 90 ? "A" : safeScore >= 80 ? "B" : safeScore >= 65 ? "C" : safeScore >= 50 ? "D" : "F";

  return { score, level, grade };
}

// ─── Connection Audit & Device Tracing ────────────────────────────────────────

const AUDIT_LOG_PATH = "/var/log/gcs-audit.log";

export function writeAuditLog(category: string, details: string): void {
  try {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${category}] ${details}\n`;
    fs.appendFileSync(AUDIT_LOG_PATH, line);
  } catch {
    // Audit log write failure is non-fatal
  }
}

export function getAdminKeyFingerprint(): string {
  try {
    const out = run("ssh-keygen -lf /home/ubuntu/.ssh/authorized_keys 2>/dev/null | head -5 || ssh-keygen -lf /root/.ssh/authorized_keys 2>/dev/null | head -5");
    return out || "unknown";
  } catch {
    return "unknown";
  }
}

export function checkActiveConnections(): ConnectionAudit {
  const activeConnections: ActiveConnection[] = [];
  const sshSessions: SSHSession[] = [];
  const neighbors: NetworkNeighbor[] = [];

  // Active TCP connections (exclude localhost-to-localhost internal traffic)
  try {
    const ssOut = run("ss -tnp 2>/dev/null | grep ESTAB");
    for (const line of ssOut.split("\n").filter(Boolean)) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 5) continue;
      const localParts = parts[3].match(/(.+):(\d+)$/);
      const remoteParts = parts[4].match(/(.+):(\d+)$/);
      if (!localParts || !remoteParts) continue;

      const procMatch = line.match(/users:\(\("([^"]+)",pid=(\d+)/);
      // FILTER: Skip localhost-to-localhost connections (127.0.0.1, ::1)
      // These are internal app connections (e.g., Next.js → PostgreSQL) and are safe
      const remoteAddr = remoteParts[1];
      if (remoteAddr === "127.0.0.1" || remoteAddr === "::1") continue;
      activeConnections.push({
        protocol: "TCP",
        localAddr: localParts[1],
        localPort: parseInt(localParts[2]),
        remoteAddr: remoteAddr,
        remotePort: parseInt(remoteParts[2]),
        state: "ESTABLISHED",
        process: procMatch ? procMatch[1] : "unknown",
        pid: procMatch ? procMatch[2] : "",
      });
    }
  } catch { }

  // Current SSH sessions with key fingerprints
  try {
    const whoOut = run("who 2>/dev/null");
    for (const line of whoOut.split("\n").filter(Boolean)) {
      const match = line.match(/^(\S+)\s+(\S+)\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}|\w+\s+\w+\s+\d+\s+\d+:\d+)\s+\((.+?)\)/);
      if (!match) continue;
      const [, user, tty, loginTime, ip] = match;

      // Try to get key fingerprint for this session from auth.log
      let keyFingerprint: string | undefined;
      try {
        const keyLog = run(`grep "Accepted publickey for ${user} from ${ip}" /var/log/auth.log 2>/dev/null | tail -1`);
        const fpMatch = keyLog.match(/SHA256:\S+/);
        if (fpMatch) keyFingerprint = fpMatch[0];
      } catch { }

      sshSessions.push({ user, ip, loginTime, tty, keyFingerprint });
    }
  } catch { }

  // ARP/neighbor table (MAC addresses on local network)
  try {
    const arpOut = run("ip neigh show 2>/dev/null || arp -n 2>/dev/null");
    for (const line of arpOut.split("\n").filter(Boolean)) {
      // ip neigh format: "IP dev IFACE lladdr MAC state"
      const ipNeighMatch = line.match(/^(\S+)\s+dev\s+(\S+)\s+lladdr\s+(\S+)\s+(\S+)/);
      if (ipNeighMatch) {
        neighbors.push({
          ip: ipNeighMatch[1],
          interface: ipNeighMatch[2],
          mac: ipNeighMatch[3],
          state: ipNeighMatch[4],
        });
        continue;
      }
      // arp -n format: "IP HWtype HWaddress Flags Iface"
      const arpMatch = line.match(/^(\S+)\s+\S+\s+(\S+)\s+\S+\s+(\S+)/);
      if (arpMatch && arpMatch[2] !== "(incomplete)") {
        neighbors.push({
          ip: arpMatch[1],
          interface: arpMatch[3],
          mac: arpMatch[2],
          state: "reachable",
        });
      }
    }
  } catch { }

  // Admin key fingerprint
  const adminKeyFingerprint = getAdminKeyFingerprint();

  // Check if a trusted admin session is active (matching key fingerprint)
  const trustedSessionActive = sshSessions.some(s =>
    s.keyFingerprint && adminKeyFingerprint.includes(s.keyFingerprint.replace("SHA256:", ""))
  );

  return { activeConnections, sshSessions, neighbors, adminKeyFingerprint, trustedSessionActive };
}

// ─── Master Scan ──────────────────────────────────────────────────────────────

export async function runFullScan(): Promise<ScanResult> {
  const metrics = getSystemMetrics();
  const ports = scanOpenPorts();
  const services = checkServices();
  const patches = checkPatches();
  const authEvents = checkAuthLog();
  const fileIntegrity = checkFileIntegrity();
  const connectionAudit = checkActiveConnections();
  const serverType = detectServerType(ports);
  const findings = runSecurityChecks(ports, services, patches, authEvents, fileIntegrity, metrics, serverType);
  const { score, level, grade } = computeThreatScore(findings);

  // Write audit log entry for the scan
  const nonInfo = findings.filter(f => f.severity !== "INFO").length;
  const connCount = connectionAudit.activeConnections.length;
  const sshCount = connectionAudit.sshSessions.length;
  writeAuditLog("SCAN_RESULT",
    `grade=${grade} score=${score} findings=${nonInfo} connections=${connCount} ssh_sessions=${sshCount} ` +
    `trusted_admin=${connectionAudit.trustedSessionActive}`
  );

  // Log each SSH session for traceability
  for (const sess of connectionAudit.sshSessions) {
    writeAuditLog("SSH_SESSION",
      `user=${sess.user} ip=${sess.ip} tty=${sess.tty} key=${sess.keyFingerprint || "none"} login=${sess.loginTime}`
    );
  }

  // Log suspicious connections (non-standard ports from external IPs)
  const safeLocalPorts = new Set([22, 80, 443, 3000, 5432, 9876]);
  for (const conn of connectionAudit.activeConnections) {
    if (conn.remoteAddr === "127.0.0.1" || conn.remoteAddr === "::1") continue;
    if (!safeLocalPorts.has(conn.localPort)) {
      writeAuditLog("SUSPICIOUS_CONN",
        `remote=${conn.remoteAddr}:${conn.remotePort} local_port=${conn.localPort} process=${conn.process} pid=${conn.pid}`
      );
    }
  }

  return {
    timestamp: new Date().toISOString(),
    serverType,
    metrics,
    findings,
    ports,
    services,
    patches,
    authEvents,
    fileIntegrity,
    connectionAudit,
    threatScore: score,
    threatLevel: level,
    grade,
  };
}
