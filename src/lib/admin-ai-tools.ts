/**
 * GcsGuard AI — Admin tool definitions and executors.
 * Each tool maps to a direct Prisma operation.
 * Claude decides which tools to call based on the user's request.
 */

import { db } from "@/lib/db";
import { encryptIfPresent, decryptIfPresent } from "@/lib/vault-crypto";
import type Anthropic from "@anthropic-ai/sdk";
import {
  sshListFiles, sshReadFile, sshWriteFile, sshEditFile,
  sshCreateDirectory, sshDeleteFile, sshSearchCode,
  sshRunCommand, sshInstallPackage, sshGitStatus,
  sshGitCommitAndPush, sshServerRebuild,
} from "./admin-ai-ssh-tools";
import {
  browserOpen, browserAction, browserClose, browserSessions,
} from "./admin-ai-browser";

type ToolDef = Anthropic.Tool;

// Tools that require admin confirmation before execution
export const DANGEROUS_TOOLS = new Set([
  "write_file", "edit_file", "create_directory", "delete_file",
  "run_command", "install_package", "git_commit_and_push", "server_rebuild",
  "delete_organization",
  "create_vault_entry", "update_vault_entry",
  "browser_open", "browser_action", "browser_close",
]);

export function isDangerousTool(name: string): boolean {
  return DANGEROUS_TOOLS.has(name);
}

// ─── Tool Definitions (for Claude) ──────────────────────────────────────────

export const adminTools: ToolDef[] = [
  {
    name: "get_system_stats",
    description: "Get overall system statistics — total orgs, users, projects, invoices, tickets, agents, alerts. Use this when the admin asks for a system overview or dashboard summary.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "list_organizations",
    description: "List all organizations with user/project/invoice/ticket/agent counts. Supports search by name.",
    input_schema: {
      type: "object" as const,
      properties: { search: { type: "string", description: "Optional search term to filter by name" } },
      required: [],
    },
  },
  {
    name: "get_organization",
    description: "Get detailed info about a specific organization including its users.",
    input_schema: {
      type: "object" as const,
      properties: { id: { type: "string", description: "Organization ID" } },
      required: ["id"],
    },
  },
  {
    name: "create_organization",
    description: "Create a new organization. Only 'name' is required.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string" }, domain: { type: "string" }, website: { type: "string" },
        phone: { type: "string" }, email: { type: "string" }, address: { type: "string" },
        city: { type: "string" }, state: { type: "string" }, zipCode: { type: "string" },
        industry: { type: "string" }, description: { type: "string" },
        subscriptionTier: { type: "string", enum: ["NONE", "GCSGUARD_MANAGED_FREE", "GCSGUARD_MANAGED", "GCSGUARD_NON_MANAGED"] },
      },
      required: ["name"],
    },
  },
  {
    name: "update_organization",
    description: "Update an existing organization's fields.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string" }, name: { type: "string" }, domain: { type: "string" },
        website: { type: "string" }, phone: { type: "string" }, email: { type: "string" },
        address: { type: "string" }, city: { type: "string" }, state: { type: "string" },
        industry: { type: "string" }, subscriptionTier: { type: "string" }, isActive: { type: "boolean" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_organization",
    description: "Soft-delete an organization (sets deletedAt + isActive=false). Fails if org has users.",
    input_schema: {
      type: "object" as const,
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "list_users",
    description: "List users. Optionally filter by organization ID, role, or active status.",
    input_schema: {
      type: "object" as const,
      properties: {
        organizationId: { type: "string" }, role: { type: "string" },
        isActive: { type: "boolean" }, search: { type: "string" },
      },
      required: [],
    },
  },
  {
    name: "update_user",
    description: "Update a user's role or active status.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string" }, role: { type: "string", enum: ["ADMIN", "STAFF", "CLIENT_ADMIN", "CLIENT_USER"] },
        isActive: { type: "boolean" },
      },
      required: ["id"],
    },
  },
  {
    name: "list_projects",
    description: "List projects. Optionally filter by status or organization.",
    input_schema: {
      type: "object" as const,
      properties: {
        organizationId: { type: "string" }, status: { type: "string" }, search: { type: "string" },
      },
      required: [],
    },
  },
  {
    name: "create_project",
    description: "Create a new project.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string" }, description: { type: "string" }, organizationId: { type: "string" },
        ownerId: { type: "string" }, status: { type: "string" },
      },
      required: ["name", "organizationId", "ownerId"],
    },
  },
  {
    name: "update_project",
    description: "Update project fields (status, progress, description, etc.).",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string" }, name: { type: "string" }, status: { type: "string" },
        progress: { type: "number" }, description: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "list_invoices",
    description: "List invoices. Optionally filter by status or organization.",
    input_schema: {
      type: "object" as const,
      properties: {
        organizationId: { type: "string" }, status: { type: "string" }, search: { type: "string" },
      },
      required: [],
    },
  },
  {
    name: "update_invoice",
    description: "Update invoice fields (status, amount, dueDate, notes).",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string" }, status: { type: "string" }, amount: { type: "number" }, notes: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "list_tickets",
    description: "List support tickets. Optionally filter by status, priority, or organization.",
    input_schema: {
      type: "object" as const,
      properties: {
        organizationId: { type: "string" }, status: { type: "string" },
        priority: { type: "string" }, search: { type: "string" },
      },
      required: [],
    },
  },
  {
    name: "update_ticket",
    description: "Update a support ticket (status, priority, assignedToId).",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string" }, status: { type: "string" }, priority: { type: "string" },
        assignedToId: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "reply_to_ticket",
    description: "Add a reply/message to a support ticket.",
    input_schema: {
      type: "object" as const,
      properties: {
        ticketId: { type: "string" }, content: { type: "string" }, userId: { type: "string" },
      },
      required: ["ticketId", "content", "userId"],
    },
  },
  {
    name: "list_guard_agents",
    description: "List all GcsGuard security agents with status and alert counts.",
    input_schema: {
      type: "object" as const,
      properties: { organizationId: { type: "string" } },
      required: [],
    },
  },
  {
    name: "list_guard_alerts",
    description: "List security alerts. Filter by status, severity, or agent.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: { type: "string" }, severity: { type: "string" },
        agentId: { type: "string" }, limit: { type: "number" },
      },
      required: [],
    },
  },
  {
    name: "update_alert_status",
    description: "Update a security alert's status (OPEN, INVESTIGATING, RESOLVED, FALSE_POSITIVE).",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string" }, status: { type: "string", enum: ["OPEN", "INVESTIGATING", "RESOLVED", "FALSE_POSITIVE"] },
      },
      required: ["id", "status"],
    },
  },
  {
    name: "search_everything",
    description: "Search across organizations, users, projects, invoices, and tickets by a keyword.",
    input_schema: {
      type: "object" as const,
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
  // ─── SSH / Server Tools ──────────────────────────────────────────────────
  {
    name: "list_files",
    description: "List files and directories on the GCS production server. Can list any path on the server.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "Directory path to list (default: /var/www/gcs)" },
        pattern: { type: "string", description: "Optional glob pattern to filter files (e.g. '*.ts')" },
      },
      required: [],
    },
  },
  {
    name: "read_file",
    description: "Read the contents of any file on the GCS production server.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "Absolute path to the file" },
        lines: { type: "number", description: "Optional: only read first N lines" },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Write or create a file on the GCS production server. Creates parent directories automatically. DANGEROUS: requires admin confirmation.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "Absolute path for the file" },
        content: { type: "string", description: "File content to write" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "edit_file",
    description: "Edit a file on the GCS production server by replacing a string. DANGEROUS: requires admin confirmation.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "Absolute path to the file" },
        old_string: { type: "string", description: "The exact string to find and replace" },
        new_string: { type: "string", description: "The replacement string" },
        replace_all: { type: "boolean", description: "Replace all occurrences (default: false)" },
      },
      required: ["path", "old_string", "new_string"],
    },
  },
  {
    name: "create_directory",
    description: "Create a directory on the GCS production server (supports nested creation like mkdir -p). DANGEROUS: requires admin confirmation.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "Absolute path for the directory" },
      },
      required: ["path"],
    },
  },
  {
    name: "delete_file",
    description: "Delete a file or directory on the GCS production server. DANGEROUS: requires admin confirmation.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "Absolute path to delete" },
        recursive: { type: "boolean", description: "Delete recursively if directory (default: false)" },
      },
      required: ["path"],
    },
  },
  {
    name: "search_code",
    description: "Search/grep through the GCS codebase on the production server.",
    input_schema: {
      type: "object" as const,
      properties: {
        pattern: { type: "string", description: "Search pattern (regex supported)" },
        path: { type: "string", description: "Directory to search in (default: /var/www/gcs/src)" },
        file_pattern: { type: "string", description: "File glob pattern (e.g. '*.tsx')" },
      },
      required: ["pattern"],
    },
  },
  {
    name: "run_command",
    description: "Execute any shell command on the GCS production server. Full root access. DANGEROUS: requires admin confirmation.",
    input_schema: {
      type: "object" as const,
      properties: {
        command: { type: "string", description: "The shell command to execute" },
        cwd: { type: "string", description: "Working directory (default: /var/www/gcs)" },
        timeout: { type: "number", description: "Timeout in ms (default: 120000)" },
      },
      required: ["command"],
    },
  },
  {
    name: "install_package",
    description: "Install npm packages in the GCS app directory on the production server. DANGEROUS: requires admin confirmation.",
    input_schema: {
      type: "object" as const,
      properties: {
        packages: { type: "string", description: "Package name(s) to install (e.g. 'lodash' or 'axios zod')" },
        dev: { type: "boolean", description: "Install as devDependency (default: false)" },
      },
      required: ["packages"],
    },
  },
  {
    name: "git_status",
    description: "Check git status, diff, and recent commits on the GCS production server.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "git_commit_and_push",
    description: "Stage, commit, and push changes to GitHub from the GCS production server. DANGEROUS: requires admin confirmation.",
    input_schema: {
      type: "object" as const,
      properties: {
        message: { type: "string", description: "Commit message" },
        files: { type: "array", items: { type: "string" }, description: "Specific files to stage (default: all changes)" },
      },
      required: ["message"],
    },
  },
  {
    name: "server_rebuild",
    description: "Run deploy.sh on the GCS production server to rebuild and restart the application. This will cause ~30-60s of downtime. IMPORTANT: NEVER call this tool directly. You MUST first ask the admin for explicit permission AND offer the option to run the build manually instead. Only call this tool after the admin confirms they want YOU to run it.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  // ─── Credential Vault ──────────────────────────────────────────────────
  {
    name: "list_vault_entries",
    description: "List credential vault entries. Returns labels, categories, and URLs — NO secrets. Use this first to find entries before revealing credentials.",
    input_schema: {
      type: "object" as const,
      properties: {
        search: { type: "string", description: "Search by label or description" },
        category: { type: "string", enum: ["CLOUD", "HOSTING", "EMAIL", "DOMAIN", "DATABASE", "API", "SOCIAL", "PAYMENT", "VPN", "OTHER"] },
      },
      required: [],
    },
  },
  {
    name: "get_vault_entry",
    description: "Get a vault entry WITH decrypted secrets (username, password, apiKey, notes). Use when the admin needs a specific credential. Always tell the admin which credential you retrieved.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "Vault entry ID" },
        fields: { type: "array", items: { type: "string", enum: ["username", "password", "apiKey", "notes"] }, description: "Which secret fields to decrypt (default: all)" },
      },
      required: ["id"],
    },
  },
  {
    name: "create_vault_entry",
    description: "Create a new credential vault entry. Encrypts sensitive fields automatically. DANGEROUS: requires admin confirmation.",
    input_schema: {
      type: "object" as const,
      properties: {
        label: { type: "string", description: "Display name (e.g. AWS Console, GitHub)" },
        category: { type: "string", enum: ["CLOUD", "HOSTING", "EMAIL", "DOMAIN", "DATABASE", "API", "SOCIAL", "PAYMENT", "VPN", "OTHER"] },
        url: { type: "string", description: "Login URL or service URL" },
        description: { type: "string", description: "What this credential is for" },
        username: { type: "string" }, password: { type: "string" },
        apiKey: { type: "string" }, notes: { type: "string" },
      },
      required: ["label", "category"],
    },
  },
  {
    name: "update_vault_entry",
    description: "Update an existing vault entry. Can update both plaintext and encrypted fields. DANGEROUS: requires admin confirmation.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string" }, label: { type: "string" }, category: { type: "string" },
        url: { type: "string" }, description: { type: "string" },
        username: { type: "string" }, password: { type: "string" },
        apiKey: { type: "string" }, notes: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "search_vault",
    description: "Search vault entries by label, category, or description. Returns matching entries without secrets.",
    input_schema: {
      type: "object" as const,
      properties: { query: { type: "string", description: "Search term" } },
      required: ["query"],
    },
  },
  // ─── Browser Automation ──────────────────────────────────────────────────
  {
    name: "browser_open",
    description: "Open a new headless browser session on the production server. Uses stealth mode with anti-bot-detection. Optionally navigate to a URL. Returns a session_id for subsequent actions. Max 3 concurrent sessions, auto-closes after 10 min idle. DANGEROUS: requires admin confirmation.",
    input_schema: {
      type: "object" as const,
      properties: {
        url: { type: "string", description: "Initial URL to navigate to (optional)" },
        viewport: {
          type: "object",
          properties: {
            width: { type: "number", description: "Viewport width (default: 1920)" },
            height: { type: "number", description: "Viewport height (default: 1080)" },
          },
          description: "Custom viewport size (optional)",
        },
      },
      required: [],
    },
  },
  {
    name: "browser_action",
    description: `Execute one or more sequential actions in an existing browser session. Actions execute at human speed with realistic typing delays and mouse movements (this is by design to avoid bot detection). If one action fails, remaining actions are skipped.

Available actions:
- navigate: Go to a URL — { action: "navigate", url: "https://..." }
- click: Click an element — { action: "click", selector: "#btn" }
- type: Type into a field at human speed — { action: "type", selector: "input[name=email]", text: "user@example.com", clear: true }
- set_value: Set input value directly (React-compatible, uses native setter + event dispatch) — { action: "set_value", selector: "#email", value: "user@example.com" }
- fill_form: Fill multiple fields atomically in one call (prevents React re-renders from clearing values) — { action: "fill_form", fields: [{ selector: "#email", value: "a@b.com" }, { selector: "#pass", value: "secret" }] }
- set_checked: Toggle checkbox/radio (React-compatible) — { action: "set_checked", selector: "#terms", checked: true }
- screenshot: Take a screenshot — { action: "screenshot", fullPage: false } → returns URL
- extract: Extract text from elements — { action: "extract", selector: "h1" } → returns text content
- wait: Wait for element or fixed time — { action: "wait", selector: ".loaded", timeout: 5000 }
- scroll: Scroll the page — { action: "scroll", direction: "down", amount: 500 }
- select: Select dropdown option — { action: "select", selector: "select#role", value: "admin" }
- evaluate: Run JavaScript in page — { action: "evaluate", script: "document.title" }

IMPORTANT — React/SPA form handling:
- If "type" action works but fields clear when moving to the next field, the site uses React controlled components.
- Use "fill_form" to set ALL field values atomically in a single call — this prevents re-renders between fields.
- Use "set_checked" for checkboxes instead of "click" — it properly triggers React's change handlers.
- After fill_form, verify with "extract" and then "click" the submit button.

To log into a service using vault credentials: first retrieve credentials with get_vault_entry, then use type/fill_form actions for username/password fields.
DANGEROUS: requires admin confirmation.`,
    input_schema: {
      type: "object" as const,
      properties: {
        session_id: { type: "string", description: "Session ID from browser_open" },
        actions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              action: {
                type: "string",
                enum: ["navigate", "click", "type", "set_value", "fill_form", "set_checked", "screenshot", "extract", "wait", "scroll", "select", "evaluate"],
              },
              url: { type: "string" },
              selector: { type: "string" },
              text: { type: "string" },
              clear: { type: "boolean" },
              fullPage: { type: "boolean" },
              direction: { type: "string", enum: ["up", "down"] },
              amount: { type: "number" },
              value: { type: "string" },
              script: { type: "string" },
              timeout: { type: "number" },
              attribute: { type: "string" },
              checked: { type: "boolean", description: "For set_checked action" },
              fields: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    selector: { type: "string" },
                    value: { type: "string" },
                  },
                  required: ["selector", "value"],
                },
                description: "For fill_form action — array of { selector, value } pairs",
              },
            },
            required: ["action"],
          },
          description: "Array of actions to execute sequentially at human speed",
        },
      },
      required: ["session_id", "actions"],
    },
  },
  {
    name: "browser_close",
    description: "Close a browser session and clean up resources on the server. Always close sessions when done. DANGEROUS: requires admin confirmation.",
    input_schema: {
      type: "object" as const,
      properties: {
        session_id: { type: "string", description: "Session ID to close" },
      },
      required: ["session_id"],
    },
  },
  {
    name: "browser_sessions",
    description: "List all active browser sessions with their URLs, titles, and idle times. Read-only.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  // ─── Analytics & Visitor Tracking ─────────────────────────────────────────
  {
    name: "get_analytics_overview",
    description: "Get visitor analytics overview: total visitors, page views, sessions, bounce rate, avg duration, top pages, referrers, device/browser/OS/country breakdowns. Use when admin asks about traffic, visitors, analytics, or site usage.",
    input_schema: {
      type: "object" as const,
      properties: {
        range: { type: "string", enum: ["24h", "7d", "30d", "90d", "all"], description: "Time range for analytics (default: 7d)" },
      },
      required: [],
    },
  },
  {
    name: "get_visitor_details",
    description: "Get detailed visitor profiles with device fingerprint, browser, OS, location, IP, referrer, UTM data, visit history. Use when admin asks about specific visitors, suspicious IPs, or wants to see who visited the site.",
    input_schema: {
      type: "object" as const,
      properties: {
        page: { type: "number", description: "Page number for pagination (default: 1)" },
        range: { type: "string", enum: ["24h", "7d", "30d", "90d", "all"], description: "Time range (default: 7d)" },
        fingerprint: { type: "string", description: "Specific visitor fingerprint to look up" },
        ip: { type: "string", description: "Filter by IP address" },
        country: { type: "string", description: "Filter by country name" },
      },
      required: [],
    },
  },
  {
    name: "get_analytics_realtime",
    description: "Get real-time analytics: visitors active in last 5 minutes, their pages, IPs, locations. Use when admin asks 'who is on the site right now' or about current traffic.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  // ─── Sub-Agent Delegation ───────────────────────────────────────────────
  {
    name: "delegate_task",
    description: `Delegate a task to a specialized sub-agent that works independently. Sub-agents run concurrently if you call multiple. Use this to parallelize work or offload focused tasks.

Available agents:
- "research": Web search agent (fast) — documentation, current info, web lookups
- "database": Database query agent (fast) — read-only queries across orgs, users, projects, tickets, alerts
- "server": Server inspection agent (fast) — list/read files, search code, git status
- "code": Code analysis agent (thorough) — deep code reading and pattern analysis

Sub-agents have NO access to dangerous operations (no writes, deletes, commands). Only you can execute those.
You can call delegate_task multiple times in one response — they all run in parallel.`,
    input_schema: {
      type: "object" as const,
      properties: {
        agent_type: {
          type: "string",
          enum: ["research", "database", "server", "code"],
          description: "Which specialized sub-agent to use",
        },
        task: {
          type: "string",
          description: "Clear description of what the sub-agent should accomplish",
        },
        context: {
          type: "string",
          description: "Relevant context from the conversation to help the sub-agent",
        },
      },
      required: ["agent_type", "task"],
    },
  },
];

// ─── Tool Executors ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolInput = Record<string, any>;

export async function executeTool(name: string, input: ToolInput): Promise<string> {
  try {
    switch (name) {
      case "get_system_stats": return JSON.stringify(await getSystemStats());
      case "list_organizations": return JSON.stringify(await listOrganizations(input));
      case "get_organization": return JSON.stringify(await getOrganization(input));
      case "create_organization": return JSON.stringify(await createOrganization(input));
      case "update_organization": return JSON.stringify(await updateOrganization(input));
      case "delete_organization": return JSON.stringify(await deleteOrganization(input));
      case "list_users": return JSON.stringify(await listUsers(input));
      case "update_user": return JSON.stringify(await updateUser(input));
      case "list_projects": return JSON.stringify(await listProjects(input));
      case "create_project": return JSON.stringify(await createProject(input));
      case "update_project": return JSON.stringify(await updateProject(input));
      case "list_invoices": return JSON.stringify(await listInvoices(input));
      case "update_invoice": return JSON.stringify(await updateInvoice(input));
      case "list_tickets": return JSON.stringify(await listTickets(input));
      case "update_ticket": return JSON.stringify(await updateTicket(input));
      case "reply_to_ticket": return JSON.stringify(await replyToTicket(input));
      case "list_guard_agents": return JSON.stringify(await listGuardAgents(input));
      case "list_guard_alerts": return JSON.stringify(await listGuardAlerts(input));
      case "update_alert_status": return JSON.stringify(await updateAlertStatus(input));
      case "search_everything": return JSON.stringify(await searchEverything(input));
      // Vault
      case "list_vault_entries": return JSON.stringify(await listVaultEntries(input));
      case "get_vault_entry": return JSON.stringify(await getVaultEntry(input));
      case "create_vault_entry": return JSON.stringify(await createVaultEntry(input));
      case "update_vault_entry": return JSON.stringify(await updateVaultEntry(input));
      case "search_vault": return JSON.stringify(await searchVault(input));
      // SSH / Server tools
      case "list_files": return await sshListFiles(input);
      case "read_file": return await sshReadFile(input);
      case "write_file": return await sshWriteFile(input);
      case "edit_file": return await sshEditFile(input);
      case "create_directory": return await sshCreateDirectory(input);
      case "delete_file": return await sshDeleteFile(input);
      case "search_code": return await sshSearchCode(input);
      case "run_command": return await sshRunCommand(input);
      case "install_package": return await sshInstallPackage(input);
      case "git_status": return await sshGitStatus();
      case "git_commit_and_push": return await sshGitCommitAndPush(input);
      case "server_rebuild": return await sshServerRebuild();
      // Browser automation
      case "browser_open": return await browserOpen(input);
      case "browser_action": return await browserAction(input);
      case "browser_close": return await browserClose(input);
      case "browser_sessions": return await browserSessions();
      // Analytics
      case "get_analytics_overview": return JSON.stringify(await getAnalyticsOverview(input));
      case "get_visitor_details": return JSON.stringify(await getVisitorDetails(input));
      case "get_analytics_realtime": return JSON.stringify(await getAnalyticsRealtime());
      case "delegate_task": return JSON.stringify({ error: "delegate_task must be handled by the chat route, not executeTool" });
      default: return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (err: unknown) {
    const errObj = err as { code?: string; meta?: Record<string, unknown>; message?: string };
    // Prisma known request errors — give AI actionable info
    if (errObj.code) {
      const hints: Record<string, string> = {
        P2002: "Unique constraint violation — a record with that value already exists. Try a different value or check for duplicates first.",
        P2025: "Record not found — the ID may be wrong. List records first to find the correct ID.",
        P2003: "Foreign key constraint failed — the referenced record doesn't exist. Verify the related ID.",
        P2000: "Value too long for the column. Use a shorter value.",
        P2006: "Invalid value for the field type. Check the data type (string vs number vs boolean).",
      };
      const hint = hints[errObj.code] || "Check the field names and values match the schema.";
      return JSON.stringify({
        error: `${errObj.code}: ${errObj.meta?.cause || errObj.meta?.target || errObj.message || "Database error"}`,
        hint,
        tool: name,
        input_received: input,
      });
    }
    return JSON.stringify({ error: String(err), tool: name, hint: "Unexpected error — check the input parameters and try again." });
  }
}

// ─── Implementations ────────────────────────────────────────────────────────

async function getSystemStats() {
  const [orgs, users, projects, invoices, tickets, agents, alerts] = await Promise.all([
    db.organization.count({ where: { deletedAt: null } }),
    db.user.count({ where: { deletedAt: null } }),
    db.project.count(),
    db.invoice.count(),
    db.ticket.count(),
    db.guardAgent.count(),
    db.guardAlert.count({ where: { status: "OPEN" } }),
  ]);
  return { organizations: orgs, users, projects, invoices, tickets, guardAgents: agents, openAlerts: alerts };
}

async function listOrganizations(input: ToolInput) {
  const where: ToolInput = { deletedAt: null };
  if (input.search) where.name = { contains: input.search };
  const orgs = await db.organization.findMany({
    where, orderBy: { name: "asc" }, take: 25,
    select: { id: true, name: true, domain: true, industry: true, subscriptionTier: true, isActive: true, _count: { select: { users: true, projects: true, invoices: true, guardAgents: true } } },
  });
  return { count: orgs.length, organizations: orgs };
}

async function getOrganization(input: ToolInput) {
  return db.organization.findUnique({
    where: { id: input.id },
    include: {
      users: { select: { id: true, name: true, email: true, role: true, isActive: true }, take: 20 },
      _count: { select: { projects: true, invoices: true, tickets: true, guardAgents: true } },
    },
  });
}

const ORG_FIELDS = ["name", "domain", "website", "phone", "email", "address", "city", "state", "zipCode", "country", "industry", "description", "subscriptionTier", "notes"];

function pickOrgFields(input: ToolInput) {
  const data: Record<string, unknown> = {};
  for (const key of ORG_FIELDS) {
    if (input[key] !== undefined) data[key] = input[key];
  }
  return data;
}

async function createOrganization(input: ToolInput) {
  const data = pickOrgFields(input);
  if (!data.name) return { error: "name is required" };
  return db.organization.create({ data: data as { name: string } });
}

async function updateOrganization(input: ToolInput) {
  const { id } = input;
  if (!id) return { error: "id is required" };
  const data = pickOrgFields(input);
  return db.organization.update({ where: { id }, data });
}

async function deleteOrganization(input: ToolInput) {
  const org = await db.organization.findUnique({ where: { id: input.id }, include: { _count: { select: { users: true } } } });
  if (!org) return { error: "Organization not found" };
  if (org._count.users > 0) return { error: `Cannot delete — has ${org._count.users} users` };
  await db.organization.update({ where: { id: input.id }, data: { deletedAt: new Date(), isActive: false } });
  return { success: true, deleted: org.name };
}

async function listUsers(input: ToolInput) {
  const where: ToolInput = { deletedAt: null };
  if (input.organizationId) where.organizationId = input.organizationId;
  if (input.role) where.role = input.role;
  if (input.isActive !== undefined) where.isActive = input.isActive;
  if (input.search) where.OR = [
    { name: { contains: input.search } },
    { email: { contains: input.search } },
  ];
  const users = await db.user.findMany({
    where, orderBy: { name: "asc" }, take: 25,
    select: { id: true, name: true, email: true, role: true, isActive: true, organization: { select: { name: true } } },
  });
  return { count: users.length, users };
}

const USER_FIELDS = ["name", "email", "phone", "jobTitle", "role", "isActive", "organizationId"];

async function updateUser(input: ToolInput) {
  const { id } = input;
  if (!id) return { error: "id is required" };
  const data: Record<string, unknown> = {};
  for (const key of USER_FIELDS) {
    if (input[key] !== undefined) data[key] = input[key];
  }
  return db.user.update({ where: { id }, data, select: { id: true, name: true, email: true, role: true, isActive: true } });
}

async function listProjects(input: ToolInput) {
  const where: ToolInput = {};
  if (input.organizationId) where.organizationId = input.organizationId;
  if (input.status) where.status = input.status;
  if (input.search) where.name = { contains: input.search };
  const projects = await db.project.findMany({
    where, orderBy: { updatedAt: "desc" }, take: 25,
    select: { id: true, name: true, status: true, progress: true, organization: { select: { name: true } }, owner: { select: { name: true } } },
  });
  return { count: projects.length, projects };
}

async function createProject(input: ToolInput) {
  return db.project.create({
    data: {
      name: input.name,
      description: input.description,
      status: input.status,
      organizationId: input.organizationId,
      ownerId: input.ownerId,
    },
  });
}

const PROJECT_FIELDS = ["name", "description", "status", "progress", "startDate", "targetDate", "isArchived"];

async function updateProject(input: ToolInput) {
  const { id } = input;
  if (!id) return { error: "id is required" };
  const data: Record<string, unknown> = {};
  for (const key of PROJECT_FIELDS) {
    if (input[key] !== undefined) data[key] = input[key];
  }
  return db.project.update({ where: { id }, data });
}

async function listInvoices(input: ToolInput) {
  const where: ToolInput = {};
  if (input.organizationId) where.organizationId = input.organizationId;
  if (input.status) where.status = input.status;
  const invoices = await db.invoice.findMany({
    where, orderBy: { createdAt: "desc" }, take: 25,
    select: { id: true, invoiceNumber: true, amount: true, status: true, dueDate: true, organization: { select: { name: true } } },
  });
  return { count: invoices.length, invoices };
}

const INVOICE_FIELDS = ["amount", "tax", "currency", "status", "dueDate", "paidAt", "notes", "lineItems"];

async function updateInvoice(input: ToolInput) {
  const { id } = input;
  if (!id) return { error: "id is required" };
  const data: Record<string, unknown> = {};
  for (const key of INVOICE_FIELDS) {
    if (input[key] !== undefined) data[key] = input[key];
  }
  return db.invoice.update({ where: { id }, data });
}

async function listTickets(input: ToolInput) {
  const where: ToolInput = {};
  if (input.organizationId) where.organizationId = input.organizationId;
  if (input.status) where.status = input.status;
  if (input.priority) where.priority = input.priority;
  if (input.search) where.subject = { contains: input.search };
  const tickets = await db.ticket.findMany({
    where, orderBy: { updatedAt: "desc" }, take: 25,
    select: { id: true, ticketNumber: true, subject: true, status: true, priority: true, organization: { select: { name: true } }, assignee: { select: { name: true } } },
  });
  return { count: tickets.length, tickets };
}

const TICKET_FIELDS = ["subject", "description", "status", "priority", "category", "assignedTo"];

async function updateTicket(input: ToolInput) {
  const { id } = input;
  if (!id) return { error: "id is required" };
  const data: Record<string, unknown> = {};
  for (const key of TICKET_FIELDS) {
    if (input[key] !== undefined) data[key] = input[key];
  }
  return db.ticket.update({ where: { id }, data });
}

async function replyToTicket(input: ToolInput) {
  return db.ticketMessage.create({
    data: { ticketId: input.ticketId, content: input.content, authorId: input.userId },
  });
}

async function listGuardAgents(input: ToolInput) {
  const where: ToolInput = {};
  if (input.organizationId) where.organizationId = input.organizationId;
  const agents = await db.guardAgent.findMany({
    where, orderBy: { name: "asc" }, take: 25,
    select: { id: true, name: true, hostname: true, ipAddress: true, status: true, lastHeartbeat: true, organization: { select: { name: true } }, _count: { select: { alerts: true } } },
  });
  return { count: agents.length, agents };
}

async function listGuardAlerts(input: ToolInput) {
  const where: ToolInput = {};
  if (input.status) where.status = input.status;
  if (input.severity) where.severity = input.severity;
  if (input.agentId) where.agentId = input.agentId;
  const alerts = await db.guardAlert.findMany({
    where, orderBy: { createdAt: "desc" }, take: input.limit || 20,
    select: { id: true, type: true, severity: true, title: true, status: true, createdAt: true, agent: { select: { name: true, hostname: true } } },
  });
  return { count: alerts.length, alerts };
}

async function updateAlertStatus(input: ToolInput) {
  return db.guardAlert.update({ where: { id: input.id }, data: { status: input.status } });
}

async function searchEverything(input: ToolInput) {
  const q = input.query;
  const [orgs, users, projects, tickets] = await Promise.all([
    db.organization.findMany({ where: { name: { contains: q }, deletedAt: null }, take: 5, select: { id: true, name: true, domain: true } }),
    db.user.findMany({ where: { OR: [{ name: { contains: q } }, { email: { contains: q } }], deletedAt: null }, take: 5, select: { id: true, name: true, email: true, role: true } }),
    db.project.findMany({ where: { name: { contains: q } }, take: 5, select: { id: true, name: true, status: true } }),
    db.ticket.findMany({ where: { subject: { contains: q } }, take: 5, select: { id: true, ticketNumber: true, subject: true, status: true } }),
  ]);
  return { organizations: orgs, users, projects, tickets };
}

// ─── Vault Tool Implementations ──────────────────────────────────────────────

async function listVaultEntries(input: ToolInput) {
  const where: ToolInput = { isActive: true, deletedAt: null };
  if (input.category) where.category = input.category;
  if (input.search) {
    where.OR = [{ label: { contains: input.search } }, { description: { contains: input.search } }];
  }
  const entries = await db.vaultEntry.findMany({
    where, orderBy: { updatedAt: "desc" }, take: 50,
    select: {
      id: true, label: true, category: true, url: true, description: true,
      encUsername: true, encPassword: true, encApiKey: true, encNotes: true, updatedAt: true,
    },
  });
  return {
    count: entries.length,
    entries: entries.map((e) => ({
      id: e.id, label: e.label, category: e.category, url: e.url, description: e.description,
      hasUsername: !!e.encUsername, hasPassword: !!e.encPassword, hasApiKey: !!e.encApiKey, hasNotes: !!e.encNotes,
      updatedAt: e.updatedAt,
    })),
  };
}

async function getVaultEntry(input: ToolInput) {
  const entry = await db.vaultEntry.findUnique({ where: { id: input.id } });
  if (!entry || !entry.isActive) return { error: "Vault entry not found" };

  const fields = (input.fields as string[] | undefined) || ["username", "password", "apiKey", "notes"];
  const result: Record<string, unknown> = {
    id: entry.id, label: entry.label, category: entry.category, url: entry.url, description: entry.description,
  };

  if (fields.includes("username")) result.username = decryptIfPresent(entry.encUsername);
  if (fields.includes("password")) result.password = decryptIfPresent(entry.encPassword);
  if (fields.includes("apiKey")) result.apiKey = decryptIfPresent(entry.encApiKey);
  if (fields.includes("notes")) result.notes = decryptIfPresent(entry.encNotes);

  // Audit log
  if (input._userId) {
    await db.vaultAccessLog.create({
      data: { action: "AI_REVEAL", entryId: entry.id, userId: input._userId, metadata: JSON.stringify({ fields }) },
    });
  }

  return result;
}

async function createVaultEntry(input: ToolInput) {
  if (!input.label) return { error: "label is required" };
  const entry = await db.vaultEntry.create({
    data: {
      label: input.label,
      category: input.category || "OTHER",
      url: input.url || null,
      description: input.description || null,
      encUsername: encryptIfPresent(input.username),
      encPassword: encryptIfPresent(input.password),
      encApiKey: encryptIfPresent(input.apiKey),
      encNotes: encryptIfPresent(input.notes),
      createdById: input._userId || "system",
    },
  });

  if (input._userId) {
    await db.vaultAccessLog.create({
      data: { action: "CREATE", entryId: entry.id, userId: input._userId, metadata: JSON.stringify({ label: entry.label }) },
    });
  }

  return { success: true, id: entry.id, label: entry.label };
}

async function updateVaultEntry(input: ToolInput) {
  if (!input.id) return { error: "id is required" };
  const data: Record<string, unknown> = {};
  if (input.label !== undefined) data.label = input.label;
  if (input.category !== undefined) data.category = input.category;
  if (input.url !== undefined) data.url = input.url || null;
  if (input.description !== undefined) data.description = input.description || null;
  if (input.username !== undefined) data.encUsername = encryptIfPresent(input.username);
  if (input.password !== undefined) data.encPassword = encryptIfPresent(input.password);
  if (input.apiKey !== undefined) data.encApiKey = encryptIfPresent(input.apiKey);
  if (input.notes !== undefined) data.encNotes = encryptIfPresent(input.notes);

  const entry = await db.vaultEntry.update({ where: { id: input.id }, data });

  if (input._userId) {
    await db.vaultAccessLog.create({
      data: { action: "UPDATE", entryId: input.id, userId: input._userId, metadata: JSON.stringify({ updatedFields: Object.keys(data) }) },
    });
  }

  return { success: true, id: entry.id, label: entry.label };
}

async function searchVault(input: ToolInput) {
  const q = input.query;
  const entries = await db.vaultEntry.findMany({
    where: {
      isActive: true, deletedAt: null,
      OR: [{ label: { contains: q } }, { description: { contains: q } }, { url: { contains: q } }, { category: { contains: q } }],
    },
    take: 20,
    select: { id: true, label: true, category: true, url: true, description: true, encUsername: true, encPassword: true, encApiKey: true },
  });
  return {
    count: entries.length,
    entries: entries.map((e) => ({
      id: e.id, label: e.label, category: e.category, url: e.url, description: e.description,
      hasUsername: !!e.encUsername, hasPassword: !!e.encPassword, hasApiKey: !!e.encApiKey,
    })),
  };
}

// ─── Analytics Implementations ──────────────────────────────────────────────

async function getAnalyticsOverview(input: ToolInput) {
  const range = input.range || "7d";
  const now = new Date();
  let since: Date;
  switch (range) {
    case "24h": since = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
    case "7d": since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
    case "30d": since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
    case "90d": since = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
    default: since = new Date(0);
  }

  const [visitors, pageViews, sessions, newVisitors] = await Promise.all([
    db.analyticsVisitor.count({ where: { lastSeen: { gte: since } } }),
    db.analyticsPageView.count({ where: { timestamp: { gte: since } } }),
    db.analyticsSession.count({ where: { startedAt: { gte: since } } }),
    db.analyticsVisitor.count({ where: { firstSeen: { gte: since } } }),
  ]);

  const topPages = await db.$queryRawUnsafe<{ path: string; views: bigint }[]>(
    `SELECT path, COUNT(*) as views FROM "AnalyticsPageView" WHERE timestamp >= $1 GROUP BY path ORDER BY views DESC LIMIT 10`, since
  ).catch(() => []);

  const topCountries = await db.$queryRawUnsafe<{ country: string; count: bigint }[]>(
    `SELECT country, COUNT(*) as count FROM "AnalyticsVisitor" WHERE "lastSeen" >= $1 AND country IS NOT NULL GROUP BY country ORDER BY count DESC LIMIT 10`, since
  ).catch(() => []);

  const topReferrers = await db.$queryRawUnsafe<{ referrer: string; count: bigint }[]>(
    `SELECT referrer, COUNT(*) as count FROM "AnalyticsSession" WHERE "startedAt" >= $1 AND referrer IS NOT NULL AND referrer != '' GROUP BY referrer ORDER BY count DESC LIMIT 10`, since
  ).catch(() => []);

  const deviceBreakdown = await db.$queryRawUnsafe<{ deviceType: string; count: bigint }[]>(
    `SELECT "deviceType", COUNT(*) as count FROM "AnalyticsVisitor" WHERE "lastSeen" >= $1 AND "deviceType" IS NOT NULL GROUP BY "deviceType"`, since
  ).catch(() => []);

  const browserBreakdown = await db.$queryRawUnsafe<{ browser: string; count: bigint }[]>(
    `SELECT browser, COUNT(*) as count FROM "AnalyticsVisitor" WHERE "lastSeen" >= $1 AND browser IS NOT NULL GROUP BY browser ORDER BY count DESC LIMIT 8`, since
  ).catch(() => []);

  // Serialize bigints
  const s = (arr: Record<string, unknown>[]) => arr.map(item => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(item)) out[k] = typeof v === "bigint" ? Number(v) : v;
    return out;
  });

  return {
    range,
    totalVisitors: visitors,
    totalPageViews: pageViews,
    totalSessions: sessions,
    newVisitors,
    returningVisitors: visitors - newVisitors,
    topPages: s(topPages),
    topCountries: s(topCountries),
    topReferrers: s(topReferrers),
    devices: s(deviceBreakdown),
    browsers: s(browserBreakdown),
  };
}

async function getVisitorDetails(input: ToolInput) {
  const range = input.range || "7d";
  const page = input.page || 1;
  const perPage = 15;
  const now = new Date();
  let since: Date;
  switch (range) {
    case "24h": since = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
    case "7d": since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
    case "30d": since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
    case "90d": since = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
    default: since = new Date(0);
  }

  // Build where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { lastSeen: { gte: since } };
  if (input.fingerprint) where.fingerprint = input.fingerprint;
  if (input.country) where.country = { contains: input.country };

  // If filtering by IP, we need to find visitors via sessions
  if (input.ip) {
    const sessions = await db.analyticsSession.findMany({
      where: { ip: input.ip, startedAt: { gte: since } },
      select: { visitorId: true },
      distinct: ["visitorId"],
    });
    where.id = { in: sessions.map(s => s.visitorId) };
  }

  const [visitors, total] = await Promise.all([
    db.analyticsVisitor.findMany({
      where,
      orderBy: { lastSeen: "desc" },
      take: perPage,
      skip: (page - 1) * perPage,
      include: {
        sessions: {
          orderBy: { startedAt: "desc" },
          take: 3,
          select: { id: true, ip: true, startedAt: true, entryPage: true, exitPage: true, duration: true, pageCount: true, referrer: true, utmSource: true, utmMedium: true, utmCampaign: true, isBounce: true },
        },
        pageViews: {
          orderBy: { timestamp: "desc" },
          take: 10,
          select: { path: true, title: true, duration: true, scrollDepth: true, timestamp: true },
        },
      },
    }),
    db.analyticsVisitor.count({ where }),
  ]);

  return {
    visitors: visitors.map(v => ({
      id: v.id,
      fingerprint: v.fingerprint,
      firstSeen: v.firstSeen,
      lastSeen: v.lastSeen,
      totalVisits: v.totalVisits,
      totalPageViews: v.totalPageViews,
      browser: v.browser,
      browserVersion: v.browserVersion,
      os: v.os,
      osVersion: v.osVersion,
      deviceType: v.deviceType,
      screenSize: v.screenWidth && v.screenHeight ? `${v.screenWidth}x${v.screenHeight}` : null,
      language: v.language,
      timezone: v.timezone,
      country: v.country,
      countryCode: v.countryCode,
      region: v.region,
      city: v.city,
      firstReferrer: v.firstReferrer,
      utm: { source: v.firstUtmSource, medium: v.firstUtmMedium, campaign: v.firstUtmCampaign },
      recentSessions: v.sessions,
      recentPages: v.pageViews,
    })),
    pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
  };
}

async function getAnalyticsRealtime() {
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

  const activeSessions = await db.analyticsSession.findMany({
    where: {
      OR: [
        { endedAt: { gte: fiveMinAgo } },
        { endedAt: null, startedAt: { gte: fiveMinAgo } },
      ],
    },
    orderBy: { startedAt: "desc" },
    include: {
      visitor: {
        select: { fingerprint: true, browser: true, os: true, deviceType: true, country: true, city: true },
      },
      pageViews: {
        orderBy: { timestamp: "desc" },
        take: 1,
        select: { path: true, title: true, timestamp: true },
      },
    },
  });

  return {
    activeVisitors: activeSessions.length,
    timestamp: new Date().toISOString(),
    sessions: activeSessions.map(s => ({
      sessionId: s.id,
      ip: s.ip,
      fingerprint: s.visitor.fingerprint.slice(0, 16) + "...",
      browser: s.visitor.browser,
      os: s.visitor.os,
      device: s.visitor.deviceType,
      country: s.visitor.country,
      city: s.visitor.city,
      currentPage: s.pageViews[0]?.path || s.entryPage,
      pageTitle: s.pageViews[0]?.title,
      startedAt: s.startedAt,
      pageCount: s.pageCount,
      referrer: s.referrer,
      utmSource: s.utmSource,
    })),
  };
}
