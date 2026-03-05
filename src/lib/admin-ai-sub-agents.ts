/**
 * GcsGuard AI — Sub-agent system.
 * Specialized agents that the main AI can delegate tasks to.
 * Each sub-agent has limited, read-only tools and runs independently.
 */

import Anthropic from "@anthropic-ai/sdk";
import { adminTools, executeTool } from "./admin-ai-tools";

const client = new Anthropic();

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SubAgentProgressEvent {
  agentName: string;
  event: "agent_start" | "agent_tool_start" | "agent_tool_result" | "agent_text" | "agent_done" | "agent_error";
  data: Record<string, unknown>;
}

export interface SubAgentResult {
  agent: string;
  summary: string;
  toolCalls: { tool: string; input: unknown; result: unknown }[];
  error?: string;
}

interface SubAgentConfig {
  name: string;
  model: string;
  systemPrompt: string;
  allowedTools: string[];
  maxTokens: number;
  maxToolCalls: number;
}

// ─── Agent Registry ─────────────────────────────────────────────────────────

const SUB_AGENTS: Record<string, SubAgentConfig> = {
  research: {
    name: "Research Agent",
    model: "claude-haiku-4-5-20251001",
    systemPrompt: `You are a research sub-agent for GcsGuard AI. Your job is to search the web and gather information. Be concise and factual. Return structured findings with key data points. Do NOT execute any dangerous operations.`,
    allowedTools: [], // only web_search (added dynamically)
    maxTokens: 4096,
    maxToolCalls: 5,
  },
  database: {
    name: "Database Agent",
    model: "claude-haiku-4-5-20251001",
    systemPrompt: `You are a database sub-agent for GcsGuard AI. Your job is to query and analyze database information. You have READ-ONLY access. Return structured data summaries with counts and key fields. Do NOT modify any data.`,
    allowedTools: [
      "get_system_stats", "list_organizations", "get_organization",
      "list_users", "list_projects", "list_invoices", "list_tickets",
      "list_guard_agents", "list_guard_alerts", "search_everything",
    ],
    maxTokens: 4096,
    maxToolCalls: 8,
  },
  server: {
    name: "Server Agent",
    model: "claude-haiku-4-5-20251001",
    systemPrompt: `You are a server reconnaissance sub-agent for GcsGuard AI. Your job is to inspect server state: list files, read files, search code, check git status. You have READ-ONLY access. Do NOT modify anything. Return structured findings.`,
    allowedTools: ["list_files", "read_file", "search_code", "git_status"],
    maxTokens: 4096,
    maxToolCalls: 8,
  },
  code: {
    name: "Code Agent",
    model: "claude-sonnet-4-6",
    systemPrompt: `You are a code analysis sub-agent for GcsGuard AI. Your job is to read, analyze, and search code on the production server. You have READ-ONLY access. Return detailed analysis with file paths, function names, and patterns found. Do NOT modify anything.`,
    allowedTools: ["list_files", "read_file", "search_code", "git_status"],
    maxTokens: 8192,
    maxToolCalls: 12,
  },
};

// ─── Retry Helper ───────────────────────────────────────────────────────────

async function callWithRetry(
  params: Anthropic.MessageCreateParamsNonStreaming,
  retries = 2,
): Promise<Anthropic.Message> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await client.messages.create(params);
    } catch (err: unknown) {
      const isRateLimit = err instanceof Error && (
        err.message.includes("429") || err.message.includes("rate_limit")
      );
      if (isRateLimit && attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt + 1) * 1000));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded");
}

// ─── Sub-Agent Executor ─────────────────────────────────────────────────────

export async function executeSubAgent(
  agentType: string,
  task: string,
  context: string,
  onProgress: (event: SubAgentProgressEvent) => void,
): Promise<SubAgentResult> {
  const config = SUB_AGENTS[agentType];
  if (!config) {
    return { agent: agentType, summary: "", toolCalls: [], error: `Unknown agent type: ${agentType}` };
  }

  onProgress({
    agentName: config.name,
    event: "agent_start",
    data: { agent: agentType, task },
  });

  // Build tools for this sub-agent
  const subTools: (Anthropic.Tool | Anthropic.WebSearchTool20250305)[] = [];

  if (agentType === "research") {
    subTools.push({ type: "web_search_20250305" as const, name: "web_search", max_uses: 5 });
  } else {
    for (const tool of adminTools) {
      if (config.allowedTools.includes(tool.name)) {
        subTools.push(tool);
      }
    }
  }

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: `TASK: ${task}${context ? `\n\nCONTEXT: ${context}` : ""}` },
  ];

  let fullText = "";
  const toolCalls: { tool: string; input: unknown; result: unknown }[] = [];
  let toolCallCount = 0;

  try {
    // Sub-agent agentic loop
    while (true) {
      const response = await callWithRetry({
        model: config.model,
        max_tokens: config.maxTokens,
        system: config.systemPrompt,
        messages,
        tools: subTools.length > 0 ? subTools : undefined,
      });

      let hasToolUse = false;
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      const assistantContent: Anthropic.ContentBlock[] = [];

      for (const block of response.content) {
        assistantContent.push(block);

        if (block.type === "text") {
          fullText += block.text;
          onProgress({
            agentName: config.name,
            event: "agent_text",
            data: { content: block.text },
          });
        } else if (block.type === "tool_use") {
          hasToolUse = true;
          toolCallCount++;

          onProgress({
            agentName: config.name,
            event: "agent_tool_start",
            data: { id: block.id, tool: block.name, input: block.input },
          });

          const result = await executeTool(block.name, block.input as Record<string, unknown>);
          const parsedResult = JSON.parse(result);

          onProgress({
            agentName: config.name,
            event: "agent_tool_result",
            data: { id: block.id, tool: block.name, result: parsedResult, success: !result.includes('"error"') },
          });

          toolCalls.push({ tool: block.name, input: block.input, result: parsedResult });

          // Truncate large results
          const MAX_RESULT_LEN = 3000;
          toolResults.push({
            type: "tool_result" as const,
            tool_use_id: block.id,
            content: result.length > MAX_RESULT_LEN
              ? result.substring(0, MAX_RESULT_LEN) + "\n...(truncated)"
              : result,
          });
        }
      }

      if (!hasToolUse || toolCallCount >= config.maxToolCalls) break;

      messages.push(
        { role: "assistant" as const, content: assistantContent },
        { role: "user" as const, content: toolResults },
      );
    }

    // Cap summary to avoid bloating main context
    const MAX_SUMMARY = 3000;
    const summary = fullText.length > MAX_SUMMARY
      ? fullText.substring(0, MAX_SUMMARY) + "\n...(summary truncated)"
      : fullText;

    onProgress({
      agentName: config.name,
      event: "agent_done",
      data: { summary, toolCallCount },
    });

    return { agent: config.name, summary, toolCalls };
  } catch (err) {
    const errorMsg = String(err);
    onProgress({
      agentName: config.name,
      event: "agent_error",
      data: { error: errorMsg },
    });
    return { agent: config.name, summary: "", toolCalls, error: errorMsg };
  }
}
