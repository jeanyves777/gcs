"use client";

import { useState } from "react";
import Link from "next/link";
import { Settings, Plus, FileText, Trash2, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { toast } from "sonner";

interface Template {
  id: string;
  name: string;
  filePath: string;
  description: string | null;
  restartService: string | null;
  version: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { name: string | null };
  _count: { deployments: number };
}

export function ConfigTemplatesClient({ templates: initialTemplates }: { templates: Template[] }) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formPath, setFormPath] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formRestart, setFormRestart] = useState("");
  const [formContent, setFormContent] = useState("");

  async function createTemplate() {
    if (!formName.trim() || !formPath.trim() || !formContent.trim()) {
      toast.error("Name, file path, and content are required");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/guard/admin/config-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          filePath: formPath.trim(),
          description: formDesc.trim() || null,
          restartService: formRestart.trim() || null,
          content: formContent,
        }),
      });
      if (res.ok) {
        const newTemplate = await res.json();
        setTemplates((prev) => [newTemplate, ...prev]);
        setShowForm(false);
        setFormName("");
        setFormPath("");
        setFormDesc("");
        setFormRestart("");
        setFormContent("");
        toast.success("Template created");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to create template");
      }
    } finally {
      setCreating(false);
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Delete this template? This cannot be undone.")) return;
    const res = await fetch(`/api/guard/admin/config-templates/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success("Template deleted");
    } else toast.error("Failed to delete template");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5" style={{ color: "var(--text-primary)" }}>
            <div className="p-1.5 rounded-lg" style={{ background: "var(--brand-primary)", color: "white" }}>
              <FileText className="h-5 w-5" />
            </div>
            Config Templates
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Manage configuration file templates for agent deployment
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" /> Create Template
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">New Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>Name</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Nginx Default Config"
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>File Path</label>
                <input
                  value={formPath}
                  onChange={(e) => setFormPath(e.target.value)}
                  placeholder="/etc/nginx/nginx.conf"
                  className="w-full px-3 py-2 rounded-lg border text-sm font-mono"
                  style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>Description</label>
                <input
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Optional description"
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>Restart Service</label>
                <input
                  value={formRestart}
                  onChange={(e) => setFormRestart(e.target.value)}
                  placeholder="nginx (optional)"
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>Content</label>
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Paste config file content here..."
                rows={12}
                className="w-full px-3 py-2 rounded-lg border text-sm font-mono"
                style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" onClick={createTemplate} disabled={creating}>
                {creating ? "Creating..." : "Create Template"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Template List */}
      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p style={{ color: "var(--text-muted)" }}>No config templates yet. Create one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2 rounded-lg" style={{ background: "var(--bg-secondary)" }}>
                      <FileText className="h-5 w-5" style={{ color: "var(--text-secondary)" }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
                          {template.name}
                        </p>
                        <Badge variant="outline" className="text-[10px]">v{template.version}</Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {template._count.deployments} deployment{template._count.deployments !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                      <p className="text-xs font-mono truncate" style={{ color: "var(--text-muted)" }}>
                        {template.filePath}
                      </p>
                      {template.description && (
                        <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                          {template.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link href={`/portal/admin/guard/config/${template.id}`}>
                      <Button size="sm" variant="outline" className="text-xs h-7">
                        Edit
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700 h-7 w-7 p-0"
                      onClick={() => deleteTemplate(template.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <Link href={`/portal/admin/guard/config/${template.id}`}>
                      <ChevronRight className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
