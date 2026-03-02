import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare } from "lucide-react";

export const metadata: Metadata = { title: "Project Chat" };

export default async function ProjectChatPage({ params }: { params: { id: string } }) {
  const user = await requireAuth();
  const project = await db.project.findFirst({ where: { id: params.id, organization: { users: { some: { id: user.id } } }, deletedAt: null } });
  if (!project) notFound();

  const messages = await db.message.findMany({
    where: { projectId: params.id, deletedAt: null, parentId: null },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { name: true, role: true } } },
    take: 50,
  });

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-140px)] space-y-4">
      <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Chat — {project.name}</h2>

      <div className="flex-1 overflow-y-auto rounded-xl border p-4 space-y-4" style={{ borderColor: "var(--border)", background: "var(--bg-primary)" }}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <MessageSquare className="h-8 w-8 opacity-30" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No messages yet. Start the conversation.</p>
          </div>
        ) : messages.map((m) => {
          const isMe = m.authorId === user.id;
          const initials = m.author.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";
          return (
            <div key={m.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
              <Avatar className="h-7 w-7 flex-shrink-0">
                <AvatarFallback className="text-xs text-white" style={{ background: isMe ? "var(--brand-primary)" : "var(--brand-accent)" }}>{initials}</AvatarFallback>
              </Avatar>
              <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{m.author.name}</span>
                <div className="px-3 py-2 rounded-xl text-sm" style={{
                  background: isMe ? "var(--brand-primary)" : "var(--bg-secondary)",
                  color: isMe ? "white" : "var(--text-primary)",
                }}>
                  {m.content}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border p-3 flex items-center gap-2" style={{ borderColor: "var(--border)", background: "var(--bg-primary)" }}>
        <input
          placeholder="Send a message… (real-time messaging coming in Phase 2)"
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: "var(--text-primary)" }}
          disabled
        />
      </div>
    </div>
  );
}
