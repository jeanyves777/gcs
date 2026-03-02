import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { MessageSquare, ListTodo, Paperclip } from "lucide-react";

export const metadata: Metadata = { title: "Project Details" };

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const user = await requireAuth();
  const project = await db.project.findFirst({
    where: { id: params.id, organization: { users: { some: { id: user.id } } }, deletedAt: null },
    include: {
      milestones: { where: { deletedAt: null }, orderBy: { order: "asc" } },
      _count: { select: { tasks: true, files: true, messages: true } },
    },
  });

  if (!project) notFound();

  const tabs = [
    { href: `/portal/projects/${project.id}/tasks`, label: "Tasks", icon: ListTodo, count: project._count.tasks },
    { href: `/portal/projects/${project.id}/files`, label: "Files", icon: Paperclip, count: project._count.files },
    { href: `/portal/projects/${project.id}/chat`, label: "Chat", icon: MessageSquare, count: project._count.messages },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>{project.name}</h1>
        {project.description && <p className="mt-1" style={{ color: "var(--text-secondary)" }}>{project.description}</p>}
      </div>

      <Card className="card-base">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Overall progress</span>
            <Badge style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)" }}>{project.status.replace("_", " ")}</Badge>
          </div>
          <Progress value={project.progress} className="h-2" />
          <p className="text-right text-sm mt-1" style={{ color: "var(--text-muted)" }}>{project.progress}% complete</p>
        </CardContent>
      </Card>

      {/* Tab navigation */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(({ href, label, icon: Icon, count }) => (
          <Link key={href} href={href} className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
            <Icon className="h-4 w-4" /> {label}
            {count > 0 && <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>{count}</span>}
          </Link>
        ))}
      </div>

      {/* Milestones */}
      {project.milestones.length > 0 && (
        <Card className="card-base">
          <CardHeader className="pb-3"><CardTitle className="text-base" style={{ color: "var(--text-primary)" }}>Milestones</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {project.milestones.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "var(--bg-secondary)" }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m.status === "COMPLETED" ? "var(--success)" : m.status === "IN_PROGRESS" ? "var(--brand-primary)" : "var(--border)" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{m.title}</p>
                  {m.dueDate && <p className="text-xs" style={{ color: "var(--text-muted)" }}>Due {new Date(m.dueDate).toLocaleDateString()}</p>}
                </div>
                <Badge className="text-xs flex-shrink-0" style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>{m.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
