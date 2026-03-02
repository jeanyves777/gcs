"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Globe, Send, Copy, Check, RotateCcw, Loader2,
  Building2, Shield, Lightbulb, Target, Rocket, MessageSquare,
  ChevronDown, ChevronUp, Mail, X,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────────────

type Phase = { label: string; icon: string };

const PHASES: Phase[] = [
  { label: "Connecting to business website...", icon: "🔍" },
  { label: "Analyzing digital footprint...", icon: "📊" },
  { label: "Running security assessment...", icon: "🔒" },
  { label: "Identifying opportunities...", icon: "💡" },
  { label: "Crafting your pitch...", icon: "🎯" },
];

// Section heading → lucide icon
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
  return Sparkles;
}

// ─── Parse markdown into sections ───────────────────────────────────────────

type Section = { heading: string; content: string };

function parseSections(text: string): Section[] {
  const parts = text.split(/\n##\s+/);
  return parts
    .map((part) => {
      const nl = part.indexOf("\n");
      if (nl === -1) return { heading: part.trim(), content: "" };
      return { heading: part.slice(0, nl).trim(), content: part.slice(nl + 1).trim() };
    })
    .filter((s) => s.heading);
}

// ─── Render markdown-ish content ────────────────────────────────────────────

function renderContent(content: string) {
  if (!content) return null;
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inList = false;
  let listItems: React.ReactNode[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key++} className="my-2 space-y-1 list-none ml-0">
          {listItems}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      continue;
    }

    const isBullet = /^[-•*]\s+/.test(line);
    const isNumbered = /^\d+\.\s+/.test(line);

    if (isBullet || isNumbered) {
      inList = true;
      const text = line.replace(/^[-•*\d.]+\s+/, "");
      listItems.push(
        <li key={key++} className="flex items-start gap-2 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          <span className="mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: "var(--brand-primary)" }} />
          <span dangerouslySetInnerHTML={{ __html: boldify(text) }} />
        </li>
      );
    } else {
      if (inList) flushList();
      elements.push(
        <p key={key++} className="text-sm leading-relaxed mb-2" style={{ color: "var(--text-secondary)" }}
          dangerouslySetInnerHTML={{ __html: boldify(line) }} />
      );
    }
  }
  if (inList) flushList();
  return elements;
}

function boldify(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text-primary)">$1</strong>')
    .replace(/`(.+?)`/g, '<code style="background:var(--bg-tertiary);padding:1px 5px;border-radius:4px;font-size:12px;">$1</code>');
}

// ─── Section Card ────────────────────────────────────────────────────────────

function SectionCard({ section, index }: { section: Section; index: number }) {
  const [expanded, setExpanded] = useState(true);
  const Icon = getSectionIcon(section.heading);

  const accent = [
    "var(--brand-primary)",
    "#7c3aed",
    "#dc2626",
    "#d97706",
    "#059669",
    "#0891b2",
    "#4f46e5",
  ][index % 7];

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: "1px solid var(--border)", background: "var(--bg-primary)" }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:opacity-90"
        style={{ background: accent + "12", borderBottom: expanded ? `1px solid ${accent}30` : "none" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: accent + "20" }}
          >
            <Icon className="h-4 w-4" style={{ color: accent }} />
          </div>
          <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
            {section.heading}
          </span>
        </div>
        {expanded
          ? <ChevronUp className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
          : <ChevronDown className="h-4 w-4" style={{ color: "var(--text-muted)" }} />}
      </button>

      {expanded && (
        <div className="px-5 py-4">
          {renderContent(section.content)}
        </div>
      )}
    </div>
  );
}

// ─── Email Modal ─────────────────────────────────────────────────────────────

function EmailModal({
  businessName,
  pitchText,
  onClose,
}: {
  businessName: string;
  pitchText: string;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/admin/pitch-board/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientEmail: email.trim(), businessName, pitchText }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast.success(`Pitch sent to ${email}`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div
        className="w-full max-w-md rounded-2xl p-6 space-y-4"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" style={{ color: "var(--brand-primary)" }} />
            <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Email This Pitch</h3>
          </div>
          <button onClick={onClose} className="hover:opacity-70 transition-opacity">
            <X className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Send the full AI-generated pitch for <strong style={{ color: "var(--text-primary)" }}>{businessName}</strong> as a branded HTML email.
        </p>

        <div className="space-y-1">
          <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Recipient Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="prospect@company.com"
            className="w-full rounded-lg px-3 py-2.5 text-sm outline-none border"
            style={{
              background: "var(--bg-secondary)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
          <Button
            size="sm"
            className="flex-1 gap-1.5 text-white"
            style={{ background: "var(--brand-primary)" }}
            onClick={handleSend}
            disabled={sending}
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {sending ? "Sending..." : "Send Pitch"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function PitchBoardClient() {
  const [businessName, setBusinessName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [pitchText, setPitchText] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const phaseTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup timers
  useEffect(() => () => {
    if (phaseTimer.current) clearInterval(phaseTimer.current);
    if (progressTimer.current) clearInterval(progressTimer.current);
  }, []);

  const startTimers = () => {
    setPhaseIndex(0);
    setProgress(0);

    phaseTimer.current = setInterval(() => {
      setPhaseIndex((i) => (i < PHASES.length - 1 ? i + 1 : i));
    }, 5000);

    progressTimer.current = setInterval(() => {
      setProgress((p) => {
        // Ease toward 90% over ~25 seconds, stall there until done
        if (p >= 90) return p;
        const increment = (90 - p) * 0.035;
        return Math.min(90, p + increment);
      });
    }, 300);
  };

  const stopTimers = () => {
    if (phaseTimer.current) { clearInterval(phaseTimer.current); phaseTimer.current = null; }
    if (progressTimer.current) { clearInterval(progressTimer.current); progressTimer.current = null; }
  };

  const handleBuild = async () => {
    if (!businessName.trim() || !websiteUrl.trim()) {
      toast.error("Please enter a business name and website URL");
      return;
    }

    setState("loading");
    setPitchText("");
    setSections([]);
    startTimers();

    try {
      const res = await fetch("/api/admin/pitch-board/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName: businessName.trim(), websiteUrl: websiteUrl.trim() }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to generate pitch");
      }

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setPitchText(accumulated);
        setSections(parseSections(accumulated));
      }

      stopTimers();
      setProgress(100);
      setPhaseIndex(PHASES.length - 1);
      setState("done");
    } catch (err) {
      stopTimers();
      setState("idle");
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pitchText);
      setCopied(true);
      toast.success("Pitch copied to clipboard");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleReset = () => {
    setState("idle");
    setPitchText("");
    setSections([]);
    setProgress(0);
    setPhaseIndex(0);
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5" style={{ color: "var(--brand-primary)" }} />
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
              AI Pitch Board
            </h1>
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ background: "var(--brand-primary)20", color: "var(--brand-primary)" }}
            >
              Admin Only
            </span>
          </div>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Enter a prospect's details — AI analyzes their site, security posture, and builds a hyper-targeted pitch to close the deal.
          </p>
        </div>
      </div>

      {/* Input Card */}
      <div
        className="rounded-2xl p-6 space-y-4"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Business Name
            </label>
            <input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Acme Healthcare Group"
              disabled={state === "loading"}
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none border transition-colors"
              style={{
                background: "var(--bg-secondary)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--brand-primary)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Website URL
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--text-muted)" }} />
              <input
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="e.g. acmehealthcare.com"
                disabled={state === "loading"}
                className="w-full rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none border transition-colors"
                style={{
                  background: "var(--bg-secondary)",
                  borderColor: "var(--border)",
                  color: "var(--text-primary)",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--brand-primary)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                onKeyDown={(e) => e.key === "Enter" && handleBuild()}
              />
            </div>
          </div>
        </div>

        <Button
          onClick={handleBuild}
          disabled={state === "loading"}
          className="w-full sm:w-auto gap-2 text-white font-semibold"
          style={{ background: "var(--brand-primary)" }}
          size="lg"
        >
          {state === "loading" ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Generating Pitch...</>
          ) : (
            <><Sparkles className="h-4 w-4" /> Start Building Pitch</>
          )}
        </Button>
      </div>

      {/* Loading State */}
      {state === "loading" && (
        <div
          className="rounded-2xl p-8 space-y-6"
          style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
        >
          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Analyzing prospect...</span>
              <span className="text-xs font-mono" style={{ color: "var(--brand-primary)" }}>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-tertiary)" }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%`, background: "linear-gradient(90deg, var(--brand-primary), #7c3aed)" }}
              />
            </div>
          </div>

          {/* Phase steps */}
          <div className="space-y-3">
            {PHASES.map((phase, i) => {
              const done = i < phaseIndex;
              const active = i === phaseIndex;
              return (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 transition-all"
                    style={{
                      background: done
                        ? "var(--success-bg)"
                        : active
                        ? "var(--brand-primary)20"
                        : "var(--bg-tertiary)",
                    }}
                  >
                    {done ? (
                      <Check className="h-4 w-4" style={{ color: "var(--success)" }} />
                    ) : active ? (
                      <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--brand-primary)" }} />
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontSize: 14 }}>{phase.icon}</span>
                    )}
                  </div>
                  <span
                    className="text-sm font-medium"
                    style={{
                      color: done ? "var(--text-muted)" : active ? "var(--text-primary)" : "var(--text-muted)",
                      opacity: i > phaseIndex ? 0.4 : 1,
                    }}
                  >
                    {phase.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Live preview */}
          {sections.length > 0 && (
            <div className="pt-2 border-t" style={{ borderColor: "var(--border)" }}>
              <p className="text-xs font-medium mb-3" style={{ color: "var(--text-muted)" }}>
                Sections ready: {sections.length} / 7
              </p>
              <div className="space-y-3">
                {sections.map((s, i) => (
                  <SectionCard key={i} section={s} index={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Done State — Full Pitch */}
      {state === "done" && sections.length > 0 && (
        <div className="space-y-4">
          {/* Actions bar */}
          <div
            className="rounded-xl px-5 py-3 flex items-center justify-between flex-wrap gap-3"
            style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: "var(--success-bg)" }}
              >
                <Check className="h-3.5 w-3.5" style={{ color: "var(--success)" }} />
              </div>
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Pitch ready for {businessName}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setShowEmailModal(true)}
              >
                <Mail className="h-3.5 w-3.5" /> Email Pitch
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={handleCopy}
              >
                {copied
                  ? <><Check className="h-3.5 w-3.5" /> Copied!</>
                  : <><Copy className="h-3.5 w-3.5" /> Copy Pitch</>}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={handleReset}
              >
                <RotateCcw className="h-3.5 w-3.5" /> New Pitch
              </Button>
            </div>
          </div>

          {/* Section cards */}
          <div className="space-y-3">
            {sections.map((section, i) => (
              <SectionCard key={i} section={section} index={i} />
            ))}
          </div>

          {/* Bottom actions */}
          <div className="flex items-center justify-center gap-3 pt-2 pb-4">
            <Button
              size="sm"
              className="gap-2 text-white"
              style={{ background: "var(--brand-primary)" }}
              onClick={() => setShowEmailModal(true)}
            >
              <Mail className="h-4 w-4" /> Send to Prospect
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" /> Build Another Pitch
            </Button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {state === "idle" && (
        <div
          className="rounded-2xl p-12 flex flex-col items-center text-center"
          style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", borderStyle: "dashed" }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "var(--brand-primary)12" }}
          >
            <Sparkles className="h-8 w-8" style={{ color: "var(--brand-primary)" }} />
          </div>
          <h3 className="font-bold text-lg mb-2" style={{ color: "var(--text-primary)" }}>
            Your AI Deal Maker is Ready
          </h3>
          <p className="text-sm max-w-md" style={{ color: "var(--text-muted)" }}>
            Enter any prospect's business name and website above. Our AI will research their digital presence, analyze
            security vulnerabilities, and build a targeted pitch that speaks directly to their pain points — positioning
            GCS as the obvious solution.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-4 w-full max-w-sm">
            {[
              { icon: "🔍", label: "Site Analysis" },
              { icon: "🔒", label: "Security Scan" },
              { icon: "🎯", label: "Targeted Pitch" },
            ].map((f) => (
              <div
                key={f.label}
                className="rounded-xl p-3 text-center"
                style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
              >
                <div className="text-2xl mb-1">{f.icon}</div>
                <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{f.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Email modal */}
      {showEmailModal && (
        <EmailModal
          businessName={businessName}
          pitchText={pitchText}
          onClose={() => setShowEmailModal(false)}
        />
      )}
    </div>
  );
}
