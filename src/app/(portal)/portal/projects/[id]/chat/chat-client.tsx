"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

type ChatMessage = {
  id: string;
  content: string;
  createdAt: Date;
  authorId: string;
  author: { id: string; name: string | null; role: string };
};

interface Props {
  projectId: string;
  projectName: string;
  currentUserId: string;
  initialMessages: ChatMessage[];
}

export function ProjectChatClient({ projectId, projectName, currentUserId, initialMessages }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/portal/projects/${projectId}/messages`);
        if (res.ok) {
          const data: ChatMessage[] = await res.json();
          setMessages(data);
        }
      } catch {
        // ignore polling errors
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [projectId]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");

    const res = await fetch(`/api/portal/projects/${projectId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });
    setSending(false);

    if (!res.ok) {
      toast.error("Failed to send message");
      setInput(text);
      return;
    }
    const newMsg: ChatMessage = await res.json();
    setMessages((prev) => [...prev, newMsg]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-140px)] space-y-4">
      <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
        Chat — {projectName}
      </h2>

      <div
        className="flex-1 overflow-y-auto rounded-xl border p-4 space-y-4"
        style={{ borderColor: "var(--border)", background: "var(--bg-primary)" }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <MessageSquare className="h-8 w-8 opacity-30" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No messages yet. Start the conversation.</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.authorId === currentUserId;
            const initials = m.author.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";
            return (
              <div key={m.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                <Avatar className="h-7 w-7 flex-shrink-0">
                  <AvatarFallback
                    className="text-xs text-white"
                    style={{ background: isMe ? "var(--brand-primary)" : "var(--brand-accent)" }}
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{m.author.name}</span>
                  <div
                    className="px-3 py-2 rounded-xl text-sm"
                    style={{
                      background: isMe ? "var(--brand-primary)" : "var(--bg-secondary)",
                      color: isMe ? "white" : "var(--text-primary)",
                    }}
                  >
                    {m.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div
        className="rounded-xl border p-2 flex items-center gap-2"
        style={{ borderColor: "var(--border)", background: "var(--bg-primary)" }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Send a message…"
          className="flex-1 bg-transparent text-sm outline-none px-2 py-1"
          style={{ color: "var(--text-primary)" }}
          disabled={sending}
        />
        <Button
          size="icon"
          onClick={sendMessage}
          disabled={!input.trim() || sending}
          className="h-8 w-8 rounded-lg text-white flex-shrink-0"
          style={{ background: "var(--brand-primary)" }}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
