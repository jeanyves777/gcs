"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Pencil, Calendar, Users, CheckSquare, Building2, Circle, CheckCircle2, Clock, AlertCircle } from "lucide-react";

type Task = { id: string; title: string; status: string; priority: string; assignee: { name: string | null } | null };
type Milestone = { id: string; title: string; status: string; dueDate: Date | null; completedAt: Date | null };

type Props = {
  project: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    progress: number;
    startDate: Date | null;
    targetDate: Date | null;
    createdAt: Date;
    organization: { name: string } | null;
    owner: { name: string | null } | null;
    tasks: Task[];
    milestones: Milestone[];
  };
};

const projectStatusStyle: Record<string, { bg: string; color: string }> = {
  PLANNING:  { bg: "var(--info-bg)",     color: "var(--info)" },
  ACTIVE:    { bg: "var(--success-bg)",  color: "var(--success)" },
  ON_HOLD:   { bg: "var(--warning-bg)",  color: "var(--warning)" },
  COMPLETED: { bg: "var(--bg-tertiary)", color: "var(--text-muted)" },
  CANCELLED: { bg: "var(--error-bg)",    color: "var(--error)" },
};

const taskStatusStyle: Record<string, { bg: string; color: string; icon: React.ElementType }> = {
  TODO:        { bg: "var(--bg-tertiary)", color: "var(--text-muted)",    icon: Circle },
  IN_PROGRESS: { bg: "var(--info-bg)",     color: "var(--info)",          icon: Clock },
  REVIEW:      { bg: "var(--warning-bg)",  color: "var(--warning)",       icon: AlertCircle },
  DONE:        { bg: "var(--success-bg)",  color: "var(--success)",       icon: CheckCircle2 },
};

const priorityStyle: Record<string, { color: string }> = {
  CRITICAL: { color: "var(--error)" },
  HIGH:     { color: "var(--warning)" },
  MEDIUM:   { color: "var(--info)" },
  LOW:      { color: "var(--text-muted)" },
};

export function AdminProjectViewClient({ project }: Props) {
  const ps = projectStatusStyle[project.status] ?? projectStatusStyle.PLANNING;
  const doneTasks = project.tasks.filter((t) => t.status === "DONE").length;

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Link href="/portal/admin/projects">
          <Button variant="ghost" size="sm" className="gap-1.5" style={{ color: "var(--text-muted)" }}>
            <ArrowLeft className="h-4 w-4" /> All Projects
          </Button>
        </Link>
        <Link href={`/portal/admin/projects/${project.id}/edit`}>
          <Button size="sm" className="gap-1.5 text-xs text-white" style={{ background: "var(--brand-primary)" }}>
            <Pencil className="h-3.5 w-3.5" /> Edit Project
          </Button>
        </Link>
      </div>

      {/* Project header */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg-primary)" }}>
        <div className="px-8 py-6" style={{ background: "var(--brand-primary)", color: "white" }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs opacity-70 mb-1 uppercase tracking-wider">Project</p>
              <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>{project.name}</h1>
              {project.organization && (
                <p className="text-sm opacity-80 mt-1 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />{project.organization.name}
                </p>
              )}
            </div>
            <Badge className="text-sm px-3 py-1 font-semibold" style={{ background: "rgba(255,255,255,0.2)", color: "white", border: "none" }}>
              {project.status.replace("_", " ")}
            </Badge>
          </div>
        </div>

        <div className="px-8 py-5 grid grid-cols-2 md:grid-cols-4 gap-5 border-b text-sm" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
          <div>
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Status</p>
            <Badge style={{ background: ps.bg, color: ps.color, border: "none" }}>{project.status.replace("_", " ")}</Badge>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Progress</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full" style={{ background: "var(--border)" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${project.progress}%`, background: "var(--brand-primary)" }} />
              </div>
              <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>{project.progress}%</span>
            </div>
          </div>
          {project.startDate && (
            <div>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Start Date</p>
              <p className="font-medium flex items-center gap-1" style={{ color: "var(--text-primary)" }}>
                <Calendar className="h-3.5 w-3.5" />{formatDate(project.startDate)}
              </p>
            </div>
          )}
          {project.targetDate && (
            <div>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Target Date</p>
              <p className="font-medium flex items-center gap-1" style={{ color: "var(--text-primary)" }}>
                <Calendar className="h-3.5 w-3.5" />{formatDate(project.targetDate)}
              </p>
            </div>
          )}
        </div>

        {/* Description + owner */}
        <div className="px-8 py-5 grid md:grid-cols-[1fr_200px] gap-6">
          <div>
            <p className="text-xs uppercase tracking-wider mb-2 font-semibold" style={{ color: "var(--text-muted)" }}>Description</p>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {project.description ?? "No description provided."}
            </p>
          </div>
          {project.owner && (
            <div>
              <p className="text-xs uppercase tracking-wider mb-2 font-semibold" style={{ color: "var(--text-muted)" }}>Owner</p>
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: "var(--brand-primary)" }}>
                  {project.owner.name?.[0]?.toUpperCase() ?? "?"}
                </div>
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{project.owner.name}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_300px] gap-6 items-start">
        {/* Tasks */}
        <Card className="card-base">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <CheckSquare className="h-4 w-4" style={{ color: "var(--brand-primary)" }} />
                Tasks
              </CardTitle>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{doneTasks}/{project.tasks.length} done</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {project.tasks.length === 0 && (
              <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>No tasks yet.</p>
            )}
            {project.tasks.map((task) => {
              const ts = taskStatusStyle[task.status] ?? taskStatusStyle.TODO;
              const ps2 = priorityStyle[task.priority] ?? priorityStyle.MEDIUM;
              const TaskIcon = ts.icon;
              return (
                <div key={task.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                  style={{ background: "var(--bg-secondary)" }}>
                  <TaskIcon className="h-4 w-4 flex-shrink-0" style={{ color: ts.color }} />
                  <span className="flex-1 text-sm" style={{ color: "var(--text-primary)" }}>{task.title}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium" style={{ color: ps2.color }}>{task.priority}</span>
                    <Badge className="text-xs border-0" style={{ background: ts.bg, color: ts.color }}>
                      {task.status.replace("_", " ")}
                    </Badge>
                    {task.assignee && (
                      <div className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ background: "var(--brand-accent)" }}>
                        {task.assignee.name?.[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Milestones */}
        <Card className="card-base">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <Users className="h-4 w-4" style={{ color: "var(--brand-primary)" }} />
              Milestones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {project.milestones.length === 0 && (
              <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>No milestones.</p>
            )}
            {project.milestones.map((m) => {
              const done = m.status === "COMPLETED";
              return (
                <div key={m.id} className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg"
                  style={{ background: "var(--bg-secondary)" }}>
                  {done
                    ? <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: "var(--success)" }} />
                    : <Circle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: done ? "var(--text-muted)" : "var(--text-primary)", textDecoration: done ? "line-through" : "none" }}>
                      {m.title}
                    </p>
                    {m.completedAt && <p className="text-xs" style={{ color: "var(--success)" }}>Completed {formatDate(m.completedAt)}</p>}
                    {!m.completedAt && m.dueDate && <p className="text-xs" style={{ color: "var(--text-muted)" }}>Due {formatDate(m.dueDate)}</p>}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
