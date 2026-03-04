"use client";

import { useState } from "react";
import {
  Building2, Plus, Search, Users, FolderOpen, Receipt, Headphones,
  Sparkles, X, Trash2, ExternalLink, Star, Loader2, Shield, Globe,
  Phone, Mail, MapPin, Save, Server,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Org {
  id: string;
  name: string;
  domain: string | null;
  logo: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  industry: string | null;
  description: string | null;
  subscriptionTier: string;
  isActive: boolean;
  googleRating: number | null;
  yelpUrl: string | null;
  bbbUrl: string | null;
  socialLinks: string | null;
  notes: string | null;
  trialEndsAt: string | null;
  createdAt: string;
  _count: { users: number; projects: number; invoices: number; tickets: number; guardAgents: number };
}

type FormData = {
  name: string;
  domain: string;
  website: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  industry: string;
  description: string;
  subscriptionTier: string;
  isActive: boolean;
  googleRating: string;
  yelpUrl: string;
  bbbUrl: string;
  socialLinks: string;
  notes: string;
  trialEndsAt: string;
};

const emptyForm: FormData = {
  name: "", domain: "", website: "", phone: "", email: "",
  address: "", city: "", state: "", zipCode: "", country: "US",
  industry: "", description: "", subscriptionTier: "NONE",
  isActive: true, googleRating: "", yelpUrl: "", bbbUrl: "",
  socialLinks: "", notes: "", trialEndsAt: "",
};

const tierStyle: Record<string, { bg: string; color: string; label: string }> = {
  NONE: { bg: "var(--bg-tertiary)", color: "var(--text-muted)", label: "No Plan" },
  GCSGUARD_MANAGED_FREE: { bg: "var(--warning-bg)", color: "var(--warning)", label: "Managed (Free)" },
  GCSGUARD_MANAGED: { bg: "var(--success-bg)", color: "var(--success)", label: "Managed" },
  GCSGUARD_NON_MANAGED: { bg: "var(--info-bg)", color: "var(--info)", label: "Non-Managed" },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function OrganizationsClient({ initialOrgs }: { initialOrgs: Org[] }) {
  const [orgs, setOrgs] = useState(initialOrgs);
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFilledFields, setAiFilledFields] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [planFilter, setPlanFilter] = useState<string>("ALL");

  const filtered = orgs.filter((o) => {
    if (planFilter !== "ALL" && o.subscriptionTier !== planFilter) return false;
    const q = search.toLowerCase();
    return o.name.toLowerCase().includes(q) ||
      (o.domain?.toLowerCase().includes(q)) ||
      (o.industry?.toLowerCase().includes(q)) ||
      (o.city?.toLowerCase().includes(q));
  });

  const totalUsers = orgs.reduce((s, o) => s + o._count.users, 0);
  const totalProjects = orgs.reduce((s, o) => s + o._count.projects, 0);
  const activeOrgs = orgs.filter((o) => o.isActive).length;
  const planCounts = {
    GCSGUARD_MANAGED_FREE: orgs.filter((o) => o.subscriptionTier === "GCSGUARD_MANAGED_FREE").length,
    GCSGUARD_MANAGED: orgs.filter((o) => o.subscriptionTier === "GCSGUARD_MANAGED").length,
    GCSGUARD_NON_MANAGED: orgs.filter((o) => o.subscriptionTier === "GCSGUARD_NON_MANAGED").length,
    NONE: orgs.filter((o) => o.subscriptionTier === "NONE").length,
  };

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setAiFilledFields(new Set());
    setSheetOpen(true);
  }

  function openEdit(org: Org) {
    setEditingId(org.id);
    setForm({
      name: org.name,
      domain: org.domain || "",
      website: org.website || "",
      phone: org.phone || "",
      email: org.email || "",
      address: org.address || "",
      city: org.city || "",
      state: org.state || "",
      zipCode: org.zipCode || "",
      country: org.country || "US",
      industry: org.industry || "",
      description: org.description || "",
      subscriptionTier: org.subscriptionTier,
      isActive: org.isActive,
      googleRating: org.googleRating?.toString() || "",
      yelpUrl: org.yelpUrl || "",
      bbbUrl: org.bbbUrl || "",
      socialLinks: org.socialLinks || "",
      notes: org.notes || "",
      trialEndsAt: org.trialEndsAt ? org.trialEndsAt.split("T")[0] : "",
    });
    setAiFilledFields(new Set());
    setSheetOpen(true);
  }

  function updateField(field: keyof FormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error("Organization name is required"); return; }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        domain: form.domain.trim() || null,
        website: form.website.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        zipCode: form.zipCode.trim() || null,
        country: form.country.trim() || null,
        industry: form.industry.trim() || null,
        description: form.description.trim() || null,
        subscriptionTier: form.subscriptionTier,
        isActive: form.isActive,
        googleRating: form.googleRating ? parseFloat(form.googleRating) : null,
        yelpUrl: form.yelpUrl.trim() || null,
        bbbUrl: form.bbbUrl.trim() || null,
        socialLinks: form.socialLinks.trim() || null,
        notes: form.notes.trim() || null,
        trialEndsAt: form.trialEndsAt ? new Date(form.trialEndsAt).toISOString() : null,
      };

      const url = editingId ? `/api/admin/organizations/${editingId}` : "/api/admin/organizations";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to save");
        return;
      }

      const saved = await res.json();
      if (editingId) {
        setOrgs((prev) => prev.map((o) => (o.id === editingId ? saved : o)));
        toast.success("Organization updated");
      } else {
        setOrgs((prev) => [...prev, saved].sort((a, b) => a.name.localeCompare(b.name)));
        toast.success("Organization created");
      }
      setSheetOpen(false);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/organizations/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to delete");
        return;
      }
      setOrgs((prev) => prev.filter((o) => o.id !== id));
      toast.success("Organization deleted");
      setDeleteConfirm(null);
      setSheetOpen(false);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDeleting(false);
    }
  }

  async function runAiLookup() {
    if (!form.name.trim()) { toast.error("Enter a business name first"); return; }
    setAiLoading(true);
    setAiFilledFields(new Set());
    try {
      const url = editingId
        ? `/api/admin/organizations/${editingId}/ai-lookup`
        : "/api/admin/organizations/ai-lookup";

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: form.name.trim(),
          website: form.website.trim() || undefined,
        }),
      });

      if (!res.ok) {
        toast.error("AI lookup failed");
        return;
      }

      const { data } = await res.json();
      const filled = new Set<string>();

      const fieldMap: [keyof FormData, string][] = [
        ["phone", "phone"], ["website", "website"], ["domain", "domain"],
        ["address", "address"], ["city", "city"], ["state", "state"],
        ["zipCode", "zipCode"], ["industry", "industry"], ["description", "description"],
        ["yelpUrl", "yelpUrl"], ["bbbUrl", "bbbUrl"], ["socialLinks", "socialLinks"],
      ];

      setForm((prev) => {
        const updated = { ...prev };
        for (const [formKey, dataKey] of fieldMap) {
          if (data[dataKey] && !prev[formKey]) {
            (updated[formKey] as string) = String(data[dataKey]);
            filled.add(formKey);
          }
        }
        if (data.googleRating && !prev.googleRating) {
          updated.googleRating = String(data.googleRating);
          filled.add("googleRating");
        }
        return updated;
      });

      setAiFilledFields(filled);
      toast.success(`Found ${filled.size} detail${filled.size !== 1 ? "s" : ""} for "${form.name}"`);

      // Clear highlight after 5s
      setTimeout(() => setAiFilledFields(new Set()), 5000);
    } catch {
      toast.error("AI lookup failed");
    } finally {
      setAiLoading(false);
    }
  }

  const inputClass = (field: string) =>
    `w-full px-3 py-2 rounded-lg border text-sm transition-all ${
      aiFilledFields.has(field)
        ? "ring-2 ring-purple-400 border-purple-400 bg-purple-50 dark:bg-purple-950/20"
        : ""
    }`;

  const inputStyle = (field: string) => ({
    background: aiFilledFields.has(field) ? undefined : "var(--bg-primary)",
    borderColor: aiFilledFields.has(field) ? undefined : "var(--border)",
    color: "var(--text-primary)",
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5" style={{ color: "var(--text-primary)" }}>
            <div className="p-1.5 rounded-lg" style={{ background: "var(--brand-primary)", color: "white" }}>
              <Building2 className="h-5 w-5" />
            </div>
            Organizations
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {orgs.length} organization{orgs.length !== 1 ? "s" : ""} · {activeOrgs} active · {totalUsers} users · {totalProjects} projects
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Organization
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total", value: orgs.length, icon: Building2, color: "blue" },
          { label: "Active", value: activeOrgs, icon: Shield, color: "green" },
          { label: "Managed", value: planCounts.GCSGUARD_MANAGED, icon: Server, color: "emerald" },
          { label: "Free", value: planCounts.GCSGUARD_MANAGED_FREE, icon: Star, color: "amber" },
          { label: "Non-Managed", value: planCounts.GCSGUARD_NON_MANAGED, icon: Shield, color: "cyan" },
          { label: "Users", value: totalUsers, icon: Users, color: "purple" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="py-3">
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-md bg-${color}-500/10`}>
                  <Icon className={`h-3.5 w-3.5 text-${color}-600 dark:text-${color}-400`} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{value}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search + Plan Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search by name, domain, industry, or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm"
            style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { key: "ALL", label: "All Plans", count: orgs.length },
            { key: "GCSGUARD_MANAGED", label: "Managed", count: planCounts.GCSGUARD_MANAGED },
            { key: "GCSGUARD_MANAGED_FREE", label: "Free", count: planCounts.GCSGUARD_MANAGED_FREE },
            { key: "GCSGUARD_NON_MANAGED", label: "Non-Managed", count: planCounts.GCSGUARD_NON_MANAGED },
            { key: "NONE", label: "No Plan", count: planCounts.NONE },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setPlanFilter(key)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all border"
              style={{
                background: planFilter === key ? "var(--brand-primary)" : "var(--bg-secondary)",
                color: planFilter === key ? "white" : "var(--text-secondary)",
                borderColor: planFilter === key ? "var(--brand-primary)" : "var(--border)",
              }}
            >
              {label} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <CardHeader className="px-5 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <CardTitle className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            <div className="grid grid-cols-[2.5fr_1fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-4 items-center">
              <span>Organization</span>
              <span>Plan</span>
              <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Users</span>
              <span className="flex items-center gap-1"><FolderOpen className="h-3 w-3" /> Projects</span>
              <span className="flex items-center gap-1"><Receipt className="h-3 w-3" /> Invoices</span>
              <span className="flex items-center gap-1"><Headphones className="h-3 w-3" /> Tickets</span>
              <span className="flex items-center gap-1"><Server className="h-3 w-3" /> Agents</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Building2 className="h-8 w-8 mx-auto mb-2 opacity-15" />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {search ? "No organizations match your search" : "No organizations yet"}
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {filtered.map((org) => {
                const tier = tierStyle[org.subscriptionTier] ?? tierStyle.NONE;
                return (
                  <button
                    key={org.id}
                    onClick={() => openEdit(org)}
                    className="w-full text-left grid grid-cols-[2.5fr_1fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-4 items-center px-5 py-3.5 hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: "var(--bg-secondary)" }}
                        >
                          <Building2 className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                            {org.name}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] truncate" style={{ color: "var(--text-muted)" }}>
                            {org.domain && <span className="truncate max-w-[120px]" title={org.domain}>{org.domain}</span>}
                            {org.industry && <><span>·</span><span className="truncate max-w-[100px]" title={org.industry}>{org.industry}</span></>}
                            {org.city && org.state && <><span>·</span><span className="whitespace-nowrap">{org.city}, {org.state}</span></>}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <Badge
                        className="text-[10px] w-fit"
                        style={{ background: tier.bg, color: tier.color, border: `1px solid ${tier.color}30` }}
                      >
                        {tier.label}
                      </Badge>
                      <Badge
                        className="text-[10px] w-fit"
                        style={{
                          background: org.isActive ? "var(--success-bg)" : "var(--bg-tertiary)",
                          color: org.isActive ? "var(--success)" : "var(--text-muted)",
                          border: `1px solid ${org.isActive ? "var(--success)" : "var(--border)"}30`,
                        }}
                      >
                        {org.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    <div><p className="text-sm font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>{org._count.users}</p></div>
                    <div><p className="text-sm font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>{org._count.projects}</p></div>
                    <div><p className="text-sm font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>{org._count.invoices}</p></div>
                    <div><p className="text-sm font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>{org._count.tickets}</p></div>
                    <div>
                      <p className="text-sm font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>{org._count.guardAgents}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sheet / Side Panel */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setSheetOpen(false)} />

          {/* Panel */}
          <div
            className="relative w-full max-w-2xl h-full overflow-y-auto border-l shadow-2xl"
            style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b" style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}>
              <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                {editingId ? "Edit Organization" : "New Organization"}
              </h2>
              <div className="flex items-center gap-2">
                {editingId && (
                  <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={() => setDeleteConfirm(editingId)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                  </Button>
                )}
                <button onClick={() => setSheetOpen(false)} className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)]">
                  <X className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Name + AI Button */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                  Organization Name *
                </label>
                <div className="flex gap-2">
                  <input
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="e.g. Acme Corporation"
                    className={inputClass("name")}
                    style={inputStyle("name")}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={runAiLookup}
                    disabled={aiLoading || !form.name.trim()}
                    className="shrink-0 gap-1.5 border-purple-300 text-purple-600 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-950/20"
                  >
                    {aiLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {aiLoading ? "Discovering..." : "AI Auto-Fill"}
                  </Button>
                </div>
                {aiLoading && (
                  <p className="text-xs mt-2 text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Searching Google, Yelp, BBB, social media...
                  </p>
                )}
              </div>

              {/* Two-column grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Domain */}
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                    <Globe className="h-3 w-3 inline mr-1" />Domain
                  </label>
                  <input value={form.domain} onChange={(e) => updateField("domain", e.target.value)}
                    placeholder="acmecorp.com" className={inputClass("domain")} style={inputStyle("domain")} />
                </div>

                {/* Website */}
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                    <ExternalLink className="h-3 w-3 inline mr-1" />Website
                  </label>
                  <input value={form.website} onChange={(e) => updateField("website", e.target.value)}
                    placeholder="https://acmecorp.com" className={inputClass("website")} style={inputStyle("website")} />
                </div>

                {/* Email */}
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                    <Mail className="h-3 w-3 inline mr-1" />Email
                  </label>
                  <input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)}
                    placeholder="contact@acmecorp.com" className={inputClass("email")} style={inputStyle("email")} />
                </div>

                {/* Phone */}
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                    <Phone className="h-3 w-3 inline mr-1" />Phone
                  </label>
                  <input value={form.phone} onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="(555) 123-4567" className={inputClass("phone")} style={inputStyle("phone")} />
                </div>

                {/* Industry */}
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Industry</label>
                  <input value={form.industry} onChange={(e) => updateField("industry", e.target.value)}
                    placeholder="e.g. Dental Practice" className={inputClass("industry")} style={inputStyle("industry")} />
                </div>

                {/* Google Rating */}
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                    <Star className="h-3 w-3 inline mr-1" />Google Rating
                  </label>
                  <input value={form.googleRating} onChange={(e) => updateField("googleRating", e.target.value)}
                    placeholder="4.5" type="number" step="0.1" min="0" max="5"
                    className={inputClass("googleRating")} style={inputStyle("googleRating")} />
                </div>
              </div>

              {/* Address Section */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                  <MapPin className="h-3 w-3 inline mr-1" />Address
                </label>
                <input value={form.address} onChange={(e) => updateField("address", e.target.value)}
                  placeholder="123 Main Street" className={`${inputClass("address")} mb-3`} style={inputStyle("address")} />
                <div className="grid grid-cols-4 gap-3">
                  <input value={form.city} onChange={(e) => updateField("city", e.target.value)}
                    placeholder="City" className={inputClass("city")} style={inputStyle("city")} />
                  <input value={form.state} onChange={(e) => updateField("state", e.target.value)}
                    placeholder="State" className={inputClass("state")} style={inputStyle("state")} />
                  <input value={form.zipCode} onChange={(e) => updateField("zipCode", e.target.value)}
                    placeholder="ZIP" className={inputClass("zipCode")} style={inputStyle("zipCode")} />
                  <input value={form.country} onChange={(e) => updateField("country", e.target.value)}
                    placeholder="Country" className={inputClass("country")} style={inputStyle("country")} />
                </div>
              </div>

              {/* External Links */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Yelp URL</label>
                  <input value={form.yelpUrl} onChange={(e) => updateField("yelpUrl", e.target.value)}
                    placeholder="https://yelp.com/biz/..." className={inputClass("yelpUrl")} style={inputStyle("yelpUrl")} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>BBB URL</label>
                  <input value={form.bbbUrl} onChange={(e) => updateField("bbbUrl", e.target.value)}
                    placeholder="https://bbb.org/..." className={inputClass("bbbUrl")} style={inputStyle("bbbUrl")} />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Description</label>
                <textarea value={form.description} onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Short description of the organization..."
                  rows={3} className={inputClass("description")} style={inputStyle("description")} />
              </div>

              {/* Social Links */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                  Social Links (JSON)
                </label>
                <textarea value={form.socialLinks} onChange={(e) => updateField("socialLinks", e.target.value)}
                  placeholder='{"facebook": "https://...", "linkedin": "https://..."}'
                  rows={2} className={`${inputClass("socialLinks")} font-mono text-xs`} style={inputStyle("socialLinks")}
                  spellCheck={false} />
              </div>

              {/* Subscription + Status + Trial */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Service Plan</label>
                  <select
                    value={form.subscriptionTier}
                    onChange={(e) => updateField("subscriptionTier", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                  >
                    <option value="NONE">No Plan</option>
                    <option value="GCSGUARD_MANAGED_FREE">Managed (Free) — $0/mo</option>
                    <option value="GCSGUARD_MANAGED">GcsGuard Managed — $49/user/mo</option>
                    <option value="GCSGUARD_NON_MANAGED">GcsGuard Non-Managed — $19/user/mo</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Status</label>
                  <button
                    onClick={() => updateField("isActive", !form.isActive)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm w-full"
                    style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                  >
                    <div className={`w-8 h-5 rounded-full relative transition-colors ${form.isActive ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isActive ? "translate-x-3.5" : "translate-x-0.5"}`} />
                    </div>
                    <span>{form.isActive ? "Active" : "Inactive"}</span>
                  </button>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                    Trial End Date
                  </label>
                  <input
                    type="date"
                    value={form.trialEndsAt}
                    onChange={(e) => updateField("trialEndsAt", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                  />
                  <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
                    Auto-set to 30 days from creation. Leave empty for no trial.
                  </p>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Internal Notes</label>
                <textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)}
                  placeholder="Admin-only notes about this organization..."
                  rows={3} className={inputClass("notes")} style={inputStyle("notes")} />
              </div>

              {/* Save Button */}
              <div className="flex gap-3 pt-2">
                <Button onClick={handleSave} disabled={saving} className="flex-1">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
                  {saving ? "Saving..." : editingId ? "Update Organization" : "Create Organization"}
                </Button>
                <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteConfirm(null)} />
          <div className="relative rounded-xl border p-6 max-w-md w-full shadow-2xl" style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>Delete Organization?</h3>
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
              This will soft-delete the organization. This action can be reversed in the database.
            </p>
            {(() => {
              const org = orgs.find((o) => o.id === deleteConfirm);
              if (org && org._count.users > 0) {
                return (
                  <div className="p-3 rounded-lg mb-4 text-sm" style={{ background: "var(--warning-bg)", color: "var(--warning)" }}>
                    This organization has {org._count.users} user(s). Remove or reassign them first.
                  </div>
                );
              }
              return null;
            })()}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="flex-1">Cancel</Button>
              <Button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
