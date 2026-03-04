// GcsGuard shared utilities

export const AGENT_STATUSES = {
  PENDING: { label: "Pending", color: "bg-yellow-500", textColor: "text-yellow-600" },
  ONLINE: { label: "Online", color: "bg-green-500", textColor: "text-green-600" },
  OFFLINE: { label: "Offline", color: "bg-red-500", textColor: "text-red-600" },
  DEGRADED: { label: "Degraded", color: "bg-orange-500", textColor: "text-orange-600" },
} as const;

export const ALERT_SEVERITIES = {
  CRITICAL: { label: "Critical", color: "bg-red-600", textColor: "text-red-600", icon: "AlertTriangle" },
  HIGH: { label: "High", color: "bg-orange-500", textColor: "text-orange-600", icon: "AlertCircle" },
  MEDIUM: { label: "Medium", color: "bg-yellow-500", textColor: "text-yellow-600", icon: "AlertCircle" },
  LOW: { label: "Low", color: "bg-blue-500", textColor: "text-blue-600", icon: "Info" },
  INFO: { label: "Info", color: "bg-gray-400", textColor: "text-gray-500", icon: "Info" },
} as const;

export const ALERT_TYPES = {
  BRUTE_FORCE: { label: "Brute Force", icon: "ShieldAlert" },
  FILE_CHANGE: { label: "File Change", icon: "FileWarning" },
  SUSPICIOUS_PROCESS: { label: "Suspicious Process", icon: "Bug" },
  PORT_SCAN: { label: "Port Scan", icon: "Scan" },
  MALWARE: { label: "Malware", icon: "Skull" },
  CONFIG_CHANGE: { label: "Config Change", icon: "Settings" },
  RESOURCE_SPIKE: { label: "Resource Spike", icon: "Activity" },
  NEW_DEVICE: { label: "New Device", icon: "Wifi" },
  UNAUTHORIZED_DEVICE: { label: "Unauthorized Device", icon: "WifiOff" },
} as const;

export const DEVICE_TYPES = {
  WORKSTATION: { label: "Workstation", icon: "Monitor" },
  SERVER: { label: "Server", icon: "Server" },
  PRINTER: { label: "Printer", icon: "Printer" },
  IP_PHONE: { label: "IP Phone", icon: "Phone" },
  WIFI_AP: { label: "WiFi AP", icon: "Wifi" },
  ROUTER: { label: "Router", icon: "Router" },
  SWITCH: { label: "Switch", icon: "Network" },
  IOT: { label: "IoT Device", icon: "Cpu" },
  CAMERA: { label: "Camera", icon: "Camera" },
  UNKNOWN: { label: "Unknown", icon: "HelpCircle" },
} as const;

export const COMMAND_TYPES = {
  BLOCK_IP: { label: "Block IP", description: "Block an IP address via firewall" },
  UNBLOCK_IP: { label: "Unblock IP", description: "Remove IP from firewall blocklist" },
  RESTART_SERVICE: { label: "Restart Service", description: "Restart a system service" },
  RUN_SCAN: { label: "Run Scan", description: "Execute a security scan" },
  KILL_PROCESS: { label: "Kill Process", description: "Terminate a running process" },
  NETWORK_SCAN: { label: "Network Scan", description: "Discover devices on the network" },
  CUSTOM: { label: "Custom Command", description: "Run a custom shell command" },
} as const;

export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function timeAgo(date: Date | string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function isAgentOnline(lastHeartbeat: Date | string | null): boolean {
  if (!lastHeartbeat) return false;
  return Date.now() - new Date(lastHeartbeat).getTime() < 90_000; // 90s threshold
}

export function threatLevel(
  criticalAlerts: number,
  highAlerts: number,
  mediumAlerts: number
): { level: string; color: string; score: number } {
  const score = criticalAlerts * 30 + highAlerts * 15 + mediumAlerts * 5;
  if (score >= 50) return { level: "CRITICAL", color: "text-red-600", score: Math.min(score, 100) };
  if (score >= 30) return { level: "HIGH", color: "text-orange-600", score };
  if (score >= 10) return { level: "ELEVATED", color: "text-yellow-600", score };
  return { level: "LOW", color: "text-green-600", score };
}
