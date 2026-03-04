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
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolExecution[];
}

interface ToolExecution {
  id: string;
  tool: string;
  input: Record<string, unknown>;
  result?: Record<string, unknown> | null;
  success?: boolean;
  status: "running" | "done" | "error";
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
        // Setting new PIN
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
        // Verifying existing PIN
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
        body: JSON.stringify({ messages: allMessages, currentPath: pathname }),
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let currentEvent = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7);
          } else if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            processSSE(currentEvent, data, assistantMsg.id);
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
    }
  }, [input, isStreaming, sessionToken, messages, pathname]);

  const processSSE = (event: string, data: Record<string, unknown>, assistantId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== assistantId) return m;

        switch (event) {
          case "text":
            return { ...m, content: m.content + (data.content as string) };

          case "tool_start": {
            const newTool: ToolExecution = {
              id: data.id as string,
              tool: data.tool as string,
              input: data.input as Record<string, unknown>,
              status: "running",
            };
            return { ...m, toolCalls: [...(m.toolCalls || []), newTool] };
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

          case "error":
            return { ...m, content: m.content + `\n\n**Error:** ${data.message}` };

          default:
            return m;
        }
      })
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
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
            {/* Animated glow ring */}
            <div
              className="absolute -inset-1.5 rounded-full opacity-60 group-hover:opacity-100 transition-opacity animate-pulse"
              style={{
                background: "var(--brand-primary)",
                filter: "blur(6px)",
              }}
            />
            <div
              className="relative flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-transform group-hover:scale-110"
              style={{
                background: "var(--brand-primary)",
              }}
            >
              <Brain className="w-6 h-6 text-white" />
            </div>
            {/* Status dot */}
            <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white bg-emerald-500">
              <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75" />
            </div>
          </div>
        </button>
      )}

      {/* Side Panel — no backdrop, site stays interactive */}
      {state !== "closed" && (
        <div
          className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-2xl flex flex-col border-l shadow-2xl"
          style={{
            background: "var(--bg-primary)",
            borderColor: "var(--border)",
          }}
        >
            {/* Header */}
            <div
              className="sticky top-0 z-10 flex items-center justify-between px-5 py-3.5 border-b flex-shrink-0"
              style={{
                borderColor: "var(--border)",
                background: "var(--brand-primary)",
              }}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/20">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-white font-semibold text-sm">GcsGuard AI</h2>
                  <p className="text-white/70 text-xs">{state === "pin" ? "Authentication Required" : "Admin Command Center"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {state === "chat" && (
                  <span
                    className="text-xs px-2.5 py-1 rounded-full bg-white/15 text-white/80 max-w-[200px] truncate"
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
      )}
    </>
  );
}

// ─── PIN Gate ─────────────────────────────────────────────────────────────────

function PinGate({
  hasPin,
  pin,
  setPin,
  confirmPin,
  setConfirmPin,
  pinError,
  pinLoading,
  pinShake,
  onSubmit,
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
      <div
        className={cn("w-full max-w-xs space-y-6 text-center", pinShake && "animate-shake")}
      >
        {/* Lock icon */}
        <div className="flex justify-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: "var(--brand-primary)",
            }}
          >
            {pinLoading ? (
              <Loader2 className="w-7 h-7 text-white animate-spin" />
            ) : (
              <Lock className="w-7 h-7 text-white" />
            )}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            {isSetup ? "Set Your AI PIN" : "Enter PIN to Unlock"}
          </h3>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {isSetup
              ? "Create a 4-6 digit PIN to secure GcsGuard AI"
              : "Enter your PIN to access admin commands"}
          </p>
        </div>

        <div className="space-y-3">
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            placeholder={isSetup ? "Create PIN" : "Enter PIN"}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (isSetup && !confirmPin) return;
                onSubmit();
              }
            }}
            className="w-full text-center text-2xl tracking-[0.5em] py-3 rounded-xl border-2 outline-none transition-all focus:border-[var(--brand-primary)]"
            style={{
              background: "var(--bg-secondary)",
              borderColor: pinError ? "#EF4444" : "var(--border)",
              color: "var(--text-primary)",
            }}
            autoFocus
          />

          {isSetup && (
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="Confirm PIN"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSubmit();
              }}
              className="w-full text-center text-2xl tracking-[0.5em] py-3 rounded-xl border-2 outline-none transition-all focus:border-[var(--brand-primary)]"
              style={{
                background: "var(--bg-secondary)",
                borderColor: pinError ? "#EF4444" : "var(--border)",
                color: "var(--text-primary)",
              }}
            />
          )}

          {pinError && (
            <p className="text-sm text-red-500 font-medium">{pinError}</p>
          )}

          <button
            onClick={onSubmit}
            disabled={pinLoading || pin.length < 4}
            className="w-full py-3 rounded-xl text-white font-medium transition-all disabled:opacity-50"
            style={{
              background: "var(--brand-primary)",
            }}
          >
            {pinLoading ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
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
  messages,
  input,
  setInput,
  isStreaming,
  messagesEndRef,
  inputRef,
  onSend,
  onKeyDown,
  onClear,
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
          <MessageBubble key={msg.id} message={msg} />
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
              Clear chat
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
            style={{
              color: "var(--text-primary)",
              maxHeight: "120px",
              minHeight: "24px",
            }}
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
            style={{
              background: "var(--brand-primary)",
            }}
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-xs mt-1.5 text-center" style={{ color: "var(--text-muted)" }}>
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
    { label: "Pending Invoices", prompt: "List all pending invoices" },
    { label: "Active Projects", prompt: "What projects are currently in progress?" },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full py-8 space-y-6">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{
          background: "var(--brand-primary)",
        }}
      >
        <Sparkles className="w-7 h-7 text-white" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          GcsGuard AI Ready
        </h3>
        <p className="text-sm max-w-md" style={{ color: "var(--text-secondary)" }}>
          I can manage organizations, users, projects, invoices, tickets, and security alerts.
          Ask me anything or try a quick action below.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
        {suggestions.map((s) => (
          <button
            key={s.label}
            onClick={() => onQuickAction(s.prompt)}
            className="text-left px-3 py-2.5 rounded-xl border text-sm transition-all hover:scale-[1.02]"
            style={{
              background: "var(--bg-secondary)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
          >
            <span className="font-medium">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex flex-col gap-2", isUser ? "items-end" : "items-start")}>
      {/* Tool executions (before text for assistant) */}
      {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
        <div className="w-full space-y-2">
          {message.toolCalls.map((tc) => (
            <ToolCard key={tc.id} tool={tc} />
          ))}
        </div>
      )}

      {/* Text content */}
      {message.content && (
        <div
          className={cn(
            "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser ? "rounded-br-md" : "rounded-bl-md"
          )}
          style={
            isUser
              ? {
                  background: "var(--brand-primary)",
                  color: "white",
                }
              : {
                  background: "var(--bg-secondary)",
                  color: "var(--text-primary)",
                }
          }
        >
          <FormattedText text={message.content} />
        </div>
      )}
    </div>
  );
}

// ─── Tool Card ────────────────────────────────────────────────────────────────

function ToolCard({ tool }: { tool: ToolExecution }) {
  const [expanded, setExpanded] = useState(false);

  const toolLabel = tool.tool
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const resultSummary = getResultSummary(tool);

  return (
    <div
      className="w-full rounded-xl border overflow-hidden transition-all"
      style={{ borderColor: "var(--border)", background: "var(--bg-primary)" }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-[var(--bg-secondary)]"
      >
        <div
          className={cn(
            "flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0",
            tool.status === "running" ? "animate-pulse" : ""
          )}
          style={{
            background: tool.status === "error"
              ? "rgba(239,68,68,0.15)"
              : tool.success === false
              ? "rgba(239,68,68,0.15)"
              : "var(--bg-secondary)",
          }}
        >
          {tool.status === "running" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "var(--brand-primary)" }} />
          ) : tool.success === false ? (
            <XCircle className="w-3.5 h-3.5 text-red-500" />
          ) : (
            <Wrench className="w-3.5 h-3.5" style={{ color: "var(--brand-primary)" }} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
            {toolLabel}
          </span>
          {resultSummary && (
            <span className="text-xs ml-2" style={{ color: "var(--text-secondary)" }}>
              {resultSummary}
            </span>
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

      {/* Expanded content */}
      {expanded && (
        <div className="border-t px-3.5 py-2.5 space-y-2" style={{ borderColor: "var(--border)" }}>
          {/* Input */}
          {tool.input && Object.keys(tool.input).length > 0 && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Input
              </span>
              <pre
                className="text-xs mt-0.5 p-2 rounded-lg overflow-x-auto"
                style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}
              >
                {JSON.stringify(tool.input, null, 2)}
              </pre>
            </div>
          )}

          {/* Result */}
          {tool.result && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Result
              </span>
              <pre
                className="text-xs mt-0.5 p-2 rounded-lg overflow-x-auto max-h-60"
                style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}
              >
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
  if (r.error) return `Error: ${r.error}`;
  if (typeof r.count === "number") return `${r.count} results`;
  if (r.success) return "Success";
  if (r.name) return String(r.name);
  return "";
}

/** Render basic markdown: bold, inline code, newlines */
function FormattedText({ text }: { text: string }) {
  // Split by newlines, process bold and inline code
  const lines = text.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;

        // Process markdown
        const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g);
        return (
          <div key={i}>
            {parts.map((part, j) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                return <strong key={j}>{part.slice(2, -2)}</strong>;
              }
              if (part.startsWith("`") && part.endsWith("`")) {
                return (
                  <code
                    key={j}
                    className="px-1 py-0.5 rounded text-xs"
                    style={{ background: "var(--bg-secondary)" }}
                  >
                    {part.slice(1, -1)}
                  </code>
                );
              }
              return <span key={j}>{part}</span>;
            })}
          </div>
        );
      })}
    </div>
  );
}
