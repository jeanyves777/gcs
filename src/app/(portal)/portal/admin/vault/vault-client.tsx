"use client";

import { useState } from "react";
import {
  KeyRound, Plus, Search, X, Trash2, ExternalLink, Loader2, Save,
  Eye, EyeOff, Copy, Shield, Clock, User, Lock, Globe, Database,
  Mail, Cloud, CreditCard, Key, Server, Share2, Network,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────────────

interface VaultEntry {
  id: string;
  label: string;
  category: string;
  url: string | null;
  description: string | null;
  hasUsername: boolean;
  hasPassword: boolean;
  hasApiKey: boolean;
  hasNotes: boolean;
  createdAt: string;
  updatedAt: string;
  createdByName: string | null;
}

interface FormData {
  label: string;
  category: string;
  url: string;
  description: string;
  username: string;
  password: string;
  apiKey: string;
  notes: string;
}

interface RevealedSecrets {
  username?: string | null;
  password?: string | null;
  apiKey?: string | null;
  notes?: string | null;
}

interface AuditLog {
  id: string;
  action: string;
  metadata: string | null;
  createdAt: string;
  userName: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const CATEGORIES = ["CLOUD", "HOSTING", "EMAIL", "DOMAIN", "DATABASE", "API", "SOCIAL", "PAYMENT", "VPN", "OTHER"] as const;

const categoryConfig: Record<string, { icon: typeof Cloud; color: string; bg: string }> = {
  CLOUD:    { icon: Cloud,      color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  HOSTING:  { icon: Server,     color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  EMAIL:    { icon: Mail,       color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  DOMAIN:   { icon: Globe,      color: "#6366f1", bg: "rgba(99,102,241,0.1)" },
  DATABASE: { icon: Database,   color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  API:      { icon: Key,        color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
  SOCIAL:   { icon: Share2,     color: "#ec4899", bg: "rgba(236,72,153,0.1)" },
  PAYMENT:  { icon: CreditCard, color: "#14b8a6", bg: "rgba(20,184,166,0.1)" },
  VPN:      { icon: Network,    color: "#0ea5e9", bg: "rgba(14,165,233,0.1)" },
  OTHER:    { icon: KeyRound,   color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
};

const emptyForm: FormData = {
  label: "", category: "OTHER", url: "", description: "",
  username: "", password: "", apiKey: "", notes: "",
};

// ─── Component ──────────────────────────────────────────────────────────────

export function VaultClient({ initialEntries }: { initialEntries: VaultEntry[] }) {
  const [entries, setEntries] = useState(initialEntries);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("ALL");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Reveal state
  const [revealEntryId, setRevealEntryId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<RevealedSecrets | null>(null);
  const [revealLoading, setRevealLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // PIN state
  const [pinSession, setPinSession] = useState<string | null>(null);
  const [pinDialog, setPinDialog] = useState(false);
  const [pin, setPin] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState("");
  const [pendingRevealId, setPendingRevealId] = useState<string | null>(null);

  // Audit log
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);

  // Password visibility in form
  const [showFormPw, setShowFormPw] = useState(false);
  const [showFormApiKey, setShowFormApiKey] = useState(false);

  // ─── Helpers ────────────────────────────────────────────────────────

  const updateField = (key: keyof FormData, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const filtered = entries.filter((e) => {
    if (filterCat !== "ALL" && e.category !== filterCat) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        e.label.toLowerCase().includes(s) ||
        (e.description || "").toLowerCase().includes(s) ||
        (e.url || "").toLowerCase().includes(s)
      );
    }
    return true;
  });

  const catCounts = CATEGORIES.reduce(
    (acc, c) => { acc[c] = entries.filter((e) => e.category === c).length; return acc; },
    {} as Record<string, number>,
  );

  // ─── CRUD ──────────────────────────────────────────────────────────

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setSheetOpen(true);
    setShowFormPw(false);
    setShowFormApiKey(false);
  };

  const openEdit = (entry: VaultEntry) => {
    setForm({
      label: entry.label,
      category: entry.category,
      url: entry.url || "",
      description: entry.description || "",
      username: "", password: "", apiKey: "", notes: "",
    });
    setEditingId(entry.id);
    setSheetOpen(true);
    setShowFormPw(false);
    setShowFormApiKey(false);
  };

  const handleSave = async () => {
    if (!form.label.trim()) { toast.error("Label is required"); return; }
    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        label: form.label,
        category: form.category,
        url: form.url || null,
        description: form.description || null,
      };
      // Only include secrets if they have values (don't overwrite with empty on edit)
      if (form.username) payload.username = form.username;
      if (form.password) payload.password = form.password;
      if (form.apiKey) payload.apiKey = form.apiKey;
      if (form.notes) payload.notes = form.notes;

      const url = editingId ? `/api/admin/vault/${editingId}` : "/api/admin/vault";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      toast.success(editingId ? "Entry updated" : "Entry created");
      setSheetOpen(false);

      // Refresh list
      const listRes = await fetch("/api/admin/vault");
      if (listRes.ok) setEntries(await listRes.json());
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/vault/${editingId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Entry deleted");
      setSheetOpen(false);
      setEntries((prev) => prev.filter((e) => e.id !== editingId));
    } catch (err) {
      toast.error(String(err));
    } finally {
      setDeleting(false);
    }
  };

  // ─── PIN + Reveal ──────────────────────────────────────────────────

  const startReveal = (entryId: string) => {
    if (pinSession) {
      doReveal(entryId, pinSession);
    } else {
      setPendingRevealId(entryId);
      setPinDialog(true);
      setPin("");
      setPinError("");
    }
  };

  const submitPin = async () => {
    setPinLoading(true);
    setPinError("");
    try {
      const res = await fetch("/api/admin/ai/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", pin }),
      });
      const data = await res.json();
      if (!res.ok || !data.sessionToken) {
        setPinError(data.error || "Invalid PIN");
        return;
      }
      setPinSession(data.sessionToken);
      setPinDialog(false);
      if (pendingRevealId) doReveal(pendingRevealId, data.sessionToken);
    } catch {
      setPinError("Failed to verify PIN");
    } finally {
      setPinLoading(false);
    }
  };

  const doReveal = async (entryId: string, token: string) => {
    setRevealEntryId(entryId);
    setRevealed(null);
    setRevealLoading(true);
    setShowPw(false);
    setShowApiKey(false);
    try {
      const res = await fetch(`/api/admin/vault/${entryId}/reveal`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-AI-Session": token },
        body: JSON.stringify({ fields: ["username", "password", "apiKey", "notes"] }),
      });
      if (res.status === 401) {
        setPinSession(null);
        setPendingRevealId(entryId);
        setPinDialog(true);
        setPin("");
        setPinError("Session expired — re-enter PIN");
        return;
      }
      if (!res.ok) throw new Error("Failed to reveal");
      setRevealed(await res.json());
    } catch (err) {
      toast.error(String(err));
    } finally {
      setRevealLoading(false);
    }
  };

  const closeReveal = () => {
    setRevealEntryId(null);
    setRevealed(null);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  // ─── Audit Logs ────────────────────────────────────────────────────

  const loadLogs = async (entryId: string) => {
    setLogsOpen(true);
    setLogsLoading(true);
    try {
      const res = await fetch(`/api/admin/vault/${entryId}/logs`);
      if (res.ok) setLogs(await res.json());
    } catch {
      toast.error("Failed to load logs");
    } finally {
      setLogsLoading(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────

  const revealEntry = entries.find((e) => e.id === revealEntryId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl" style={{ background: "var(--brand-primary)" }}>
            <KeyRound className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Credential Vault</h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{entries.length} encrypted entries</p>
          </div>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Add Entry
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(["CLOUD", "DATABASE", "API", "EMAIL", "HOSTING"] as const).map((cat) => {
          const cfg = categoryConfig[cat];
          const Icon = cfg.icon;
          return (
            <Card key={cat} className="cursor-pointer hover:scale-[1.02] transition-transform"
              onClick={() => setFilterCat(filterCat === cat ? "ALL" : cat)}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: cfg.bg }}>
                  <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                </div>
                <div>
                  <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{catCounts[cat] || 0}</p>
                  <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{cat.charAt(0) + cat.slice(1).toLowerCase()}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vault..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {["ALL", ...CATEGORIES].map((cat) => (
            <button key={cat} onClick={() => setFilterCat(cat)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
              style={{
                background: filterCat === cat ? "var(--brand-primary)" : "var(--bg-secondary)",
                color: filterCat === cat ? "white" : "var(--text-secondary)",
              }}>
              {cat === "ALL" ? "All" : cat.charAt(0) + cat.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                  {["Label", "Category", "Credentials", "URL", "Created By", "Updated", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12" style={{ color: "var(--text-muted)" }}>
                    <KeyRound className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p>No vault entries found</p>
                  </td></tr>
                ) : filtered.map((entry) => {
                  const cfg = categoryConfig[entry.category] || categoryConfig.OTHER;
                  const CatIcon = cfg.icon;
                  return (
                    <tr key={entry.id} className="border-b hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
                      style={{ borderColor: "var(--border)" }}
                      onClick={() => openEdit(entry)}>
                      <td className="px-4 py-3">
                        <p className="font-medium" style={{ color: "var(--text-primary)" }}>{entry.label}</p>
                        {entry.description && (
                          <p className="text-xs mt-0.5 truncate max-w-[200px]" style={{ color: "var(--text-muted)" }}>
                            {entry.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="gap-1 text-[11px]" style={{ borderColor: cfg.color, color: cfg.color }}>
                          <CatIcon className="w-3 h-3" />
                          {entry.category.charAt(0) + entry.category.slice(1).toLowerCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          {entry.hasUsername && <Badge variant="secondary" className="text-[10px] px-1.5"><User className="w-3 h-3" /></Badge>}
                          {entry.hasPassword && <Badge variant="secondary" className="text-[10px] px-1.5"><Lock className="w-3 h-3" /></Badge>}
                          {entry.hasApiKey && <Badge variant="secondary" className="text-[10px] px-1.5"><Key className="w-3 h-3" /></Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {entry.url && (() => {
                          const fullUrl = entry.url.match(/^https?:\/\//) ? entry.url : `https://${entry.url}`;
                          let hostname = entry.url;
                          try { hostname = new URL(fullUrl).hostname; } catch { /* use raw */ }
                          return (
                            <a href={fullUrl} target="_blank" rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs flex items-center gap-1 hover:underline" style={{ color: "var(--brand-primary)" }}>
                              <ExternalLink className="w-3 h-3" /> {hostname}
                            </a>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>{entry.createdByName}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
                        {new Date(entry.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"
                          onClick={(e) => { e.stopPropagation(); startReveal(entry.id); }}>
                          <Eye className="w-3 h-3" /> Reveal
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ─── Side Sheet (Create/Edit) ───────────────────────────────── */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSheetOpen(false)} />
          <div className="ml-auto relative w-full max-w-lg flex flex-col shadow-2xl overflow-y-auto"
            style={{ background: "var(--bg-primary)" }}>
            {/* Sheet Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                {editingId ? "Edit Entry" : "New Entry"}
              </h2>
              <button onClick={() => setSheetOpen(false)}><X className="w-5 h-5" style={{ color: "var(--text-muted)" }} /></button>
            </div>

            {/* Sheet Body */}
            <div className="flex-1 px-6 py-5 space-y-5">
              {/* Basic Info */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Label *</label>
                  <input value={form.label} onChange={(e) => updateField("label", e.target.value)}
                    placeholder="e.g. AWS Console, GitHub, Cloudflare"
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                    style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Category</label>
                    <select value={form.category} onChange={(e) => updateField("category", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                      style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>URL</label>
                    <input value={form.url} onChange={(e) => updateField("url", e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                      style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Description</label>
                  <input value={form.description} onChange={(e) => updateField("description", e.target.value)}
                    placeholder="What is this credential for?"
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
                </div>
              </div>

              {/* Secrets Section */}
              <div className="rounded-xl border-2 border-dashed p-4 space-y-3" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4" style={{ color: "var(--brand-primary)" }} />
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                    Encrypted Credentials
                  </span>
                </div>

                {editingId && (
                  <p className="text-[11px] rounded-lg px-3 py-2" style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}>
                    Leave fields empty to keep existing values. Enter new values to overwrite.
                  </p>
                )}

                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Username / Email</label>
                  <input value={form.username} onChange={(e) => updateField("username", e.target.value)}
                    placeholder={editingId ? "Leave empty to keep current" : "username or email"}
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Password</label>
                  <div className="relative">
                    <input type={showFormPw ? "text" : "password"}
                      value={form.password} onChange={(e) => updateField("password", e.target.value)}
                      placeholder={editingId ? "Leave empty to keep current" : "password"}
                      className="w-full px-3 py-2 pr-10 rounded-lg border text-sm outline-none"
                      style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
                    <button onClick={() => setShowFormPw(!showFormPw)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1">
                      {showFormPw ? <EyeOff className="w-4 h-4" style={{ color: "var(--text-muted)" }} /> : <Eye className="w-4 h-4" style={{ color: "var(--text-muted)" }} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>API Key / Token</label>
                  <div className="relative">
                    <input type={showFormApiKey ? "text" : "password"}
                      value={form.apiKey} onChange={(e) => updateField("apiKey", e.target.value)}
                      placeholder={editingId ? "Leave empty to keep current" : "API key or token"}
                      className="w-full px-3 py-2 pr-10 rounded-lg border text-sm outline-none"
                      style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
                    <button onClick={() => setShowFormApiKey(!showFormApiKey)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1">
                      {showFormApiKey ? <EyeOff className="w-4 h-4" style={{ color: "var(--text-muted)" }} /> : <Eye className="w-4 h-4" style={{ color: "var(--text-muted)" }} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Notes</label>
                  <textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)}
                    placeholder={editingId ? "Leave empty to keep current" : "Additional notes..."}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
                    style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
                </div>
              </div>
            </div>

            {/* Sheet Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: "var(--border)" }}>
              <div className="flex gap-2">
                {editingId && (
                  <>
                    <Button variant="destructive" size="sm" disabled={deleting} onClick={handleDelete}>
                      {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => loadLogs(editingId)}>
                      <Clock className="w-3.5 h-3.5" /> Audit Log
                    </Button>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingId ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── PIN Dialog ─────────────────────────────────────────────── */}
      {pinDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPinDialog(false)} />
          <div className="relative rounded-2xl p-6 w-80 space-y-4 shadow-2xl" style={{ background: "var(--bg-primary)" }}>
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: "var(--brand-primary)" }}>
                <Lock className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Enter PIN</h3>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Required to reveal credentials</p>
            </div>
            <input type="password" inputMode="numeric" maxLength={6}
              value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => { if (e.key === "Enter" && pin.length >= 4) submitPin(); }}
              className="w-full text-center text-2xl tracking-[0.5em] py-3 rounded-xl border-2 outline-none focus:border-[var(--brand-primary)]"
              style={{ background: "var(--bg-secondary)", borderColor: pinError ? "#EF4444" : "var(--border)", color: "var(--text-primary)" }}
              autoFocus />
            {pinError && <p className="text-xs text-red-500 text-center">{pinError}</p>}
            <Button onClick={submitPin} disabled={pinLoading || pin.length < 4} className="w-full">
              {pinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Unlock"}
            </Button>
          </div>
        </div>
      )}

      {/* ─── Reveal Modal ───────────────────────────────────────────── */}
      {revealEntryId && revealEntry && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeReveal} />
          <div className="relative rounded-2xl p-6 w-full max-w-md shadow-2xl" style={{ background: "var(--bg-primary)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" style={{ color: "var(--brand-primary)" }} />
                <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>{revealEntry.label}</h3>
              </div>
              <button onClick={closeReveal}><X className="w-5 h-5" style={{ color: "var(--text-muted)" }} /></button>
            </div>

            {revealLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--brand-primary)" }} />
              </div>
            ) : revealed ? (
              <div className="space-y-3">
                {revealed.username !== undefined && revealed.username !== null && (
                  <SecretField label="Username" value={revealed.username} visible onCopy={() => copyToClipboard(revealed.username!, "Username")} />
                )}
                {revealed.password !== undefined && revealed.password !== null && (
                  <SecretField label="Password" value={revealed.password} visible={showPw}
                    onToggle={() => setShowPw(!showPw)} onCopy={() => copyToClipboard(revealed.password!, "Password")} />
                )}
                {revealed.apiKey !== undefined && revealed.apiKey !== null && (
                  <SecretField label="API Key" value={revealed.apiKey} visible={showApiKey}
                    onToggle={() => setShowApiKey(!showApiKey)} onCopy={() => copyToClipboard(revealed.apiKey!, "API Key")} />
                )}
                {revealed.notes !== undefined && revealed.notes !== null && (
                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Notes</label>
                    <div className="rounded-lg p-3 text-sm whitespace-pre-wrap" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>
                      {revealed.notes}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>No secrets stored</p>
            )}
          </div>
        </div>
      )}

      {/* ─── Audit Log Modal ────────────────────────────────────────── */}
      {logsOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setLogsOpen(false)} />
          <div className="relative rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto shadow-2xl" style={{ background: "var(--bg-primary)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <Clock className="w-4 h-4" /> Audit Log
              </h3>
              <button onClick={() => setLogsOpen(false)}><X className="w-5 h-5" style={{ color: "var(--text-muted)" }} /></button>
            </div>
            {logsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--brand-primary)" }} /></div>
            ) : logs.length === 0 ? (
              <p className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>No access logs yet</p>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 rounded-lg p-2.5" style={{ background: "var(--bg-secondary)" }}>
                    <ActionBadge action={log.action} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{log.userName}</p>
                      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Small Components ────────────────────────────────────────────────────────

function SecretField({ label, value, visible, onToggle, onCopy }: {
  label: string; value: string; visible: boolean; onToggle?: () => void; onCopy: () => void;
}) {
  return (
    <div>
      <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>{label}</label>
      <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: "var(--bg-secondary)" }}>
        <code className="flex-1 text-sm font-mono truncate" style={{ color: "var(--text-primary)" }}>
          {visible ? value : "••••••••••••"}
        </code>
        {onToggle && (
          <button onClick={onToggle} className="p-1 rounded hover:bg-[var(--bg-primary)]">
            {visible ? <EyeOff className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} /> : <Eye className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />}
          </button>
        )}
        <button onClick={onCopy} className="p-1 rounded hover:bg-[var(--bg-primary)]">
          <Copy className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
        </button>
      </div>
    </div>
  );
}

function ActionBadge({ action }: { action: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    CREATE:    { bg: "rgba(16,185,129,0.1)", color: "#10b981" },
    UPDATE:    { bg: "rgba(59,130,246,0.1)", color: "#3b82f6" },
    DELETE:    { bg: "rgba(239,68,68,0.1)",  color: "#ef4444" },
    REVEAL:    { bg: "rgba(245,158,11,0.1)", color: "#f59e0b" },
    AI_REVEAL: { bg: "rgba(139,92,246,0.1)", color: "#8b5cf6" },
  };
  const s = styles[action] || styles.REVEAL;
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>
      {action}
    </span>
  );
}
