import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { isGCSStaff } from "@/lib/auth-utils";
import { verifyToken } from "../pin/route";
import { db } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";
import { adminTools, executeTool, isDangerousTool } from "@/lib/admin-ai-tools";
import { executeSubAgent } from "@/lib/admin-ai-sub-agents";

export const maxDuration = 3600; // 1 hour — complex browser automation + multi-step tasks

const client = new Anthropic();

const PAGE_CONTEXT: Record<string, string> = {
  "/portal/admin": "Admin overview dashboard — system stats and recent activity",
  "/portal/admin/pitch-board": "AI Pitch Board — sales prospects and pitches",
  "/portal/admin/projects": "Project management — all client projects",
  "/portal/admin/tickets": "Support tickets — all client tickets",
  "/portal/admin/invoices": "Invoice management — all invoices",
  "/portal/admin/users": "User management — all system users",
  "/portal/admin/organizations": "Organization management — all client organizations",
  "/portal/admin/guard": "GcsGuard security dashboard — threat overview",
  "/portal/admin/guard/agents": "GcsGuard agents — security agent fleet",
  "/portal/admin/guard/alerts": "GcsGuard alerts — security alert list",
  "/portal/admin/guard/patches": "GcsGuard patches — patch management",
  "/portal/admin/guard/config": "GcsGuard config — system configuration",
  "/portal/admin/guard/monitoring": "GcsGuard monitoring — live system monitoring",
  "/portal/admin/guard/deploy": "GcsGuard deploy — deployment management",
  "/portal/admin/vault": "Credential Vault — encrypted password and API key storage",
};

function getPageContext(path: string): string {
  if (PAGE_CONTEXT[path]) return PAGE_CONTEXT[path];
  for (const [pattern, desc] of Object.entries(PAGE_CONTEXT)) {
    if (path.startsWith(pattern + "/")) return desc;
  }
  return "Portal page";
}

function buildSystemPrompt(currentPath: string): string {
  const ctx = getPageContext(currentPath);
  return `You are GcsGuard AI, the intelligent admin command center and full-stack software engineer for General Computing Solutions (GCS). You are an elite system administrator and developer AI with full access to all admin operations AND the production server.

CURRENT CONTEXT: The admin is currently on "${currentPath}" — ${ctx}

YOUR CAPABILITIES:

**Admin & Cybersecurity:**
- View system stats and dashboards
- List, create, update, and delete organizations
- List and update users (roles, active status)
- List, create, and update projects
- List and update invoices
- List, update, and reply to support tickets
- List GcsGuard security agents
- List and manage security alerts
- Search across all entities

**Software Engineering (via SSH to production server):**
- List, read, write, and edit any file on the server
- Create directories, delete files
- Search/grep through the codebase
- Execute any shell command (npm, apt, systemctl, nginx, psql, etc.)
- Install npm packages
- Check git status, commit, and push changes to GitHub
- Rebuild and restart the application (deploy.sh → PM2)
- You can build entire features: create new pages, API routes, components, modify existing code
- You can manage the server: nginx config, database, services, firewall, SSL

**Credential Vault:**
- List and search encrypted vault entries (passwords, API keys, account credentials)
- Retrieve decrypted credentials when needed (you are already PIN-authenticated)
- Create new vault entries with automatic AES-256-GCM encryption
- Update existing vault entries
- All vault access is logged for audit — always tell the admin what you accessed

**Browser Automation (Puppeteer on production server):**
- Open headless browser sessions with stealth anti-bot-detection (human-like behavior)
- Navigate to websites, fill forms, click buttons, take screenshots, extract page data
- Actions execute at realistic human speed (typing, clicking, pauses) — this prevents bot detection
- Use vault credentials for automated logins: get_vault_entry first → then browser_action with fill_form/type actions
- ALWAYS close sessions with browser_close when you're done
- Max 3 concurrent sessions — if you hit the limit, close existing sessions first

**CRITICAL — Browser Workflow (ALWAYS follow this order):**
1. **Clean up first:** Call browser_sessions to check for existing sessions. Close ALL open sessions with browser_close before starting new work. This prevents confusion and session limit errors.
2. **Open browser:** browser_open with the target URL
3. **Analyze the page DEEPLY before acting:** After opening, ALWAYS use browser_action with an "extract" action first to extract ALL form fields, their IDs, names, types, labels, placeholders, checkboxes, dropdowns, and submit buttons. Use a comprehensive selector like "input, select, textarea, button[type=submit], [type=checkbox], [role=button]". Study the extracted data carefully to understand the form structure BEFORE typing anything.
4. **Fill ALL fields at once with fill_form:** Use the "fill_form" action to set ALL text/email/password input values in a single atomic call. This is critical for React/SPA sites where fields clear when focus changes. Example: { action: "fill_form", fields: [{ selector: "#email", value: "a@b.com" }, { selector: "#pass", value: "secret" }] }
5. **Set checkboxes with set_checked:** Use "set_checked" for checkboxes/radios — { action: "set_checked", selector: "#terms", checked: true }. Do NOT use "click" for checkboxes.
6. **Verify with extract:** After filling, use "extract" to confirm all field values are set correctly.
7. **Screenshot before submit:** Take a screenshot to verify visually.
8. **Submit and verify:** Click the submit button, wait for navigation, take a screenshot to confirm success or identify errors.
9. **Close session:** browser_close when done.

**Form filling strategy (IMPORTANT):**
- ALWAYS prefer "fill_form" over individual "type" actions — fill_form sets all values atomically without focus changes, preventing React from clearing fields.
- Use "set_value" for a single field, "fill_form" for multiple fields.
- Use "set_checked" for checkboxes/radio buttons.
- Only fall back to "type" for non-React sites or when fill_form doesn't work.
- Use stable selectors (id, name, data-testid) over fragile CSS paths — get these from the extract step.

**Web Search:**
- You can search the internet to find documentation, solutions, and current information

**PROJECT ARCHITECTURE:**
- Next.js 16 App Router, TypeScript, Tailwind CSS v4, shadcn/ui, Prisma v5
- App directory: /var/www/gcs
- Pages: src/app/(public)/, src/app/(portal)/, src/app/(auth)/
- API: src/app/api/
- Components: src/components/
- Utils: src/lib/
- Database: SQLite locally, PostgreSQL on server
- GitHub: https://github.com/jeanyves777/gcs (branch: main)

**DATABASE SCHEMA (Prisma) — Use these EXACT field names when writing code:**
- User: id, name, email, password, role (ADMIN|STAFF|CLIENT_ADMIN|CLIENT_USER), phone?, jobTitle?, isActive, organizationId, notificationPrefs?, createdAt, updatedAt
- Organization: id, name, domain? (unique), logo?, website?, phone?, email?, address?, city?, state?, zipCode?, country?, industry?, description?, subscriptionTier, createdAt, updatedAt — relations: users, projects, invoices, supportTickets, guardAgents, pitches
- Project: id, name, description?, status (PLANNED|IN_PROGRESS|ON_HOLD|COMPLETED|CANCELLED), startDate?, endDate?, budget?, organizationId, createdAt, updatedAt
- Invoice: id, invoiceNumber (unique), amount, status (DRAFT|SENT|PAID|OVERDUE|CANCELLED), dueDate?, paidDate?, organizationId, projectId?, lineItems?, notes?, createdAt
- SupportTicket: id, subject, description, status (OPEN|IN_PROGRESS|RESOLVED|CLOSED), priority (LOW|MEDIUM|HIGH|URGENT), category?, organizationId, userId, assignedToId?, resolvedAt?, createdAt, updatedAt — relations: messages (SupportMessage[])
- SupportMessage: id, content, ticketId, userId, isInternal, createdAt
- GuardAgent: id, name, apiKey (unique), apiKeyPrefix, hostname?, ipAddress?, os?, kernelVersion?, distro?, distroVersion?, packageManager?, status (PENDING|ONLINE|OFFLINE|DEGRADED), lastHeartbeat?, lastInventorySync?, lastPatchCheck?, pendingUpdates, securityUpdates, config?, organizationId, createdAt, updatedAt — relations: metrics (GuardMetric[]), alerts (GuardAlert[]), scans (GuardScan[]), devices (GuardDevice[]), serviceStatuses (GuardServiceStatus[]), packages (GuardPackage[]), patchHistory, configDeployments, urlMonitors
- GuardMetric: id, type (CPU|MEMORY|DISK|LOAD|NETWORK_IN|NETWORK_OUT), value (Float), metadata?, agentId, timestamp — @@index([agentId, type, timestamp])
- GuardAlert: id, type, severity (CRITICAL|HIGH|MEDIUM|LOW|INFO), title, description, evidence?, status (OPEN|INVESTIGATING|RESOLVED|FALSE_POSITIVE), aiAnalysis?, aiRecommendation?, resolvedAt?, resolvedById?, agentId, incidentId?, createdAt
- GuardScan: id, type (FULL|QUICK|VULNERABILITY|FILE_INTEGRITY), status (RUNNING|COMPLETED|FAILED), results? (JSON string), findingCount, completedAt?, agentId, startedAt
- GuardServiceStatus: id, serviceName, isActive, isEnabled, subState?, memoryUsage?, cpuUsage?, uptime?, agentId, lastChecked, updatedAt — @@unique([agentId, serviceName])
- GuardDevice: id, hostname, ipAddress?, macAddress?, os?, deviceType?, lastSeen?, agentId — relations: networkScans
- VaultEntry: id, label, username?, encryptedData, iv, authTag, category?, url?, notes?, userId, createdAt, updatedAt
- Pitch: id, companyName, website?, email?, contactName?, status, analysisData?, pentestData?, businessIntelData?, emailsSent?, organizationId?, userId, createdAt, updatedAt
- AiConversation: id, title?, userId, createdAt, updatedAt — relations: messages (AiMessage[])
- AiMessage: id, conversationId, role (user|assistant), content, toolCalls?, contentBlocks?, createdAt

**CRITICAL FOR CODE GENERATION:** When writing Prisma queries:
- GuardMetric uses "timestamp" NOT "createdAt" for ordering
- GuardScan uses "startedAt" NOT "createdAt" for ordering
- GuardAgent relation to services is "serviceStatuses" NOT "services"
- GuardServiceStatus fields: "serviceName", "isActive", "isEnabled" (NOT "name", "status")
- Organization has NO "slug" field — use "name" or "domain"
- GuardAgent requires: apiKey, apiKeyPrefix, organizationId (all required for create)
- Always use JSON.parse(JSON.stringify(data)) when passing Prisma objects to client components

**Task Delegation (Sub-Agents):**
- Use delegate_task to spawn specialized sub-agents for parallel work
- "research": Web search agent (Haiku) — fast web lookups, documentation
- "database": DB query agent (Haiku) — read-only data queries and analysis
- "server": Server inspection agent (Haiku) — file listing, reading, code search
- "code": Code analysis agent (Sonnet) — deep code reading and pattern analysis
- Sub-agents have NO dangerous tool access — only you can execute writes/deletes/commands
- You can call delegate_task multiple times in one response — they all run concurrently
- Review sub-agent results before presenting to the admin

BEHAVIOR RULES:
1. Be concise and direct. Show results clearly.
2. When asked about the current page, use the context above to give relevant info.
3. **CONFIRM BEFORE ACTING:** Before executing ANY task (not just dangerous ones), first explain what you plan to do, the specific steps, and what will be affected. Ask the admin to confirm before proceeding. For example: "I'll update the footer text in src/components/footer.tsx — shall I proceed?" Only skip confirmation for simple read-only queries (listing data, checking status, searching).
4. **CRITICAL: For ALL dangerous operations (write_file, edit_file, create_directory, delete_file, run_command, install_package, git_commit_and_push, server_rebuild, delete_organization), you MUST describe EXACTLY what you plan to do and ask the admin to confirm BEFORE executing.** Show the file path, content preview, or command. Wait for their explicit "yes" or approval.
5. When listing data, format it clearly with key details.
6. If a request is ambiguous, ask for clarification.
7. Always execute the appropriate tool — don't guess at data.
8. When multiple tools are needed, call them in parallel (multiple tool_use blocks in one response) or delegate to sub-agents.
9. Use markdown formatting for readability (bold, lists, code blocks).
10. **ERROR RECOVERY: When a tool returns an error, DO NOT stop or give up.** Read the error message and "hint" field carefully, diagnose what went wrong, fix the issue (adjust parameters, query for correct IDs, etc.), and retry. For example: if create fails due to a unique constraint, check existing records first; if an ID is not found, list records to find the right one. Always attempt at least one recovery before reporting failure to the admin.
11. **MANDATORY BUILD PERMISSION:** You must NEVER run server_rebuild without asking the admin first. Before ANY build or rebuild, you MUST:
    a) Tell the admin what changes you made and why a rebuild is needed.
    b) Ask: "Would you like me to run the build, or would you prefer to run it manually?"
    c) Only call server_rebuild if the admin explicitly says YES to you running it.
    d) If the admin wants to run it manually, provide the command: \`ssh gcs "bash /var/www/gcs/deploy.sh"\`
12. After server_rebuild, check PM2 status to verify the build succeeded.
13. server_rebuild causes ~30-60s downtime. Warn the admin.
14. You can add new capabilities to yourself by editing files on the server and rebuilding.

** CRITICAL SERVER SAFETY RULES -- NEVER VIOLATE THESE:**

15. **PROTECT ADMIN SSH ACCESS AT ALL TIMES.** Before ANY security action, verify that SSH on port 22 with root login remains accessible. Never change SSH ports, disable root login, or modify sshd_config/sshd_config.d files. The admin connects via SSH key (ed25519) on port 22 as root -- this MUST always work. If you detect an SSH vulnerability, REPORT it with a recommendation and let the admin decide.

16. **FIREWALL: THREAT BLOCKING ALLOWED, LOCKOUT FORBIDDEN.** You MAY add iptables rules to block specific threatening IPs or close dangerous ports, BUT you must ALWAYS ensure these ports remain open: 22 (SSH), 80 (HTTP), 443 (HTTPS), 3000 (Next.js), 9876 (daemon). NEVER set default INPUT policy to DROP. NEVER run "ufw enable" (it is broken on this server). NEVER flush all iptables rules without immediately restoring the safe baseline. Before adding any firewall rule, verify it will not block the admin's SSH access.

17. **THREAT RESPONSE PROTOCOL:** When you detect active threats (brute force attacks, suspicious connections, unauthorized access attempts), you CAN take defensive action:
   - Block specific attacker IPs: iptables -I INPUT -s <attacker_ip> -j DROP
   - Kill suspicious processes
   - Disable compromised user accounts (NOT root)
   - Close non-essential open ports (NOT 22, 80, 443, 3000, 9876)
   After each defensive action, immediately verify SSH access still works by running: ss -tlnp | grep :22

18. **NEVER MODIFY AUTHENTICATION for root.** Do not change PermitRootLogin, root's authorized_keys, or PAM config. You MAY lock/disable OTHER suspicious user accounts if they pose a threat. Always preserve root SSH key access.

19. **NEVER MODIFY SYSTEMD SOCKET/SERVICE FILES** for critical services (ssh, nginx, postgresql). Do not create or edit systemd override files that change listening ports or service behavior.

20. **SAFE OPERATIONS (always allowed):** Installing apt packages, restarting GCS app (pm2), editing GCS application code, nginx site configs (not main nginx.conf), database queries, file operations within /var/www/gcs/, blocking attacker IPs, killing malicious processes.

21. **REPORT FORMAT for security findings:** When you find security issues, present a detailed report. Format: "[FINDING] [issue] | SEVERITY: [level] | RECOMMENDED FIX: [command] -- Shall I apply this?" For critical active threats, you may act first and report after, as long as rule 15 (SSH access) is never violated.

22. **NEVER run commands that could make the server unreachable:** No changing network interfaces, DNS resolvers, routing tables, or kernel parameters. No reboot or shutdown without explicit admin approval. No changing the default iptables policy to DROP.

23. **SELF-CHECK AFTER EVERY SECURITY ACTION:** After any security-related command, run these checks: (a) ss -tlnp | grep :22 to confirm SSH is listening, (b) iptables -L INPUT -n to confirm no rule blocks port 22. If either check fails, immediately undo your last action.

IMPORTANT: You have real admin powers. Every tool call modifies the actual database or server. Be careful with destructive operations.`;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !isGCSStaff(session.user.role)) {
    return new Response("Forbidden", { status: 403 });
  }

  // Verify PIN session token
  const aiSession = req.headers.get("x-ai-session");
  if (!aiSession) {
    return new Response("PIN required", { status: 401 });
  }
  const tokenCheck = verifyToken(aiSession);
  if (!tokenCheck.valid || tokenCheck.userId !== session.user.id) {
    return new Response("Invalid or expired session", { status: 401 });
  }

  const { messages, currentPath, conversationId } = await req.json();
  if (!messages || !Array.isArray(messages)) {
    return new Response("Invalid messages", { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      // ── SSE heartbeat — keeps connection alive during long operations ──
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          // Stream already closed, stop heartbeat
          clearInterval(heartbeat);
        }
      }, 15000); // every 15 seconds

      // Declare outside try so catch block can save partial results on error
      let convId = conversationId;
      let fullAssistantText = "";
      const allToolCalls: { tool: string; input: unknown; result: unknown }[] = [];
      const allContentBlocks: { type: string; text?: string; toolIds?: string[] }[] = [];

      try {
        // ── Conversation persistence ──────────────────────────────

        // Create conversation if new
        if (!convId) {
          const lastUserMsg = messages.filter((m: { role: string }) => m.role === "user").pop();
          const title = lastUserMsg
            ? (lastUserMsg as { content: string }).content.substring(0, 60).trim()
            : "New conversation";
          const conv = await db.aiConversation.create({
            data: { title, userId: session.user.id },
          });
          convId = conv.id;
        } else {
          // Touch updatedAt
          await db.aiConversation.updateMany({
            where: { id: convId, userId: session.user.id },
            data: { updatedAt: new Date() },
          });
        }

        // Send conversationId to frontend
        send("conversation", { id: convId });

        // Save the latest user message
        const lastUserMsg = messages[messages.length - 1];
        if (lastUserMsg && lastUserMsg.role === "user") {
          await db.aiMessage.create({
            data: {
              conversationId: convId,
              role: "user",
              content: lastUserMsg.content,
            },
          });
        }

        // Smart context: send ALL messages (full memory) but trim oversized individual
        // messages to control token usage. User messages stay intact, only long
        // assistant responses (tool dumps, code output) get trimmed.
        const MAX_ASSISTANT_CHARS = 3000; // trim long assistant responses
        const anthropicMessages: Anthropic.MessageParam[] = messages.map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.role === "assistant" && m.content.length > MAX_ASSISTANT_CHARS
            ? m.content.substring(0, MAX_ASSISTANT_CHARS) + "\n...(response trimmed for context)"
            : m.content,
        }));
        // Ensure first message is from the user (Anthropic requirement)
        if (anthropicMessages.length > 0 && anthropicMessages[0].role !== "user") {
          anthropicMessages.shift();
        }

        let toolCallCount = 0;
        const MAX_TOOL_CALLS = 50;

        // Build tools array with web_search
        const tools: (Anthropic.Tool | Anthropic.WebSearchTool20250305)[] = [
          ...adminTools,
          { type: "web_search_20250305" as const, name: "web_search", max_uses: 5 },
        ];

        // Agentic loop
        let currentMessages: Anthropic.MessageParam[] = [...anthropicMessages];

        while (true) {
          // ── Stream response — text appears instantly as Claude generates it ──
          let hasToolUse = false;
          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          const toolUseBlocks: Anthropic.ToolUseBlock[] = [];
          let response: Anthropic.Message | undefined;
          let iterationText = ""; // Track text generated in this iteration

          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              const messageStream = client.messages.stream({
                model: "claude-haiku-4-5-20251001",
                max_tokens: 8192,
                system: buildSystemPrompt(currentPath || "/portal/admin"),
                messages: currentMessages,
                tools: tools as Anthropic.Tool[],
              });

              // Stream text to frontend immediately — no waiting for full response
              messageStream.on("text", (text) => {
                fullAssistantText += text;
                iterationText += text;
                send("text", { content: text });
              });

              response = await messageStream.finalMessage();
              break;
            } catch (err: unknown) {
              const isRateLimit = err instanceof Error && (
                err.message.includes("429") || err.message.includes("rate_limit")
              );
              if (isRateLimit && attempt < 2) {
                const delay = Math.pow(2, attempt + 1) * 1000;
                send("text", { content: `\n\n*Rate limited — retrying in ${delay / 1000}s...*\n\n` });
                await new Promise((r) => setTimeout(r, delay));
                continue;
              }
              throw err;
            }
          }

          if (!response) throw new Error("Max retries exceeded");

          // ── Process non-text blocks (tool calls, web search) ──
          const assistantContent = response.content;

          for (const block of assistantContent) {
            if (block.type === "web_search_tool_result") {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const searchBlock = block as any;
              send("web_search", {
                id: searchBlock.id || crypto.randomUUID(),
                results: searchBlock.content || [],
              });
            } else if (block.type === "tool_use") {
              hasToolUse = true;
              toolCallCount++;
              toolUseBlocks.push(block);

              send("tool_start", {
                id: block.id,
                tool: block.name,
                input: block.input,
                dangerous: isDangerousTool(block.name),
              });
            }
            // text blocks already streamed live via messageStream.on("text")
          }

          // ── Track content blocks for DB persistence ──
          // Add text block if any text was generated in this iteration
          if (iterationText.trim()) {
            allContentBlocks.push({ type: "text", text: iterationText });
          }
          // Add tool_group block if tools were called in this iteration
          if (toolUseBlocks.length > 0) {
            allContentBlocks.push({ type: "tool_group", toolIds: toolUseBlocks.map(b => b.id) });
          }

          // ── Pass 2: Execute all tool_use blocks in parallel ──
          if (toolUseBlocks.length > 0) {
            const executions = await Promise.allSettled(
              toolUseBlocks.map(async (block) => {
                if (block.name === "delegate_task") {
                  // Sub-agent delegation: stream progress via SSE
                  const input = block.input as { agent_type: string; task: string; context?: string };
                  const subResult = await executeSubAgent(
                    input.agent_type,
                    input.task,
                    input.context || "",
                    (progressEvent) => {
                      send("sub_agent", { parentToolId: block.id, ...progressEvent });
                    },
                  );
                  return {
                    block,
                    result: JSON.stringify({
                      agent: subResult.agent,
                      summary: subResult.summary,
                      toolCallsCount: subResult.toolCalls.length,
                      error: subResult.error || undefined,
                    }),
                  };
                } else {
                  const toolInput = block.input as Record<string, unknown>;
                  // Inject userId for vault audit logging
                  if (block.name.includes("vault")) {
                    toolInput._userId = session.user.id;
                  }
                  const result = await executeTool(block.name, toolInput);
                  return { block, result };
                }
              })
            );

            // Process results in original order
            for (let i = 0; i < executions.length; i++) {
              const settlement = executions[i];
              const block = toolUseBlocks[i];

              if (settlement.status === "fulfilled") {
                const { result } = settlement.value;
                const parsedResult = JSON.parse(result);

                send("tool_result", {
                  id: block.id,
                  tool: block.name,
                  result: parsedResult,
                  success: !result.includes('"error"'),
                });

                allToolCalls.push({ tool: block.name, input: block.input, result: parsedResult });

                const MAX_RESULT_LEN = 4000;
                const truncatedResult = result.length > MAX_RESULT_LEN
                  ? result.substring(0, MAX_RESULT_LEN) + "\n...(truncated)"
                  : result;
                toolResults.push({
                  type: "tool_result" as const,
                  tool_use_id: block.id,
                  content: truncatedResult,
                });
              } else {
                // Handle rejected promise
                const errorResult = JSON.stringify({ error: String(settlement.reason) });
                send("tool_result", {
                  id: block.id,
                  tool: block.name,
                  result: { error: String(settlement.reason) },
                  success: false,
                });
                toolResults.push({
                  type: "tool_result" as const,
                  tool_use_id: block.id,
                  content: errorResult,
                });
              }
            }
          }

          // If no tool use or max reached, we're done
          if (!hasToolUse || toolCallCount >= MAX_TOOL_CALLS) {
            break;
          }

          // Add assistant response + tool results for next loop
          currentMessages = [
            ...currentMessages,
            { role: "assistant" as const, content: assistantContent },
            { role: "user" as const, content: toolResults },
          ];
        }

        // ── Save assistant response to DB ─────────────────────────
        if (convId && (fullAssistantText || allToolCalls.length > 0)) {
          await db.aiMessage.create({
            data: {
              conversationId: convId,
              role: "assistant",
              content: fullAssistantText || "(tool execution only)",
              toolCalls: allToolCalls.length > 0 ? JSON.stringify(allToolCalls) : null,
              contentBlocks: allContentBlocks.length > 0 ? JSON.stringify(allContentBlocks) : null,
            },
          });
        }

        send("done", { conversationId: convId });
      } catch (err) {
        const errMsg = String(err);

        // ── CRITICAL: Save partial assistant response even on error ──
        // Without this, the entire AI response (text + tool calls) is lost
        // when errors occur (timeouts, SSH failures, API errors, etc.)
        try {
          if (convId && (fullAssistantText || allToolCalls.length > 0)) {
            const errorNote = `\n\n⚠️ _Error occurred: ${errMsg.substring(0, 200)}_`;
            await db.aiMessage.create({
              data: {
                conversationId: convId,
                role: "assistant",
                content: (fullAssistantText || "(tool execution only)") + errorNote,
                toolCalls: allToolCalls.length > 0 ? JSON.stringify(allToolCalls) : null,
                contentBlocks: allContentBlocks.length > 0 ? JSON.stringify(allContentBlocks) : null,
              },
            });
          }
        } catch {
          // DB save failed too — nothing we can do
        }

        // Don't send generic "network error" — give the admin actionable info
        if (errMsg.includes("429") || errMsg.includes("rate_limit")) {
          send("error", { message: "Rate limited by Claude API. Please wait a moment and try again." });
        } else if (errMsg.includes("timeout") || errMsg.includes("ETIMEDOUT")) {
          send("error", { message: "Operation timed out. The server may be busy — try again." });
        } else if (errMsg.includes("SSH") || errMsg.includes("ssh")) {
          send("error", { message: `SSH error: ${errMsg}. Check server connectivity.` });
        } else {
          send("error", { message: errMsg });
        }
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
