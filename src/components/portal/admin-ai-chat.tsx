"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import {
  Brain,
  X,
  Send,
  Lock,
  Unlock,
  Loader2,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Wrench,
  Sparkles,
  Trash2,
  MessageSquare,
  Plus,
  Clock,
  PanelLeftClose,
  PanelLeftOpen,
  Globe,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ContentBlock {
  type: "text" | "tool_group";
  text?: string;
  toolIds?: string[];
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolExecution[];
  contentBlocks?: ContentBlock[];
}

interface SubAgentTool {
  id: string;
  tool: string;
  status: "running" | "done";
  success?: boolean;
}

interface SubAgentActivity {
  name: string;
  status: "running" | "done" | "error";
  toolCalls: SubAgentTool[];
  text: string;
}

interface ToolExecution {
  id: string;
  tool: string;
  input: Record<string, unknown>;
  result?: Record<string, unknown> | null;
  success?: boolean;
  dangerous?: boolean;
  status: "running" | "done" | "error";
  subAgentActivity?: SubAgentActivity[];
}

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count?: { messages: number };
}

type ModalState = "closed" | "pin" | "chat";

// ─── Component ──────────────────────────────────────────────────────────────

export function AdminAIChat() {
  const pathname = usePathname();
  const [state, setState] = useState<ModalState>("closed");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [hasPin, setHasPin] = useState<boolean | null>(null);

  // PIN state
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [pinShake, setPinShake] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Conversation state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);

  // Check PIN status on mount
  useEffect(() => {
    fetch("/api/admin/ai/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "check" }),
    })
      .then((r) => r.json())
      .then((d) => setHasPin(d.hasPin ?? false))
      .catch(() => setHasPin(false));
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (state === "chat") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [state]);

  // Load conversations when entering chat
  useEffect(() => {
    if (state === "chat" && sessionToken) {
      loadConversations();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, sessionToken]);

  const loadConversations = async () => {
    if (!sessionToken) return;
    setLoadingConversations(true);
    try {
      const res = await fetch("/api/admin/ai/conversations", {
        headers: { "X-AI-Session": sessionToken },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadConversation = async (id: string) => {
    if (!sessionToken) return;
    try {
      const res = await fetch(`/api/admin/ai/conversations/${id}`, {
        headers: { "X-AI-Session": sessionToken },
      });
      if (res.ok) {
        const data = await res.json();
        const loadedMessages: ChatMessage[] = data.messages.map((m: { id: string; role: string; content: string; toolCalls?: string }) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          toolCalls: m.toolCalls ? JSON.parse(m.toolCalls).map((tc: { tool: string; input: Record<string, unknown>; result: Record<string, unknown> }) => ({
            id: crypto.randomUUID(),
            tool: tc.tool,
            input: tc.input || {},
            result: tc.result || null,
            success: true,
            status: "done" as const,
          })) : undefined,
        }));
        setMessages(loadedMessages);
        setActiveConversationId(id);
        setSidebarOpen(false);
      }
    } catch {
      // silently fail
    }
  };

  const deleteConversation = async (id: string) => {
    if (!sessionToken) return;
    try {
      const res = await fetch(`/api/admin/ai/conversations/${id}`, {
        method: "DELETE",
        headers: { "X-AI-Session": sessionToken },
      });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeConversationId === id) {
          setActiveConversationId(null);
          setMessages([]);
        }
      }
    } catch {
      // silently fail
    }
  };

  const startNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setSidebarOpen(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const openModal = () => {
    if (sessionToken) {
      setState("chat");
    } else {
      setState("pin");
    }
  };

  // ─── PIN Handling ───────────────────────────────────────────────────────

  const handlePinSubmit = async () => {
    setPinError("");
    setPinLoading(true);

    try {
      if (!hasPin) {
        if (pin.length < 4 || pin.length > 6) {
          setPinError("PIN must be 4-6 digits");
          setPinLoading(false);
          return;
        }
        if (pin !== confirmPin) {
          setPinError("PINs don't match");
          triggerShake();
          setPinLoading(false);
          return;
        }
        const res = await fetch("/api/admin/ai/pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "set", pin }),
        });
        const data = await res.json();
        if (!res.ok) {
          setPinError(data.error || "Failed to set PIN");
          triggerShake();
          setPinLoading(false);
          return;
        }
        setSessionToken(data.sessionToken);
        setHasPin(true);
        setState("chat");
      } else {
        const res = await fetch("/api/admin/ai/pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "verify", pin }),
        });
        const data = await res.json();
        if (!res.ok) {
          setPinError("Wrong PIN");
          triggerShake();
          setPinLoading(false);
          return;
        }
        setSessionToken(data.sessionToken);
        setState("chat");
      }
    } catch {
      setPinError("Network error");
    } finally {
      setPinLoading(false);
      setPin("");
      setConfirmPin("");
    }
  };

  const triggerShake = () => {
    setPinShake(true);
    setTimeout(() => setPinShake(false), 500);
  };

  // ─── Chat Handling ──────────────────────────────────────────────────────

  const sendMessage = useCallback(async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isStreaming || !sessionToken) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: msg,
    };

    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      toolCalls: [],
      contentBlocks: [],
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsStreaming(true);

    try {
      const allMessages = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/admin/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-AI-Session": sessionToken,
        },
        body: JSON.stringify({
          messages: allMessages,
          currentPath: pathname,
          conversationId: activeConversationId,
        }),
      });

      if (res.status === 401) {
        setSessionToken(null);
        setState("pin");
        setMessages((prev) => prev.slice(0, -1));
        return;
      }

      if (!res.ok || !res.body) throw new Error("Stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7);
          } else if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              processSSE(currentEvent, data, assistantMsg.id);
            } catch {
              // skip malformed JSON
            }
          }
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, content: m.content || `Error: ${err}` }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
      // Refresh conversation list
      loadConversations();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, isStreaming, sessionToken, messages, pathname, activeConversationId]);

  const processSSE = (event: string, data: Record<string, unknown>, assistantId: string) => {
    switch (event) {
      case "conversation":
        setActiveConversationId(data.id as string);
        break;

      default:
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== assistantId) return m;

            switch (event) {
              case "text": {
                const newText = data.content as string;
                const blocks = [...(m.contentBlocks || [])];
                const lastBlock = blocks[blocks.length - 1];
                if (lastBlock && lastBlock.type === "text") {
                  blocks[blocks.length - 1] = { ...lastBlock, text: (lastBlock.text || "") + newText };
                } else {
                  blocks.push({ type: "text", text: newText });
                }
                return { ...m, content: m.content + newText, contentBlocks: blocks };
              }

              case "tool_start": {
                const newTool: ToolExecution = {
                  id: data.id as string,
                  tool: data.tool as string,
                  input: data.input as Record<string, unknown>,
                  dangerous: data.dangerous as boolean | undefined,
                  status: "running",
                };
                const blocks = [...(m.contentBlocks || [])];
                const lastBlock = blocks[blocks.length - 1];
                if (lastBlock && lastBlock.type === "tool_group") {
                  blocks[blocks.length - 1] = { ...lastBlock, toolIds: [...(lastBlock.toolIds || []), newTool.id] };
                } else {
                  blocks.push({ type: "tool_group", toolIds: [newTool.id] });
                }
                return { ...m, toolCalls: [...(m.toolCalls || []), newTool], contentBlocks: blocks };
              }

              case "tool_result":
                return {
                  ...m,
                  toolCalls: (m.toolCalls || []).map((tc) =>
                    tc.id === data.id
                      ? { ...tc, result: data.result as Record<string, unknown> | null, success: data.success as boolean, status: "done" as const }
                      : tc
                  ),
                };

              case "sub_agent": {
                const parentId = data.parentToolId as string;
                const agentName = data.agentName as string;
                const agentEvent = data.event as string;
                const agentData = data.data as Record<string, unknown>;

                return {
                  ...m,
                  toolCalls: (m.toolCalls || []).map((tc) => {
                    if (tc.id !== parentId) return tc;
                    const subs = [...(tc.subAgentActivity || [])];

                    const lastIdx = subs.length - 1;
                    switch (agentEvent) {
                      case "agent_start":
                        subs.push({ name: agentName, status: "running", toolCalls: [], text: "" });
                        break;
                      case "agent_tool_start":
                        if (lastIdx >= 0) {
                          subs[lastIdx] = {
                            ...subs[lastIdx],
                            toolCalls: [...subs[lastIdx].toolCalls, {
                              id: agentData.id as string,
                              tool: agentData.tool as string,
                              status: "running" as const,
                            }],
                          };
                        }
                        break;
                      case "agent_tool_result":
                        if (lastIdx >= 0) {
                          subs[lastIdx] = {
                            ...subs[lastIdx],
                            toolCalls: subs[lastIdx].toolCalls.map((t) =>
                              t.id === (agentData.id as string)
                                ? { ...t, status: "done" as const, success: agentData.success as boolean }
                                : t
                            ),
                          };
                        }
                        break;
                      case "agent_text":
                        if (lastIdx >= 0) {
                          subs[lastIdx] = { ...subs[lastIdx], text: subs[lastIdx].text + (agentData.content as string) };
                        }
                        break;
                      case "agent_done":
                        if (lastIdx >= 0) {
                          subs[lastIdx] = { ...subs[lastIdx], status: "done" };
                        }
                        break;
                      case "agent_error":
                        if (lastIdx >= 0) {
                          subs[lastIdx] = { ...subs[lastIdx], status: "error" };
                        }
                        break;
                    }

                    return { ...tc, subAgentActivity: subs };
                  }),
                };
              }

              case "web_search": {
                const wsText = "\n*Searching the web...*\n";
                const wsBlocks = [...(m.contentBlocks || [])];
                const wsLast = wsBlocks[wsBlocks.length - 1];
                if (wsLast && wsLast.type === "text") {
                  wsBlocks[wsBlocks.length - 1] = { ...wsLast, text: (wsLast.text || "") + wsText };
                } else {
                  wsBlocks.push({ type: "text", text: wsText });
                }
                return { ...m, content: m.content + wsText, contentBlocks: wsBlocks };
              }

              case "error": {
                const errText = `\n\n**Error:** ${data.message}`;
                const errBlocks = [...(m.contentBlocks || [])];
                const errLast = errBlocks[errBlocks.length - 1];
                if (errLast && errLast.type === "text") {
                  errBlocks[errBlocks.length - 1] = { ...errLast, text: (errLast.text || "") + errText };
                } else {
                  errBlocks.push({ type: "text", text: errText });
                }
                return { ...m, content: m.content + errText, contentBlocks: errBlocks };
              }

              default:
                return m;
            }
          })
        );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
    if (e.key === "Escape") {
      if (!isStreaming) setState("closed");
    }
  };

  const clearChat = () => {
    setMessages([]);
    setActiveConversationId(null);
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <>
      {/* Floating Button */}
      {state === "closed" && (
        <button
          onClick={openModal}
          className="fixed bottom-6 right-6 z-50 group"
          title="GcsGuard AI"
        >
          <div className="relative">
            <div
              className="absolute -inset-1.5 rounded-full opacity-60 group-hover:opacity-100 transition-opacity animate-pulse"
              style={{ background: "var(--brand-primary)", filter: "blur(6px)" }}
            />
            <div
              className="relative flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-transform group-hover:scale-110"
              style={{ background: "var(--brand-primary)" }}
            >
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white bg-emerald-500">
              <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75" />
            </div>
          </div>
        </button>
      )}

      {/* Side Panel */}
      {state !== "closed" && (
        <div
          className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-2xl flex border-l shadow-2xl"
          style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}
        >
          {/* Conversation Sidebar */}
          {state === "chat" && sidebarOpen && (
            <div
              className="w-64 flex-shrink-0 border-r flex flex-col"
              style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
            >
              <div className="flex items-center justify-between px-3 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  History
                </span>
                <button
                  onClick={startNewChat}
                  className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-primary)]"
                  title="New chat"
                >
                  <Plus className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {loadingConversations ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--text-muted)" }} />
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="py-8 text-center">
                    <MessageSquare className="w-5 h-5 mx-auto mb-2 opacity-20" />
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>No conversations yet</p>
                  </div>
                ) : (
                  <div className="py-1">
                    {conversations.map((conv) => (
                      <div
                        key={conv.id}
                        className={cn(
                          "group flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors",
                          activeConversationId === conv.id
                            ? "bg-[var(--bg-primary)]"
                            : "hover:bg-[var(--bg-primary)]"
                        )}
                        onClick={() => loadConversation(conv.id)}
                      >
                        <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
                            {conv.title}
                          </p>
                          <p className="text-[10px] flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                            <Clock className="w-2.5 h-2.5" />
                            {formatRelativeTime(conv.updatedAt)}
                          </p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all hover:bg-red-500/10"
                          title="Delete conversation"
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Main Panel */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <div
              className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
              style={{ borderColor: "var(--border)", background: "var(--brand-primary)" }}
            >
              <div className="flex items-center gap-2.5">
                {state === "chat" && (
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-colors"
                    title={sidebarOpen ? "Close history" : "Open history"}
                  >
                    {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
                  </button>
                )}
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/20">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-white font-semibold text-sm">GcsGuard AI</h2>
                  <p className="text-white/70 text-[11px]">
                    {state === "pin" ? "Authentication Required" : "Admin Command Center & Software Engineer"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {state === "chat" && (
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-full bg-white/15 text-white/80 max-w-[140px] truncate"
                    title={pathname}
                  >
                    {pathname.replace("/portal/admin", "").replace(/^\//, "") || "Overview"}
                  </span>
                )}
                <button
                  onClick={() => { if (!isStreaming) setState("closed"); }}
                  className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            {state === "pin" ? (
              <PinGate
                hasPin={hasPin}
                pin={pin}
                setPin={setPin}
                confirmPin={confirmPin}
                setConfirmPin={setConfirmPin}
                pinError={pinError}
                pinLoading={pinLoading}
                pinShake={pinShake}
                onSubmit={handlePinSubmit}
              />
            ) : (
              <ChatView
                messages={messages}
                input={input}
                setInput={setInput}
                isStreaming={isStreaming}
                messagesEndRef={messagesEndRef}
                inputRef={inputRef}
                onSend={sendMessage}
                onKeyDown={handleKeyDown}
                onClear={clearChat}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ─── PIN Gate ─────────────────────────────────────────────────────────────────

function PinGate({
  hasPin, pin, setPin, confirmPin, setConfirmPin, pinError, pinLoading, pinShake, onSubmit,
}: {
  hasPin: boolean | null;
  pin: string;
  setPin: (v: string) => void;
  confirmPin: string;
  setConfirmPin: (v: string) => void;
  pinError: string;
  pinLoading: boolean;
  pinShake: boolean;
  onSubmit: () => void;
}) {
  const isSetup = !hasPin;

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className={cn("w-full max-w-xs space-y-6 text-center", pinShake && "animate-shake")}>
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "var(--brand-primary)" }}>
            {pinLoading ? <Loader2 className="w-7 h-7 text-white animate-spin" /> : <Lock className="w-7 h-7 text-white" />}
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            {isSetup ? "Set Your AI PIN" : "Enter PIN to Unlock"}
          </h3>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {isSetup ? "Create a 4-6 digit PIN to secure GcsGuard AI" : "Enter your PIN to access admin commands"}
          </p>
        </div>
        <div className="space-y-3">
          <input
            type="password" inputMode="numeric" maxLength={6}
            placeholder={isSetup ? "Create PIN" : "Enter PIN"}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => { if (e.key === "Enter") { if (isSetup && !confirmPin) return; onSubmit(); } }}
            className="w-full text-center text-2xl tracking-[0.5em] py-3 rounded-xl border-2 outline-none transition-all focus:border-[var(--brand-primary)]"
            style={{ background: "var(--bg-secondary)", borderColor: pinError ? "#EF4444" : "var(--border)", color: "var(--text-primary)" }}
            autoFocus
          />
          {isSetup && (
            <input
              type="password" inputMode="numeric" maxLength={6} placeholder="Confirm PIN"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => { if (e.key === "Enter") onSubmit(); }}
              className="w-full text-center text-2xl tracking-[0.5em] py-3 rounded-xl border-2 outline-none transition-all focus:border-[var(--brand-primary)]"
              style={{ background: "var(--bg-secondary)", borderColor: pinError ? "#EF4444" : "var(--border)", color: "var(--text-primary)" }}
            />
          )}
          {pinError && <p className="text-sm text-red-500 font-medium">{pinError}</p>}
          <button
            onClick={onSubmit} disabled={pinLoading || pin.length < 4}
            className="w-full py-3 rounded-xl text-white font-medium transition-all disabled:opacity-50"
            style={{ background: "var(--brand-primary)" }}
          >
            {pinLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (
              <span className="flex items-center justify-center gap-2">
                <Unlock className="w-4 h-4" />
                {isSetup ? "Set PIN & Enter" : "Unlock"}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Chat View ────────────────────────────────────────────────────────────────

function ChatView({
  messages, input, setInput, isStreaming, messagesEndRef, inputRef, onSend, onKeyDown, onClear,
}: {
  messages: ChatMessage[];
  input: string;
  setInput: (v: string) => void;
  isStreaming: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  onSend: (text?: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onClear: () => void;
}) {
  return (
    <>
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && <EmptyState onQuickAction={onSend} />}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} onQuickReply={onSend} />
        ))}

        {isStreaming && (
          <div className="flex items-center gap-2 px-3 py-2" style={{ color: "var(--text-secondary)" }}>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span className="text-xs">Processing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t p-3 flex-shrink-0" style={{ borderColor: "var(--border)" }}>
        {messages.length > 0 && (
          <div className="flex justify-end mb-2">
            <button
              onClick={onClear}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors hover:bg-[var(--bg-secondary)]"
              style={{ color: "var(--text-muted)" }}
            >
              <Trash2 className="w-3 h-3" />
              New chat
            </button>
          </div>
        )}
        <div
          className="flex items-end gap-2 rounded-xl border px-3 py-2"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask GcsGuard AI anything..."
            rows={1}
            className="flex-1 resize-none bg-transparent outline-none text-sm"
            style={{ color: "var(--text-primary)", maxHeight: "120px", minHeight: "24px" }}
            onInput={(e) => {
              const t = e.target as HTMLTextAreaElement;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 120) + "px";
            }}
            disabled={isStreaming}
          />
          <button
            onClick={() => onSend()}
            disabled={!input.trim() || isStreaming}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-white transition-all disabled:opacity-30"
            style={{ background: "var(--brand-primary)" }}
          >
            {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[11px] mt-1.5 text-center" style={{ color: "var(--text-muted)" }}>
          Shift+Enter for newline · ESC to close
        </p>
      </div>
    </>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onQuickAction }: { onQuickAction: (text: string) => void }) {
  const suggestions = [
    { label: "System Overview", prompt: "Give me a system overview with key stats" },
    { label: "Open Alerts", prompt: "Show me all open security alerts" },
    { label: "List Files on Server", prompt: "List the main directories in /var/www/gcs/src" },
    { label: "Git Status", prompt: "What's the current git status on the production server?" },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full py-8 space-y-6">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "var(--brand-primary)" }}>
        <Sparkles className="w-7 h-7 text-white" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          GcsGuard AI Ready
        </h3>
        <p className="text-sm max-w-md" style={{ color: "var(--text-secondary)" }}>
          Full admin control + software engineering. I can manage the system, edit code on the server, install packages, deploy, and search the web.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
        {suggestions.map((s) => (
          <button
            key={s.label}
            onClick={() => onQuickAction(s.prompt)}
            className="text-left px-3 py-2.5 rounded-xl border text-sm transition-all hover:scale-[1.02]"
            style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
          >
            <span className="font-medium">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message, onQuickReply }: { message: ChatMessage; onQuickReply: (text: string) => void }) {
  const isUser = message.role === "user";

  // Detect if the assistant is asking for confirmation
  const isAskingConfirmation = !isUser && message.content &&
    /\b(proceed|confirm|go ahead|shall I|should I|want me to)\b.*\?/i.test(message.content);

  const hasContentBlocks = !isUser && message.contentBlocks && message.contentBlocks.length > 0;

  const renderTextBubble = (text: string, key?: string | number) => (
    <div
      key={key}
      className={cn(
        "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
        isUser ? "rounded-br-md" : "rounded-bl-md"
      )}
      style={
        isUser
          ? { background: "var(--brand-primary)", color: "white" }
          : { background: "var(--bg-secondary)", color: "var(--text-primary)" }
      }
    >
      <FormattedText text={text} />
    </div>
  );

  return (
    <div className={cn("flex flex-col gap-2", isUser ? "items-end" : "items-start")}>
      {hasContentBlocks ? (
        // Interleaved rendering: text → tools → text in order
        message.contentBlocks!.map((block, i) => {
          if (block.type === "text" && block.text) {
            return renderTextBubble(block.text, `block-${i}`);
          }
          if (block.type === "tool_group" && block.toolIds) {
            return (
              <div key={`block-${i}`} className="w-full space-y-2">
                {block.toolIds.map((id) => {
                  const tc = message.toolCalls?.find((t) => t.id === id);
                  return tc ? <ToolCard key={tc.id} tool={tc} /> : null;
                })}
              </div>
            );
          }
          return null;
        })
      ) : (
        // Fallback for loaded conversations / user messages
        <>
          {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
            <div className="w-full space-y-2">
              {message.toolCalls.map((tc) => (
                <ToolCard key={tc.id} tool={tc} />
              ))}
            </div>
          )}
          {message.content && renderTextBubble(message.content)}
        </>
      )}

      {/* Quick confirmation buttons */}
      {isAskingConfirmation && (
        <div className="flex gap-2">
          <button
            onClick={() => onQuickReply("Yes, proceed.")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all hover:opacity-90"
            style={{ background: "#16a34a" }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Yes, proceed
          </button>
          <button
            onClick={() => onQuickReply("No, cancel.")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all hover:opacity-90"
            style={{ background: "#dc2626" }}
          >
            <XCircle className="w-3.5 h-3.5" />
            No, cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Tool Card ────────────────────────────────────────────────────────────────

function ToolCard({ tool }: { tool: ToolExecution }) {
  const [expanded, setExpanded] = useState(false);

  const toolLabel = tool.tool.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const resultSummary = getResultSummary(tool);
  const isSSHTool = ["list_files", "read_file", "write_file", "edit_file", "create_directory", "delete_file", "search_code", "run_command", "install_package", "git_status", "git_commit_and_push", "server_rebuild"].includes(tool.tool);

  return (
    <div
      className="w-full rounded-xl border overflow-hidden transition-all"
      style={{ borderColor: tool.dangerous ? "rgba(234,179,8,0.3)" : "var(--border)", background: "var(--bg-primary)" }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-[var(--bg-secondary)]"
      >
        <div
          className={cn("flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0", tool.status === "running" ? "animate-pulse" : "")}
          style={{
            background: tool.status === "error" || tool.success === false
              ? "rgba(239,68,68,0.15)"
              : tool.dangerous
              ? "rgba(234,179,8,0.15)"
              : "var(--bg-secondary)",
          }}
        >
          {tool.status === "running" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "var(--brand-primary)" }} />
          ) : tool.success === false ? (
            <XCircle className="w-3.5 h-3.5 text-red-500" />
          ) : tool.dangerous ? (
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
          ) : isSSHTool ? (
            <Globe className="w-3.5 h-3.5" style={{ color: "var(--brand-primary)" }} />
          ) : (
            <Wrench className="w-3.5 h-3.5" style={{ color: "var(--brand-primary)" }} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{toolLabel}</span>
          {resultSummary && (
            <span className="text-xs ml-2" style={{ color: "var(--text-secondary)" }}>{resultSummary}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {tool.status === "done" && tool.success !== false && (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          )}
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
          )}
        </div>
      </button>

      {/* Sub-agent activity (for delegate_task) */}
      {tool.tool === "delegate_task" && tool.subAgentActivity && tool.subAgentActivity.length > 0 && (
        <div className="border-t px-3.5 py-2 space-y-1.5" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
          {tool.subAgentActivity.map((agent, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                {agent.status === "running" ? (
                  <Loader2 className="w-3 h-3 animate-spin" style={{ color: "var(--brand-primary)" }} />
                ) : agent.status === "error" ? (
                  <XCircle className="w-3 h-3 text-red-500" />
                ) : (
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                )}
                <span className="text-[11px] font-medium" style={{ color: "var(--text-primary)" }}>
                  {agent.name}
                </span>
              </div>
              <div className="flex gap-1 ml-1">
                {agent.toolCalls.map((tc, j) => (
                  <div
                    key={j}
                    className="w-2 h-2 rounded-full"
                    title={tc.tool}
                    style={{
                      background: tc.status === "running"
                        ? "var(--brand-primary)"
                        : tc.success !== false
                        ? "#10b981"
                        : "#ef4444",
                    }}
                  />
                ))}
              </div>
              {agent.status === "running" && (
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>working...</span>
              )}
            </div>
          ))}
        </div>
      )}

      {expanded && (
        <div className="border-t px-3.5 py-2.5 space-y-2" style={{ borderColor: "var(--border)" }}>
          {tool.input && Object.keys(tool.input).length > 0 && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Input</span>
              <pre className="text-xs mt-0.5 p-2 rounded-lg overflow-x-auto" style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}>
                {JSON.stringify(tool.input, null, 2)}
              </pre>
            </div>
          )}
          {tool.result && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Result</span>
              <pre className="text-xs mt-0.5 p-2 rounded-lg overflow-x-auto max-h-60" style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}>
                {JSON.stringify(tool.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getResultSummary(tool: ToolExecution): string {
  if (tool.status === "running") return "Executing...";
  if (!tool.result || typeof tool.result !== "object") return "";

  const r = tool.result as Record<string, unknown>;
  if (r.error) return `Error: ${String(r.error).substring(0, 60)}`;
  if (typeof r.count === "number") return `${r.count} results`;
  if (r.success) return "Success";
  if (r.name) return String(r.name);
  if (r.exitCode !== undefined) return `Exit ${r.exitCode}`;
  return "";
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Render markdown: headers, tables, lists, bold, code, hr, code blocks */
function FormattedText({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) { elements.push(<div key={i} className="h-1.5" />); i++; continue; }

    // Code block
    if (trimmed.startsWith("```")) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <div key={`code${i}`} className="my-2 rounded-lg overflow-hidden border" style={{ borderColor: "var(--border)" }}>
          {lang && (
            <div className="px-3 py-1 text-[10px] font-mono uppercase" style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}>
              {lang}
            </div>
          )}
          <pre className="p-3 text-xs font-mono overflow-x-auto" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>
            {codeLines.join("\n")}
          </pre>
        </div>
      );
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      elements.push(<hr key={i} className="my-2" style={{ borderColor: "var(--border)" }} />);
      i++; continue;
    }

    if (trimmed.startsWith("### ")) {
      elements.push(<h4 key={i} className="text-sm font-bold mt-2 mb-1" style={{ color: "var(--text-primary)" }}>{renderInline(trimmed.slice(4))}</h4>);
      i++; continue;
    }
    if (trimmed.startsWith("## ")) {
      elements.push(<h3 key={i} className="text-sm font-bold mt-3 mb-1" style={{ color: "var(--text-primary)" }}>{renderInline(trimmed.slice(3))}</h3>);
      i++; continue;
    }
    if (trimmed.startsWith("# ")) {
      elements.push(<h2 key={i} className="text-base font-bold mt-3 mb-1" style={{ color: "var(--text-primary)" }}>{renderInline(trimmed.slice(2))}</h2>);
      i++; continue;
    }

    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }
      elements.push(<MarkdownTable key={`t${i}`} lines={tableLines} />);
      continue;
    }

    if (/^[-*] /.test(trimmed)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\s*[-*] /.test(lines[i])) {
        listItems.push(lines[i].trim().replace(/^[-*] /, ""));
        i++;
      }
      elements.push(
        <ul key={`ul${i}`} className="space-y-0.5 my-1" style={{ paddingLeft: "1.25rem" }}>
          {listItems.map((item, j) => (
            <li key={j} className="list-disc" style={{ color: "var(--text-secondary)" }}>
              <span style={{ color: "var(--text-primary)" }}>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s/.test(lines[i])) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s/, ""));
        i++;
      }
      elements.push(
        <ol key={`ol${i}`} className="space-y-0.5 my-1" style={{ paddingLeft: "1.25rem" }}>
          {listItems.map((item, j) => (
            <li key={j} className="list-decimal" style={{ color: "var(--text-secondary)" }}>
              <span style={{ color: "var(--text-primary)" }}>{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    elements.push(<div key={i}>{renderInline(trimmed)}</div>);
    i++;
  }

  return <div className="space-y-0.5">{elements}</div>;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);
  return parts.map((part, j) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={j}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={j} className="px-1 py-0.5 rounded text-xs font-mono" style={{ background: "var(--bg-secondary)" }}>
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) {
      return <em key={j}>{part.slice(1, -1)}</em>;
    }
    return <span key={j}>{part}</span>;
  });
}

function MarkdownTable({ lines }: { lines: string[] }) {
  if (lines.length < 2) return null;
  const parseRow = (line: string) => line.split("|").slice(1, -1).map((cell) => cell.trim());
  const headers = parseRow(lines[0]);
  const startIdx = lines[1].includes("---") ? 2 : 1;
  const rows = lines.slice(startIdx).map(parseRow);

  return (
    <div className="my-2 rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)" }}>
      <table className="w-full text-xs">
        <thead>
          <tr style={{ background: "var(--bg-secondary)" }}>
            {headers.map((h, j) => (
              <th key={j} className="text-left px-3 py-2 font-semibold" style={{ color: "var(--text-primary)", borderBottom: "1px solid var(--border)" }}>
                {renderInline(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={ri % 2 === 1 ? { background: "var(--bg-secondary)" } : undefined}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-1.5" style={{ color: "var(--text-primary)", borderBottom: ri < rows.length - 1 ? "1px solid var(--border)" : undefined }}>
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
