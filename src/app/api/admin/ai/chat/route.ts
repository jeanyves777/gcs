import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { isGCSStaff } from "@/lib/auth-utils";
import { verifyToken } from "../pin/route";
import Anthropic from "@anthropic-ai/sdk";
import { adminTools, executeTool } from "@/lib/admin-ai-tools";

export const maxDuration = 120;

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
  return `You are GcsGuard AI, the intelligent admin command center for General Computing Solutions (GCS). You are an elite system administrator AI assistant with full access to all admin operations.

CURRENT CONTEXT: The admin is currently on "${currentPath}" — ${ctx}

YOUR CAPABILITIES:
- View system stats and dashboards
- List, create, update, and delete organizations
- List and update users (roles, active status)
- List, create, and update projects
- List and update invoices
- List, update, and reply to support tickets
- List GcsGuard security agents
- List and manage security alerts
- Search across all entities

BEHAVIOR RULES:
1. Be concise and direct. Show results clearly.
2. When asked about the current page, use the context above to give relevant info.
3. For destructive actions (delete, deactivate), confirm what you're about to do BEFORE executing.
4. When listing data, format it clearly with key details.
5. If a request is ambiguous, ask for clarification.
6. Always execute the appropriate tool — don't guess at data.
7. When multiple tools are needed, call them sequentially and summarize.
8. Use markdown formatting for readability (bold, lists, code blocks).
9. If an error occurs, explain it clearly and suggest fixes.

IMPORTANT: You have real admin powers. Every tool call modifies the actual database. Be careful with updates and deletes.`;
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

  const { messages, currentPath } = await req.json();
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
        // Convert messages to Anthropic format
        const anthropicMessages: Anthropic.MessageParam[] = messages.map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

        let toolCallCount = 0;
        const MAX_TOOL_CALLS = 10;

        // Agentic loop
        let currentMessages: Anthropic.MessageParam[] = [...anthropicMessages];

        while (true) {
          const response = await client.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 4096,
            system: buildSystemPrompt(currentPath || "/portal/admin"),
            messages: currentMessages,
            tools: adminTools,
          });

          // Process response blocks
          let hasToolUse = false;
          const toolResults: Anthropic.MessageParam[] = [];
          const assistantContent: Anthropic.ContentBlock[] = [];

          for (const block of response.content) {
            assistantContent.push(block);

            if (block.type === "text") {
              send("text", { content: block.text });
            } else if (block.type === "tool_use") {
              hasToolUse = true;
              toolCallCount++;

              send("tool_start", {
                id: block.id,
                tool: block.name,
                input: block.input,
              });

              // Execute the tool
              const result = await executeTool(block.name, block.input as Record<string, unknown>);

              send("tool_result", {
                id: block.id,
                tool: block.name,
                result: JSON.parse(result),
                success: !result.includes('"error"'),
              });

              // Collect tool results for next iteration
              toolResults.push({
                role: "user" as const,
                content: [{
                  type: "tool_result" as const,
                  tool_use_id: block.id,
                  content: result,
                }],
              });
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
            ...toolResults,
          ];
        }

        send("done", {});
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
