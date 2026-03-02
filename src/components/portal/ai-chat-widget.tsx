"use client";

import { useEffect, useRef, useState } from "react";
import { BotMessageSquare, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What services does GCS offer?",
  "How do I open a support ticket?",
  "What's included in Managed IT?",
  "How does billing work?",
];

export function AIChatWidget({ apiEndpoint = "/api/portal/ai/chat" }: { apiEndpoint?: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    const userMsg = text.trim();
    if (!userMsg || streaming) return;
    setInput("");

    const newMessages: Msg[] = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
    setStreaming(true);

    const assistantMsg: Msg = { role: "assistant", content: "" };
    setMessages([...newMessages, assistantMsg]);

    try {
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages([...newMessages, { role: "assistant", content: accumulated }]);
      }
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Sorry, I'm having trouble connecting. Please try again or open a support ticket." }]);
    } finally {
      setStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat panel */}
      {open && (
        <div
          className="flex flex-col rounded-2xl shadow-2xl border overflow-hidden"
          style={{
            width: "360px",
            height: "480px",
            background: "var(--bg-elevated)",
            borderColor: "var(--border)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
            style={{ background: "var(--brand-primary)", borderColor: "var(--brand-primary)" }}
          >
            <div className="flex items-center gap-2">
              <BotMessageSquare className="h-5 w-5 text-white" />
              <div>
                <p className="text-sm font-semibold text-white">GCS Assistant</p>
                <p className="text-xs text-white/70">Powered by AI</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>
                  👋 Hi! I&apos;m your GCS AI assistant. How can I help?
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-left text-xs px-3 py-2 rounded-lg border transition-colors hover:border-[var(--brand-primary)]"
                      style={{
                        borderColor: "var(--border)",
                        background: "var(--bg-secondary)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className="max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed"
                    style={{
                      background: m.role === "user" ? "var(--brand-primary)" : "var(--bg-secondary)",
                      color: m.role === "user" ? "white" : "var(--text-primary)",
                    }}
                  >
                    {m.content || (streaming && i === messages.length - 1 ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : "")}
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div
            className="flex items-center gap-2 px-3 py-2 border-t flex-shrink-0"
            style={{ borderColor: "var(--border)", background: "var(--bg-primary)" }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything…"
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: "var(--text-primary)" }}
              disabled={streaming}
            />
            <Button
              size="icon"
              onClick={() => send(input)}
              disabled={!input.trim() || streaming}
              className="h-7 w-7 rounded-lg text-white flex-shrink-0"
              style={{ background: "var(--brand-primary)" }}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 text-white"
        style={{ background: "var(--brand-primary)" }}
        title="GCS AI Assistant"
      >
        {open ? <X className="h-6 w-6" /> : <BotMessageSquare className="h-6 w-6" />}
      </button>
    </div>
  );
}
