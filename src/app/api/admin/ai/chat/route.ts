import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { isGCSStaff } from "@/lib/auth-utils";
import { verifyToken } from "../pin/route";
import { db } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";
import { adminTools, executeTool, isDangerousTool } from "@/lib/admin-ai-tools";
import { executeSubAgent } from "@/lib/admin-ai-sub-agents";

export const maxDuration = 300; // 5 min for server operations

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
3. **CRITICAL: For ALL dangerous operations (write_file, edit_file, create_directory, delete_file, run_command, install_package, git_commit_and_push, server_rebuild, delete_organization), you MUST describe EXACTLY what you plan to do and ask the admin to confirm BEFORE executing.** Show the file path, content preview, or command. Wait for their explicit "yes" or approval.
4. When listing data, format it clearly with key details.
5. If a request is ambiguous, ask for clarification.
6. Always execute the appropriate tool — don't guess at data.
7. When multiple tools are needed, call them in parallel (multiple tool_use blocks in one response) or delegate to sub-agents.
8. Use markdown formatting for readability (bold, lists, code blocks).
9. **ERROR RECOVERY: When a tool returns an error, DO NOT stop or give up.** Read the error message and "hint" field carefully, diagnose what went wrong, fix the issue (adjust parameters, query for correct IDs, etc.), and retry. For example: if create fails due to a unique constraint, check existing records first; if an ID is not found, list records to find the right one. Always attempt at least one recovery before reporting failure to the admin.
10. After server_rebuild, check PM2 status to verify the build succeeded.
11. server_rebuild causes ~30-60s downtime. Warn the admin.
12. You can add new capabilities to yourself by editing files on the server and rebuilding.

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

      try {
        // ── Conversation persistence ──────────────────────────────
        let convId = conversationId;

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
        const MAX_TOOL_CALLS = 20;

        // Build tools array with web_search
        const tools: (Anthropic.Tool | Anthropic.WebSearchTool20250305)[] = [
          ...adminTools,
          { type: "web_search_20250305" as const, name: "web_search", max_uses: 5 },
        ];

        // Retry helper for rate limits
        async function callWithRetry(params: Anthropic.MessageCreateParamsNonStreaming, retries = 3): Promise<Anthropic.Message> {
          for (let attempt = 0; attempt < retries; attempt++) {
            try {
              return await client.messages.create(params);
            } catch (err: unknown) {
              const isRateLimit = err instanceof Error && (
                err.message.includes("429") || err.message.includes("rate_limit")
              );
              if (isRateLimit && attempt < retries - 1) {
                const delay = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s
                send("text", { content: `\n\n*Rate limited — retrying in ${delay / 1000}s...*\n\n` });
                await new Promise((r) => setTimeout(r, delay));
                continue;
              }
              throw err;
            }
          }
          throw new Error("Max retries exceeded");
        }

        // Agentic loop
        let currentMessages: Anthropic.MessageParam[] = [...anthropicMessages];
        let fullAssistantText = "";
        const allToolCalls: { tool: string; input: unknown; result: unknown }[] = [];

        while (true) {
          const response = await callWithRetry({
            model: "claude-sonnet-4-6",
            max_tokens: 8192,
            system: buildSystemPrompt(currentPath || "/portal/admin"),
            messages: currentMessages,
            tools,
          });

          // ── Pass 1: Collect blocks, emit text/search immediately, gather tool_use blocks ──
          let hasToolUse = false;
          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          const assistantContent: Anthropic.ContentBlock[] = [];
          const toolUseBlocks: Anthropic.ToolUseBlock[] = [];

          for (const block of response.content) {
            assistantContent.push(block);

            if (block.type === "text") {
              fullAssistantText += block.text;
              send("text", { content: block.text });
            } else if (block.type === "web_search_tool_result") {
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

              // Emit tool_start for ALL tools upfront (UI shows them all spinning)
              send("tool_start", {
                id: block.id,
                tool: block.name,
                input: block.input,
                dangerous: isDangerousTool(block.name),
              });
            }
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
            },
          });
        }

        send("done", { conversationId: convId });
      } catch (err) {
        send("error", { message: String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
