"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, Trash2, Plus, ListTodo } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
type ProjectStatus = "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";

type Assignee = { id: string; name: string | null };

type Task = {
  id: string;
  title: string;
  status: string;
  assignee: Assignee | null;
};

type Project = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  startDate: Date | null;
  targetDate: Date | null;
  organization: { id: string; name: string } | null;
  owner: { id: string; name: string | null } | null;
  tasks: Task[];
};

type Org = { id: string; name: string };
type User = { id: string; name: string | null; role: string };

type Props = {
  project: Project;
  orgs: Org[];
  users: User[];
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROJECT_STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: "PLANNING", label: "Planning" },
  { value: "ACTIVE", label: "Active" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const TASK_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "TODO", label: "To Do" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "REVIEW", label: "Review" },
  { value: "DONE", label: "Done" },
];

const taskStatusStyle: Record<TaskStatus, { bg: string; color: string }> = {
  TODO: { bg: "var(--bg-tertiary)", color: "var(--text-muted)" },
  IN_PROGRESS: { bg: "var(--info-bg)", color: "var(--info)" },
  REVIEW: { bg: "var(--warning-bg)", color: "var(--warning)" },
  DONE: { bg: "var(--success-bg)", color: "var(--success)" },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toInputDate(d: Date | null | undefined): string {
  if (!d) return "";
  const date = new Date(d);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EditProjectClient({ project, orgs, users }: Props) {
  // --- Project form state ---
  const [savingProject, setSavingProject] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [organizationId, setOrganizationId] = useState(project.organization?.id ?? "");
  const [ownerId, setOwnerId] = useState(project.owner?.id ?? "");
  const [status, setStatus] = useState<string>(project.status);
  const [startDate, setStartDate] = useState(toInputDate(project.startDate));
  const [endDate, setEndDate] = useState(toInputDate(project.targetDate));

  // --- Task state ---
  const [tasks, setTasks] = useState<Task[]>(project.tasks);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  // --- Add task form state ---
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState("__none__");
  const [addingTask, setAddingTask] = useState(false);

  // ---------------------------------------------------------------------------
  // Project save
  // ---------------------------------------------------------------------------

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Project name is required");
      return;
    }

    setSavingProject(true);
    try {
      const res = await fetch(`/api/admin/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          organizationId: organizationId || undefined,
          ownerId: ownerId || undefined,
          status,
          startDate: startDate || null,
          targetDate: endDate || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to update project");
        return;
      }

      toast.success("Project updated");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSavingProject(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Task status update
  // ---------------------------------------------------------------------------

  const handleTaskStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    setUpdatingTaskId(taskId);

    try {
      const res = await fetch(`/api/admin/projects/${project.id}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to update task");
        // Revert
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: json.originalStatus ?? t.status } : t))
        );
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Task delete
  // ---------------------------------------------------------------------------

  const handleDeleteTask = async (taskId: string) => {
    // Optimistic removal
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setDeletingTaskId(taskId);

    try {
      const res = await fetch(`/api/admin/projects/${project.id}/tasks/${taskId}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to delete task");
        // Restore — we no longer have the original so refetch would be ideal,
        // but for now inform the user to refresh.
        toast.info("Refresh the page to see the current task list");
      } else {
        toast.success("Task deleted");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDeletingTaskId(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Add task
  // ---------------------------------------------------------------------------

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || newTaskTitle.trim().length < 2) {
      toast.error("Task title must be at least 2 characters");
      return;
    }

    setAddingTask(true);
    try {
      const res = await fetch(`/api/admin/projects/${project.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          assigneeId: newTaskAssigneeId === "__none__" ? null : newTaskAssigneeId,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to add task");
        return;
      }

      // Append optimistically with server response
      const assignee = newTaskAssigneeId !== "__none__"
        ? users.find((u) => u.id === newTaskAssigneeId) ?? null
        : null;

      setTasks((prev) => [
        ...prev,
        {
          id: json.id,
          title: json.title,
          status: json.status ?? "TODO",
          assignee: assignee
            ? { id: assignee.id, name: assignee.name }
            : null,
        },
      ]);

      setNewTaskTitle("");
      setNewTaskAssigneeId("__none__");
      toast.success("Task added");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setAddingTask(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Shared styles
  // ---------------------------------------------------------------------------

  const inputStyle = {
    borderColor: "var(--border)",
    background: "var(--bg-secondary)",
    color: "var(--text-primary)",
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-8">
      {/* Back + heading */}
      <div>
        <Link
          href="/portal/admin/projects"
          className="inline-flex items-center gap-1.5 text-sm mb-4 transition-colors hover:opacity-80"
          style={{ color: "var(--text-muted)" }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Projects
        </Link>
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
        >
          Edit Project
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          {project.name}
        </p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Section 1: Project details form                                     */}
      {/* ------------------------------------------------------------------ */}
      <Card className="card-base">
        <CardHeader className="pb-4 border-b" style={{ borderColor: "var(--border)" }}>
          <CardTitle className="text-base" style={{ color: "var(--text-primary)" }}>
            Project Details
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <form onSubmit={handleSaveProject} className="space-y-5">
            {/* Name */}
            <div className="space-y-1.5">
              <Label
                htmlFor="edit-name"
                className="text-sm font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                Project Name <span style={{ color: "var(--error)" }}>*</span>
              </Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            {/* Organization */}
            <div className="space-y-1.5">
              <Label
                htmlFor="edit-org"
                className="text-sm font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                Organization
              </Label>
              <Select value={organizationId} onValueChange={setOrganizationId}>
                <SelectTrigger id="edit-org" style={inputStyle}>
                  <SelectValue placeholder="Select organization…" />
                </SelectTrigger>
                <SelectContent>
                  {orgs.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label
                htmlFor="edit-description"
                className="text-sm font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                Description
              </Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>

            {/* Owner */}
            <div className="space-y-1.5">
              <Label
                htmlFor="edit-owner"
                className="text-sm font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                Owner
              </Label>
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger id="edit-owner" style={inputStyle}>
                  <SelectValue placeholder="Select owner…" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name ?? `(no name)`}{" "}
                      <span className="opacity-60 text-xs">({user.role})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label
                htmlFor="edit-status"
                className="text-sm font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                Status
              </Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="edit-status" style={inputStyle}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-start"
                  className="text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Start Date
                </Label>
                <Input
                  id="edit-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-end"
                  className="text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  End Date
                </Label>
                <Input
                  id="edit-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Save button */}
            <div
              className="flex justify-end pt-2 border-t"
              style={{ borderColor: "var(--border)" }}
            >
              <Button
                type="submit"
                disabled={savingProject}
                className="gap-2"
                style={{ background: "var(--brand-primary)", color: "#fff" }}
              >
                {savingProject && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Section 2: Tasks                                                    */}
      {/* ------------------------------------------------------------------ */}
      <Card className="card-base">
        <CardHeader className="pb-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base" style={{ color: "var(--text-primary)" }}>
              Tasks
            </CardTitle>
            <span
              className="text-xs tabular-nums px-2 py-0.5 rounded-full"
              style={{
                background: "var(--bg-tertiary)",
                color: "var(--text-muted)",
              }}
            >
              {tasks.length}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Task list */}
          {tasks.length === 0 ? (
            <div className="text-center py-10">
              <ListTodo
                className="h-8 w-8 mx-auto mb-2 opacity-30"
                style={{ color: "var(--text-muted)" }}
              />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                No tasks yet. Add one below.
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {tasks.map((task) => {
                const tStyle =
                  taskStatusStyle[task.status as TaskStatus] ?? taskStatusStyle.TODO;
                const isUpdating = updatingTaskId === task.id;
                const isDeleting = deletingTaskId === task.id;

                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--bg-secondary)] transition-colors"
                    style={{ opacity: isDeleting ? 0.5 : 1 }}
                  >
                    {/* Status badge / inline select */}
                    <div className="flex-shrink-0 w-32">
                      {isUpdating ? (
                        <div className="flex items-center gap-1.5">
                          <Loader2
                            className="h-3.5 w-3.5 animate-spin"
                            style={{ color: "var(--text-muted)" }}
                          />
                          <Badge
                            className="text-xs"
                            style={{ background: tStyle.bg, color: tStyle.color }}
                          >
                            {TASK_STATUSES.find((s) => s.value === task.status)?.label ??
                              task.status}
                          </Badge>
                        </div>
                      ) : (
                        <select
                          value={task.status}
                          disabled={isDeleting}
                          onChange={(e) =>
                            handleTaskStatusChange(task.id, e.target.value as TaskStatus)
                          }
                          className="text-xs rounded-md px-2 py-1 border outline-none focus:ring-1 w-full appearance-none"
                          style={{
                            background: tStyle.bg,
                            color: tStyle.color,
                            borderColor: `${tStyle.color}30`,
                            cursor: "pointer",
                          }}
                        >
                          {TASK_STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Title */}
                    <p
                      className="flex-1 text-sm truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {task.title}
                    </p>

                    {/* Assignee */}
                    <p
                      className="text-xs flex-shrink-0 w-28 truncate text-right"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {task.assignee?.name ?? <span className="italic">Unassigned</span>}
                    </p>

                    {/* Delete */}
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isDeleting || isUpdating}
                      onClick={() => handleDeleteTask(task.id)}
                      className="h-7 w-7 flex-shrink-0 hover:bg-[var(--error-bg)] hover:text-[var(--error)] transition-colors"
                      style={{ color: "var(--text-muted)" }}
                      aria-label="Delete task"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add task row */}
          <div
            className="px-5 py-4 border-t flex items-center gap-3 flex-wrap"
            style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}
          >
            <Input
              placeholder="New task title…"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTask();
                }
              }}
              disabled={addingTask}
              className="flex-1 min-w-[180px] text-sm"
              style={{
                borderColor: "var(--border)",
                background: "var(--bg-tertiary)",
                color: "var(--text-primary)",
              }}
            />

            <select
              value={newTaskAssigneeId}
              onChange={(e) => setNewTaskAssigneeId(e.target.value)}
              disabled={addingTask}
              className="text-xs rounded-md px-3 py-2 border outline-none focus:ring-1 w-44 flex-shrink-0 appearance-none"
              style={{
                borderColor: "var(--border)",
                background: "var(--bg-tertiary)",
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              <option value="__none__">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name ?? `(no name)`}
                </option>
              ))}
            </select>

            <Button
              onClick={handleAddTask}
              disabled={addingTask || !newTaskTitle.trim()}
              size="sm"
              className="gap-1.5 flex-shrink-0"
              style={{ background: "var(--brand-primary)", color: "#fff" }}
            >
              {addingTask ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Add
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
