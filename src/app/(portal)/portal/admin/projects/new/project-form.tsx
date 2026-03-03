"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArrowLeft, Loader2 } from "lucide-react";

type Org = { id: string; name: string };
type User = { id: string; name: string | null; role: string };

type Props = {
  orgs: Org[];
  users: User[];
};

const PROJECT_STATUSES = [
  { value: "PLANNING", label: "Planning" },
  { value: "ACTIVE", label: "Active" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

export function NewProjectForm({ orgs, users }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [description, setDescription] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [status, setStatus] = useState<string>("PLANNING");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Project name is required");
      return;
    }
    if (!organizationId) {
      toast.error("Organization is required");
      return;
    }
    if (!ownerId) {
      toast.error("Owner is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          organizationId,
          description: description.trim() || undefined,
          ownerId,
          status,
          startDate: startDate || undefined,
          targetDate: endDate || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to create project");
        return;
      }

      toast.success("Project created successfully");
      router.push("/portal/admin/projects");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    borderColor: "var(--border)",
    background: "var(--bg-secondary)",
    color: "var(--text-primary)",
  };

  return (
    <div className="space-y-6">
      {/* Back link + title */}
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
          New Project
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          Create a new project for a client organization
        </p>
      </div>

      <Card className="card-base">
        <CardHeader className="pb-4">
          <CardTitle className="text-base" style={{ color: "var(--text-primary)" }}>
            Project Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div className="space-y-1.5">
              <Label
                htmlFor="name"
                className="text-sm font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                Project Name <span style={{ color: "var(--error)" }}>*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g. Website Redesign"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            {/* Organization */}
            <div className="space-y-1.5">
              <Label
                htmlFor="organization"
                className="text-sm font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                Organization <span style={{ color: "var(--error)" }}>*</span>
              </Label>
              <Select value={organizationId} onValueChange={setOrganizationId}>
                <SelectTrigger id="organization" style={inputStyle}>
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
                htmlFor="description"
                className="text-sm font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Brief project description…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>

            {/* Owner */}
            <div className="space-y-1.5">
              <Label
                htmlFor="owner"
                className="text-sm font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                Owner <span style={{ color: "var(--error)" }}>*</span>
              </Label>
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger id="owner" style={inputStyle}>
                  <SelectValue placeholder="Select owner…" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name ?? `(no name) — ${user.role}`}
                      {" "}
                      <span className="opacity-60 text-xs">({user.role})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label
                htmlFor="status"
                className="text-sm font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                Status
              </Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status" style={inputStyle}>
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
                  htmlFor="startDate"
                  className="text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Start Date
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="endDate"
                  className="text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  End Date
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Actions */}
            <div
              className="flex items-center justify-end gap-3 pt-2 border-t"
              style={{ borderColor: "var(--border)" }}
            >
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/portal/admin/projects")}
                disabled={loading}
                style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="gap-2"
                style={{ background: "var(--brand-primary)", color: "#fff" }}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Project
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
