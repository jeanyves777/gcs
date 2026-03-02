"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Copy, Check, Mail, Trash2, Loader2, Globe, Calendar, User2,
  Building2, Shield, Lightbulb, Target, Rocket, MessageSquare, ChevronDown, ChevronUp, X, Send,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type Pitch = {
  id: string;
  businessName: string;
  websiteUrl: string;
  pitchText: string;
  securityScore: number;
  presenceScore: number;
  dealScore: number;
  painCount: number;
  createdAt: Date;
  createdBy: { name: string | null; email: string };
};

// ─── Score ring (SVG) ────────────────────────────────────────────────────────

function ScoreRing({
  score, size = 100, color, label, sublabel,
}: {
  score: number; size?: number; color: string; label: string; sublabel?: string;
}) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(100, score)) / 100);
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--bg-tertiary)" strokeWidth="7" />
        <circle
          cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={circ} strokeDashoffset={offset}
          transform="rotate(-90 50 50)" strokeLinecap="round"
        />
        <text x="50" y="46" textAnchor="middle" fontSize="18" fontWeight="800" fill={color}>{score}</text>
        <text x="50" y="60" textAnchor="middle" fontSize="10" fill="var(--text-muted)">/100</text>
      </svg>
      <p className="text-xs font-bold text-center" style={{ color: "var(--text-primary)" }}>{label}</p>
      {sublabel && <p className="text-[10px] text-center" style={{ color: "var(--text-muted)" }}>{sublabel}</p>}
    </div>
  );
}

// ─── Metric bar ──────────────────────────────────────────────────────────────

function MetricBar({ label, value, color, note }: { label: string; value: number; color: string; note?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{label}</span>
        <div className="flex items-center gap-2">
          {note && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: color + "20", color }}>{note}</span>}
          <span className="text-xs font-mono font-bold" style={{ color }}>{value}%</span>
        </div>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--bg-tertiary)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: `linear-gradient(90deg, ${color}cc, ${color})` }}
        />
      </div>
    </div>
  );
}

// ─── Parse pitch sections ─────────────────────────────────────────────────────

type Section = { heading: string; content: string };

function parseSections(text: string): Section[] {
  return text
    .split(/\n##\s+/)
    .filter(Boolean)
    .map((part) => {
      const nl = part.indexOf("\n");
      return nl === -1
        ? { heading: part.trim(), content: "" }
        : { heading: part.slice(0, nl).trim(), content: part.slice(nl + 1).trim() };
    });
}

// ─── Parse security headers from pitch text ───────────────────────────────────

type Header = { name: string; present: boolean };

function parseSecurityHeaders(pitchText: string): Header[] {
  const secMatch = pitchText.match(/## 🔒 Security Assessment([\s\S]*?)(?=\n##|$)/);
  if (!secMatch) return [];
  const lines = secMatch[1].split("\n");
  const headers: Header[] = [];
  for (const line of lines) {
    if (line.includes("✅")) {
      const raw = line.replace(/✅/g, "").replace(/^[-*•\s]+/, "").split(/—|–/)[0].trim();
      if (raw.length > 2 && raw.length < 60) headers.push({ name: raw, present: true });
    } else if (line.includes("❌")) {
      const raw = line.replace(/❌/g, "").replace(/^[-*•\s]+/, "").split(/—|–/)[0].trim();
      if (raw.length > 2 && raw.length < 60) headers.push({ name: raw, present: false });
    }
  }
  return headers;
}

// ─── Section icons ────────────────────────────────────────────────────────────

const SECTION_ICONS: Record<string, React.ElementType> = {
  "business overview": Building2,
  "digital footprint": Globe,
  "security assessment": Shield,
  "pain points": Lightbulb,
  "opportunities": Lightbulb,
  "gcs service": Target,
  "the pitch": Rocket,
  "deal talking": MessageSquare,
};

function getSectionIcon(heading: string): React.ElementType {
  const lower = heading.toLowerCase();
  for (const [key, Icon] of Object.entries(SECTION_ICONS)) {
    if (lower.includes(key)) return Icon;
  }
  return Target;
}

const SECTION_COLORS = [
  "#1565C0", "#7c3aed", "#dc2626", "#d97706", "#059669", "#0891b2", "#db2777",
];

// ─── Render pitch content ─────────────────────────────────────────────────────

function renderContent(content: string) {
  if (!content) return null;
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(<ul key={key++} className="my-2 space-y-1.5">{listItems}</ul>);
      listItems = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) { flushList(); continue; }
    const isBullet = /^[-•*]\s+/.test(line);
    const isNumbered = /^\d+\.\s+/.test(line);
    if (isBullet || isNumbered) {
      const text = line.replace(/^[-•*\d.]+\s+/, "");
      listItems.push(
        <li key={key++} className="flex items-start gap-2.5 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          <span className="mt-2 h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: "var(--brand-primary)" }} />
          <span dangerouslySetInnerHTML={{ __html: bold(text) }} />
        </li>
      );
    } else {
      flushList();
      elements.push(
        <p key={key++} className="text-sm leading-relaxed mb-2" style={{ color: "var(--text-secondary)" }}
          dangerouslySetInnerHTML={{ __html: bold(line) }} />
      );
    }
  }
  flushList();
  return elements;
}

function bold(t: string) {
  return t
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text-primary)">$1</strong>')
    .replace(/`(.+?)`/g, '<code style="background:var(--bg-tertiary);padding:1px 5px;border-radius:4px;font-size:12px;font-family:monospace">$1</code>');
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({ section, index }: { section: Section; index: number }) {
  const [expanded, setExpanded] = useState(true);
  const Icon = getSectionIcon(section.heading);
  const accent = SECTION_COLORS[index % SECTION_COLORS.length];

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg-primary)" }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors"
        style={{ background: accent + "10", borderBottom: expanded ? `1px solid ${accent}25` : "none" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: accent + "20" }}>
            <Icon className="h-4 w-4" style={{ color: accent }} />
          </div>
          <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{section.heading}</span>
        </div>
        {expanded
          ? <ChevronUp className="h-4 w-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
          : <ChevronDown className="h-4 w-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />}
      </button>
      {expanded && <div className="px-5 py-4">{renderContent(section.content)}</div>}
    </div>
  );
}

// ─── Email modal ──────────────────────────────────────────────────────────────

function EmailModal({ pitch, onClose }: { pitch: Pitch; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!email.trim() || !email.includes("@")) { toast.error("Enter a valid email"); return; }
    setSending(true);
    try {
      const res = await fetch("/api/admin/pitch-board/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientEmail: email.trim(), businessName: pitch.businessName, pitchText: pitch.pitchText }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast.success(`Pitch sent to ${email}`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" style={{ color: "var(--brand-primary)" }} />
            <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Email This Pitch</h3>
          </div>
          <button onClick={onClose}><X className="h-4 w-4" style={{ color: "var(--text-muted)" }} /></button>
        </div>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Send the AI pitch for <strong style={{ color: "var(--text-primary)" }}>{pitch.businessName}</strong> as a branded HTML email.
        </p>
        <div className="space-y-1">
          <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Recipient Email</label>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="prospect@company.com"
            className="w-full rounded-lg px-3 py-2.5 text-sm outline-none border"
            style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
          <Button size="sm" className="flex-1 gap-1.5 text-white" style={{ background: "var(--brand-primary)" }} onClick={handleSend} disabled={sending}>
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {sending ? "Sending..." : "Send Pitch"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PitchViewClient({ pitch }: { pitch: Pitch }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const sections = parseSections(pitch.pitchText);
  const headers = parseSecurityHeaders(pitch.pitchText);
  const secRisk = Math.max(0, 100 - pitch.securityScore);

  const dealLabel = pitch.dealScore >= 80 ? "Very High"
    : pitch.dealScore >= 60 ? "High"
    : pitch.dealScore >= 40 ? "Medium" : "Low";
  const dealColor = pitch.dealScore >= 80 ? "#16a34a"
    : pitch.dealScore >= 60 ? "#0891b2"
    : pitch.dealScore >= 40 ? "#d97706" : "#6b7280";
  const riskColor = secRisk > 60 ? "#dc2626" : secRisk > 30 ? "#d97706" : "#16a34a";
  const riskLabel = secRisk > 60 ? "Critical" : secRisk > 30 ? "High" : "Low";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(pitch.pitchText);
    setCopied(true);
    toast.success("Pitch copied");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete pitch for "${pitch.businessName}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/admin/pitch-board/pitches/${pitch.id}`, { method: "DELETE" });
      toast.success("Pitch deleted");
      router.push("/portal/admin/pitch-board");
    } catch {
      toast.error("Failed to delete");
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-5xl space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Link href="/portal/admin/pitch-board">
          <Button variant="ghost" size="sm" className="gap-1.5" style={{ color: "var(--text-muted)" }}>
            <ArrowLeft className="h-4 w-4" /> Pitch Board
          </Button>
        </Link>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowEmail(true)}>
            <Mail className="h-3.5 w-3.5" /> Email Pitch
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleCopy}>
            {copied ? <><Check className="h-3.5 w-3.5" /> Copied!</> : <><Copy className="h-3.5 w-3.5" /> Copy Pitch</>}
          </Button>
          <Button
            variant="outline" size="sm" className="gap-1.5 text-xs"
            style={{ color: "var(--error)", borderColor: "var(--error)" }}
            onClick={handleDelete} disabled={deleting}
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Delete
          </Button>
        </div>
      </div>

      {/* Hero card */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
      >
        {/* Banner */}
        <div className="px-8 py-6 flex items-start justify-between flex-wrap gap-4"
          style={{ background: "linear-gradient(135deg, var(--brand-primary) 0%, #7c3aed 100%)" }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ background: "rgba(255,255,255,0.2)", color: "white" }}
              >
                AI Intelligence Report
              </span>
            </div>
            <h1 className="text-3xl font-black" style={{ color: "white", fontFamily: "var(--font-display)" }}>
              {pitch.businessName}
            </h1>
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.7)" }} />
                <span className="text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>{pitch.websiteUrl}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.7)" }} />
                <span className="text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>{formatDate(new Date(pitch.createdAt))}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User2 className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.7)" }} />
                <span className="text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>{pitch.createdBy.name ?? pitch.createdBy.email}</span>
              </div>
            </div>
          </div>
          <div
            className="px-5 py-3 rounded-xl text-center"
            style={{ background: "rgba(255,255,255,0.15)" }}
          >
            <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.7)" }}>Deal Potential</p>
            <p className="text-3xl font-black" style={{ color: "white", fontFamily: "var(--font-display)" }}>{dealLabel}</p>
          </div>
        </div>

        {/* Score rings row */}
        <div className="px-8 py-6 grid grid-cols-2 sm:grid-cols-4 gap-6 border-b" style={{ borderColor: "var(--border)" }}>
          <ScoreRing
            score={secRisk} color={riskColor}
            label="Security Risk" sublabel={riskLabel}
          />
          <ScoreRing
            score={pitch.dealScore} color={dealColor}
            label="Deal Potential" sublabel={dealLabel}
          />
          <ScoreRing
            score={pitch.presenceScore} color="#7c3aed"
            label="Digital Presence"
            sublabel={pitch.presenceScore > 65 ? "Strong" : pitch.presenceScore > 40 ? "Moderate" : "Weak"}
          />
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{ background: "#7c3aed12", border: "7px solid var(--bg-tertiary)", position: "relative" }}
            >
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(#7c3aed ${Math.min(pitch.painCount * 14, 100)}%, transparent 0%)`,
                  mask: "radial-gradient(farthest-side, transparent calc(100% - 7px), black 0)",
                  WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 7px), black 0)",
                }}
              />
              <span className="text-2xl font-black" style={{ color: "#7c3aed" }}>{pitch.painCount}</span>
            </div>
            <p className="text-xs font-bold text-center" style={{ color: "var(--text-primary)" }}>Pain Points</p>
            <p className="text-[10px] text-center" style={{ color: "var(--text-muted)" }}>
              {pitch.painCount >= 5 ? "Many opportunities" : pitch.painCount >= 3 ? "Good opportunities" : "Few identified"}
            </p>
          </div>
        </div>

        {/* Progress metrics */}
        <div className="px-8 py-6 border-b" style={{ borderColor: "var(--border)" }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>Performance Metrics</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MetricBar
              label="Security Risk Exposure"
              value={secRisk}
              color={riskColor}
              note={riskLabel}
            />
            <MetricBar
              label="Deal Potential"
              value={pitch.dealScore}
              color={dealColor}
              note={dealLabel}
            />
            <MetricBar
              label="Digital Presence Strength"
              value={pitch.presenceScore}
              color="#7c3aed"
              note={pitch.presenceScore > 65 ? "Strong" : "Needs Improvement"}
            />
            <MetricBar
              label="GCS Opportunity Score"
              value={Math.min(97, Math.round(0.5 * secRisk + 0.5 * Math.min(pitch.painCount * 14, 100)))}
              color="#0891b2"
              note="Based on findings"
            />
          </div>
        </div>

        {/* Security headers grid */}
        {headers.length > 0 && (
          <div className="px-8 py-6 border-b" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>
              Security Headers Audit ({headers.filter((h) => h.present).length}/{headers.length} passing)
            </p>
            <div className="flex flex-wrap gap-2">
              {headers.map((h) => (
                <span
                  key={h.name}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{
                    background: h.present ? "#f0fdf4" : "#fef2f2",
                    color: h.present ? "#16a34a" : "#dc2626",
                    border: `1px solid ${h.present ? "#bbf7d0" : "#fecaca"}`,
                  }}
                >
                  {h.present ? "✅" : "❌"} {h.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pitch sections */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
          Full Intelligence Report — {sections.length} sections
        </p>
        <div className="space-y-3">
          {sections.map((section, i) => (
            <SectionCard key={i} section={section} index={i} />
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div
        className="rounded-2xl px-6 py-5 flex items-center justify-between flex-wrap gap-3"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
      >
        <div>
          <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Ready to close this deal?</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Send the pitch directly to the prospect or build another one.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm" className="gap-2 text-white"
            style={{ background: "var(--brand-primary)" }}
            onClick={() => setShowEmail(true)}
          >
            <Mail className="h-4 w-4" /> Send to Prospect
          </Button>
          <Link href="/portal/admin/pitch-board/new">
            <Button variant="outline" size="sm" className="gap-2">Build Another Pitch</Button>
          </Link>
        </div>
      </div>

      {showEmail && <EmailModal pitch={pitch} onClose={() => setShowEmail(false)} />}
    </div>
  );
}
