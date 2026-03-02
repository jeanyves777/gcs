"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, Globe, ArrowLeft, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Phase = { label: string; icon: string };

const PHASES: Phase[] = [
  { label: "Connecting to business website...", icon: "🔍" },
  { label: "Analyzing digital footprint...", icon: "📊" },
  { label: "Running security assessment...", icon: "🔒" },
  { label: "Identifying opportunities...", icon: "💡" },
  { label: "Crafting your pitch...", icon: "🎯" },
];

// ─── Score computation from pitch text ──────────────────────────────────────

function computeScores(pitchText: string) {
  // Security score: ratio of ✅ to total header checks
  const secMatch = pitchText.match(/## 🔒 Security Assessment([\s\S]*?)(?=\n##|$)/);
  const secText = secMatch ? secMatch[1] : "";
  const passed = (secText.match(/✅/g) || []).length;
  const failed = (secText.match(/❌/g) || []).length;
  const total = passed + failed;
  const securityScore = total > 0 ? Math.round((passed / total) * 100) : 50;

  // Pain count: bullet points in pain points section
  const painMatch = pitchText.match(/## 💡 Pain Points[^#]*([\s\S]*?)(?=\n##|$)/);
  const painText = painMatch ? painMatch[1] : "";
  const painCount = (painText.match(/^[-•*\d]\s/gm) || []).length || (painText.match(/\n-\s/g) || []).length;

  // Presence score: keyword analysis in digital footprint section
  const footprintMatch = pitchText.match(/## 🌐 Digital Footprint[^#]*([\s\S]*?)(?=\n##|$)/);
  const footprintText = (footprintMatch ? footprintMatch[1] : "").toLowerCase();
  const posWords = ["professional", "modern", "well-designed", "active", "strong", "comprehensive", "robust", "clean", "responsive"];
  const negWords = ["outdated", "basic", "limited", "minimal", "weak", "poor", "lacks", "missing", "old", "static", "no ssl", "slow"];
  const posCount = posWords.filter((w) => footprintText.includes(w)).length;
  const negCount = negWords.filter((w) => footprintText.includes(w)).length;
  const presenceScore = Math.max(15, Math.min(90, 50 + posCount * 7 - negCount * 8));

  // Deal score: higher security risk + more pain points = better prospect
  const secRisk = 100 - securityScore;
  const dealScore = Math.max(20, Math.min(97, Math.round(0.5 * secRisk + 0.5 * Math.min(painCount * 14, 100))));

  return { securityScore, presenceScore, dealScore, painCount };
}

// ─── Section preview (live streaming) ───────────────────────────────────────

function parseSections(text: string) {
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

export function NewPitchClient() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "saving">("idle");
  const [pitchText, setPitchText] = useState("");
  const [sections, setSections] = useState<{ heading: string; content: string }[]>([]);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const phaseTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

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
      setProgress((p) => p >= 90 ? p : Math.min(90, p + (90 - p) * 0.035));
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
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      if (!res.body) throw new Error("No stream");

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

      // Auto-save
      setState("saving");
      const scores = computeScores(accumulated);
      const saveRes = await fetch("/api/admin/pitch-board/pitches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: businessName.trim(),
          websiteUrl: websiteUrl.trim(),
          pitchText: accumulated,
          ...scores,
        }),
      });
      if (!saveRes.ok) throw new Error("Failed to save pitch");
      const saved = await saveRes.json();
      toast.success("Pitch saved!");
      router.push(`/portal/admin/pitch-board/${saved.id}`);
    } catch (err) {
      stopTimers();
      setState("idle");
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const isLoading = state === "loading" || state === "saving";

  return (
    <div className="max-w-3xl space-y-6">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <Link href="/portal/admin/pitch-board">
          <Button variant="ghost" size="sm" className="gap-1.5" style={{ color: "var(--text-muted)" }}>
            <ArrowLeft className="h-4 w-4" /> Pitch Board
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5" style={{ color: "var(--brand-primary)" }} />
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
            Build New Pitch
          </h1>
        </div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Enter a prospect&apos;s details — AI will research, analyze, and build a targeted deal pitch.
        </p>
      </div>

      {/* Input Card */}
      <div className="rounded-2xl p-6 space-y-4" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Business Name
            </label>
            <input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Acme Healthcare Group"
              disabled={isLoading}
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none border transition-colors"
              style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
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
                disabled={isLoading}
                className="w-full rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none border transition-colors"
                style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                onFocus={(e) => (e.target.style.borderColor = "var(--brand-primary)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                onKeyDown={(e) => e.key === "Enter" && !isLoading && handleBuild()}
              />
            </div>
          </div>
        </div>
        <Button
          onClick={handleBuild}
          disabled={isLoading}
          className="gap-2 text-white font-semibold"
          style={{ background: "var(--brand-primary)" }}
          size="lg"
        >
          {state === "saving"
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving Pitch...</>
            : state === "loading"
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating Pitch...</>
            : <><Sparkles className="h-4 w-4" /> Start Building Pitch</>}
        </Button>
      </div>

      {/* Loading / Live Preview */}
      {state === "loading" && (
        <div className="rounded-2xl p-8 space-y-6" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
          {/* Progress bar */}
          <div>
            <div className="flex justify-between mb-2">
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
            {PHASES.map((phase, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                  style={{
                    background: i < phaseIndex ? "var(--success-bg)" : i === phaseIndex ? "var(--brand-primary)20" : "var(--bg-tertiary)",
                  }}
                >
                  {i < phaseIndex
                    ? <Check className="h-4 w-4" style={{ color: "var(--success)" }} />
                    : i === phaseIndex
                    ? <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--brand-primary)" }} />
                    : <span style={{ color: "var(--text-muted)", fontSize: 14 }}>{phase.icon}</span>}
                </div>
                <span className="text-sm font-medium" style={{ color: i <= phaseIndex ? "var(--text-primary)" : "var(--text-muted)", opacity: i > phaseIndex ? 0.4 : 1 }}>
                  {phase.label}
                </span>
              </div>
            ))}
          </div>

          {/* Live section count */}
          {sections.length > 0 && (
            <div className="pt-2 border-t" style={{ borderColor: "var(--border)" }}>
              <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                ✨ {sections.length} of 7 sections ready — redirecting when complete...
              </p>
            </div>
          )}
        </div>
      )}

      {/* Saving state */}
      {state === "saving" && (
        <div
          className="rounded-2xl p-8 flex items-center gap-4"
          style={{ background: "var(--success-bg)", border: "1px solid var(--success)" }}
        >
          <Loader2 className="h-8 w-8 animate-spin flex-shrink-0" style={{ color: "var(--success)" }} />
          <div>
            <p className="font-bold" style={{ color: "var(--success)" }}>Pitch generated! Saving...</p>
            <p className="text-sm" style={{ color: "var(--success)" }}>You&apos;ll be redirected to the full analytics view.</p>
          </div>
        </div>
      )}
    </div>
  );
}
