import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Tasks" };

const priorityColor: Record<string, string> = { LOW: "var(--text-muted)", MEDIUM: "var(--brand-primary)", HIGH: "var(--warning)", CRITICAL: "var(--error)" };
const statusColor: Record<string, string> = { TODO: "var(--text-muted)", IN_PROGRESS: "var(--brand-primary)", REVIEW: "var(--warning)", DONE: "var(--success)", CANCELLED: "var(--error)" };

export default async function TasksPage({ params }: { params: { id: string } }) {
  const user = await requireAuth();
  const project = await db.project.findFirst({
    where: { id: params.id, organization: { users: { some: { id: user.id } } }, deletedAt: null },
  });
  if (!project) notFound();

  const tasks = await db.task.findMany({
    where: { projectId: params.id, deletedAt: null },
    orderBy: [{ status: "asc" }, { order: "asc" }],
    include: { assignee: { select: { name: true } } },
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Tasks — {project.name}</h2>
      {tasks.length === 0 ? (
        <p className="text-center py-12" style={{ color: "var(--text-muted)" }}>No tasks yet.</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => (
            <Card key={t.id} className="card-base">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: statusColor[t.status] }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{t.title}</p>
                  {t.assignee && <p className="text-xs" style={{ color: "var(--text-muted)" }}>Assigned to {t.assignee.name}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge className="text-xs" style={{ background: `${priorityColor[t.priority]}18`, color: priorityColor[t.priority] }}>{t.priority}</Badge>
                  <Badge className="text-xs" style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>{t.status.replace("_", " ")}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
