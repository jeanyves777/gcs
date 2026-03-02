import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { FolderKanban, ArrowRight } from "lucide-react";

export const metadata: Metadata = { title: "Projects" };

const statusColor: Record<string, string> = {
  PLANNING: "var(--text-muted)",
  ACTIVE: "var(--success)",
  ON_HOLD: "var(--warning)",
  COMPLETED: "var(--brand-primary)",
  CANCELLED: "var(--error)",
};

export default async function ProjectsPage() {
  const user = await requireAuth();
  const projects = await db.project.findMany({
    where: { organization: { users: { some: { id: user.id } } }, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { tasks: true, milestones: true } } },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Projects</h1>

      {projects.length === 0 ? (
        <div className="text-center py-20">
          <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-30" style={{ color: "var(--text-muted)" }} />
          <p style={{ color: "var(--text-muted)" }}>No projects yet. Your GCS team will create them here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {projects.map((p) => (
            <Link key={p.id} href={`/portal/projects/${p.id}`}>
              <Card className="card-base h-full hover:shadow-md hover:border-[var(--brand-primary)] transition-all cursor-pointer group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <Badge className="text-xs" style={{ background: `${statusColor[p.status]}18`, color: statusColor[p.status], border: `1px solid ${statusColor[p.status]}30` }}>
                      {p.status.replace("_", " ")}
                    </Badge>
                    <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--brand-primary)" }} />
                  </div>
                  <h3 className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{p.name}</h3>
                  {p.description && <p className="text-xs mb-4 line-clamp-2" style={{ color: "var(--text-secondary)" }}>{p.description}</p>}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs" style={{ color: "var(--text-muted)" }}>
                      <span>Progress</span><span>{p.progress}%</span>
                    </div>
                    <Progress value={p.progress} className="h-1.5" />
                  </div>
                  <div className="flex gap-4 mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
                    <span>{p._count.tasks} tasks</span>
                    <span>{p._count.milestones} milestones</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
