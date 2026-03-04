/**
 * GcsGuard AI — Admin tool definitions and executors.
 * Each tool maps to a direct Prisma operation.
 * Claude decides which tools to call based on the user's request.
 */

import { db } from "@/lib/db";
import type Anthropic from "@anthropic-ai/sdk";
import {
  sshListFiles, sshReadFile, sshWriteFile, sshEditFile,
  sshCreateDirectory, sshDeleteFile, sshSearchCode,
  sshRunCommand, sshInstallPackage, sshGitStatus,
  sshGitCommitAndPush, sshServerRebuild,
} from "./admin-ai-ssh-tools";

type ToolDef = Anthropic.Tool;

// Tools that require admin confirmation before execution
export const DANGEROUS_TOOLS = new Set([
  "write_file", "edit_file", "create_directory", "delete_file",
  "run_command", "install_package", "git_commit_and_push", "server_rebuild",
  "delete_organization",
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
    description: "Run deploy.sh on the GCS production server to rebuild and restart the application. This will cause ~30-60s of downtime. DANGEROUS: requires admin confirmation.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
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
      default: return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (err) {
    return JSON.stringify({ error: String(err) });
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

async function createOrganization(input: ToolInput) {
  const { name, ...rest } = input;
  return db.organization.create({ data: { name, ...rest } });
}

async function updateOrganization(input: ToolInput) {
  const { id, ...data } = input;
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

async function updateUser(input: ToolInput) {
  const { id, ...data } = input;
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

async function updateProject(input: ToolInput) {
  const { id, ...data } = input;
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

async function updateInvoice(input: ToolInput) {
  const { id, ...data } = input;
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

async function updateTicket(input: ToolInput) {
  const { id, ...data } = input;
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
