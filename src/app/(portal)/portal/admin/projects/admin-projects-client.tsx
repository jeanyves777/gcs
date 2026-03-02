"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderKanban, Plus, Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils";

type ProjectStatus = "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";

type Project = {
  id: string;
  name: string;
  status: string;
  startDate: Date | null;
  targetDate: Date | null;
  createdAt: Date;
  organization: { name: string } | null;
  owner: { name: string | null } | null;
  _count: { tasks: number };
};

const STATUS_TABS: Array<{ label: string; value: ProjectStatus | "ALL" }> = [
  { label: "All", value: "ALL" },
  { label: "Planning", value: "PLANNING" },
  { label: "Active", value: "ACTIVE" },
  { label: "On Hold", value: "ON_HOLD" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
];

const statusStyle: Record<ProjectStatus, { bg: string; color: string; border: string }> = {
  PLANNING: {
    bg: "var(--info-bg)",
    color: "var(--info)",
    border: "color-mix(in srgb, var(--info) 30%, transparent)",
  },
  ACTIVE: {
    bg: "var(--success-bg)",
    color: "var(--success)",
    border: "color-mix(in srgb, var(--success) 30%, transparent)",
  },
  ON_HOLD: {
    bg: "var(--warning-bg)",
    color: "var(--warning)",
    border: "color-mix(in srgb, var(--warning) 30%, transparent)",
  },
  COMPLETED: {
    bg: "var(--bg-tertiary)",
    color: "var(--text-muted)",
    border: "var(--border)",
  },
  CANCELLED: {
    bg: "var(--error-bg)",
    color: "var(--error)",
    border: "color-mix(in srgb, var(--error) 30%, transparent)",
  },
};

const statusLabel: Record<ProjectStatus, string> = {
  PLANNING: "Planning",
  ACTIVE: "Active",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function AdminProjectsClient({ projects }: { projects: Project[] }) {
  const [activeTab, setActiveTab] = useState<ProjectStatus | "ALL">("ALL");

  const filtered =
    activeTab === "ALL" ? projects : projects.filter((p) => p.status === activeTab);

  const countForTab = (tab: ProjectStatus | "ALL") =>
    tab === "ALL" ? projects.length : projects.filter((p) => p.status === tab).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
          >
            Projects
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            {projects.length} total project{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          asChild
          size="sm"
          className="gap-2"
          style={{ background: "var(--brand-primary)", color: "#fff" }}
        >
          <Link href="/portal/admin/projects/new">
            <Plus className="h-4 w-4" />
            New project
          </Link>
        </Button>
      </div>

      {/* Status filter tabs */}
      <div
        className="flex gap-1 p-1 rounded-lg overflow-x-auto"
        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
      >
        {STATUS_TABS.map((tab) => {
          const count = countForTab(tab.value);
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-all flex-shrink-0"
              style={{
                background: isActive ? "var(--bg-tertiary)" : "transparent",
                color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              {tab.label}
              <span
                className="text-xs px-1.5 py-0.5 rounded-full tabular-nums"
                style={{
                  background: isActive
                    ? "color-mix(in srgb, var(--brand-primary) 15%, transparent)"
                    : "var(--bg-tertiary)",
                  color: isActive ? "var(--brand-primary)" : "var(--text-muted)",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Projects grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <FolderKanban
            className="h-12 w-12 mx-auto mb-4 opacity-30"
            style={{ color: "var(--text-muted)" }}
          />
          <p style={{ color: "var(--text-muted)" }}>
            {activeTab === "ALL"
              ? "No projects yet."
              : `No ${statusLabel[activeTab as ProjectStatus].toLowerCase()} projects.`}
          </p>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="mt-4 gap-2"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
          >
            <Link href="/portal/admin/projects/new">
              <Plus className="h-3.5 w-3.5" />
              Create first project
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((project) => {
            const sStyle = statusStyle[project.status as ProjectStatus] ?? statusStyle.PLANNING;
            return (
              <Card
                key={project.id}
                className="card-base flex flex-col hover:shadow-md transition-shadow"
              >
                <CardContent className="p-5 flex flex-col flex-1 gap-4">
                  {/* Top row: badge + edit link */}
                  <div className="flex items-start justify-between gap-2">
                    <Badge
                      className="text-xs flex-shrink-0"
                      style={{
                        background: sStyle.bg,
                        color: sStyle.color,
                        border: `1px solid ${sStyle.border}`,
                      }}
                    >
                      {statusLabel[project.status as ProjectStatus] ?? project.status}
                    </Badge>
                    <Link
                      href={`/portal/admin/projects/${project.id}/edit`}
                      className="text-xs font-medium transition-colors flex-shrink-0 hover:underline"
                      style={{ color: "var(--brand-primary)" }}
                    >
                      Edit
                    </Link>
                  </div>

                  {/* Project name */}
                  <div className="flex-1">
                    <h3
                      className="font-semibold text-base leading-snug"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {project.name}
                    </h3>
                    {project.organization && (
                      <p className="text-xs mt-1 truncate" style={{ color: "var(--text-secondary)" }}>
                        {project.organization.name}
                      </p>
                    )}
                  </div>

                  {/* Meta row */}
                  <div
                    className="pt-3 border-t flex flex-col gap-1.5"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span style={{ color: "var(--text-muted)" }}>Owner</span>
                      <span style={{ color: "var(--text-secondary)" }}>
                        {project.owner?.name ?? <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span style={{ color: "var(--text-muted)" }}>Tasks</span>
                      <span style={{ color: "var(--text-secondary)" }}>{project._count.tasks}</span>
                    </div>

                    {(project.startDate || project.targetDate) && (
                      <div className="flex items-center gap-1 text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        <span>
                          {project.startDate ? formatDate(project.startDate) : "—"}
                          {" → "}
                          {project.targetDate ? formatDate(project.targetDate) : "—"}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
