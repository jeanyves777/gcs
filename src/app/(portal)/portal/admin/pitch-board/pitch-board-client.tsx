"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Plus, Trash2, ExternalLink, Globe, Calendar, TrendingUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

type Pitch = {
  id: string;
  businessName: string;
  websiteUrl: string;
  securityScore: number;
  presenceScore: number;
  dealScore: number;
  painCount: number;
  createdAt: Date;
  createdBy: { name: string | null; email: string };
};

function dealLabel(score: number): { label: string; color: string; bg: string } {
  if (score >= 80) return { label: "Very High", color: "#16a34a", bg: "#f0fdf4" };
  if (score >= 60) return { label: "High", color: "#0891b2", bg: "#ecfeff" };
  if (score >= 40) return { label: "Medium", color: "#d97706", bg: "#fffbeb" };
  return { label: "Low", color: "#6b7280", bg: "#f9fafb" };
}

function MiniRing({ score, color }: { score: number; color: string }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  return (
    <svg width="44" height="44" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r={r} fill="none" stroke="var(--bg-tertiary)" strokeWidth="4" />
      <circle
        cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={circ} strokeDashoffset={offset}
        transform="rotate(-90 22 22)" strokeLinecap="round"
      />
      <text x="22" y="22" textAnchor="middle" dy="0.35em" fontSize="10" fontWeight="700" fill={color}>
        {score}
      </text>
    </svg>
  );
}

export function PitchBoardClient({ pitches: initial, hideHeader }: { pitches: Pitch[]; hideHeader?: boolean }) {
  const [pitches, setPitches] = useState<Pitch[]>(initial);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete pitch for "${name}"?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/pitch-board/pitches/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setPitches((prev) => prev.filter((p) => p.id !== id));
      toast.success("Pitch deleted");
    } catch {
      toast.error("Failed to delete pitch");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header — only shown when NOT embedded in tabs */}
      {!hideHeader && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold flex items-center gap-2.5" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                <div className="p-1.5 rounded-lg" style={{ background: "var(--brand-primary)", color: "white" }}>
                  <Sparkles className="h-5 w-5" />
                </div>
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
              {pitches.length} saved pitch{pitches.length !== 1 ? "es" : ""} — AI-generated deal intelligence for your prospects
            </p>
          </div>
          <Link href="/portal/admin/pitch-board/new">
            <Button className="gap-2 text-white font-semibold" style={{ background: "var(--brand-primary)" }}>
              <Plus className="h-4 w-4" /> Build New Pitch
            </Button>
          </Link>
        </div>
      )}

      {/* Stats bar */}
      {pitches.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Pitches", value: pitches.length, icon: Sparkles, color: "var(--brand-primary)" },
            { label: "Avg Deal Score", value: Math.round(pitches.reduce((a, p) => a + p.dealScore, 0) / pitches.length), icon: TrendingUp, color: "#059669", suffix: "%" },
            { label: "High Potential", value: pitches.filter((p) => p.dealScore >= 60).length, icon: TrendingUp, color: "#0891b2" },
            { label: "Pain Points Found", value: pitches.reduce((a, p) => a + p.painCount, 0), icon: TrendingUp, color: "#d97706" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl px-4 py-3"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
            >
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>{s.label}</p>
              <p className="text-2xl font-black" style={{ color: s.color, fontFamily: "var(--font-display)" }}>
                {s.value}{s.suffix ?? ""}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Pitch list */}
      {pitches.length === 0 ? (
        <div
          className="rounded-2xl p-16 flex flex-col items-center text-center"
          style={{ background: "var(--bg-primary)", border: "2px dashed var(--border)" }}
        >
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "var(--brand-primary)12" }}
          >
            <Sparkles className="h-10 w-10" style={{ color: "var(--brand-primary)" }} />
          </div>
          <h3 className="font-bold text-xl mb-2" style={{ color: "var(--text-primary)" }}>No pitches yet</h3>
          <p className="text-sm mb-6 max-w-sm" style={{ color: "var(--text-muted)" }}>
            Build your first AI-powered pitch — enter a prospect's business and website, and let the AI do the research.
          </p>
          <Link href="/portal/admin/pitch-board/new">
            <Button className="gap-2 text-white" style={{ background: "var(--brand-primary)" }}>
              <Plus className="h-4 w-4" /> Build Your First Pitch
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {pitches.map((pitch) => {
            const deal = dealLabel(pitch.dealScore);
            const secRisk = Math.max(0, 100 - pitch.securityScore);
            return (
              <div
                key={pitch.id}
                className="rounded-2xl overflow-hidden flex flex-col"
                style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
              >
                {/* Card header */}
                <div
                  className="px-5 py-4"
                  style={{ background: "var(--brand-primary)08", borderBottom: "1px solid var(--border)" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate" style={{ color: "var(--text-primary)" }}>
                        {pitch.businessName}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Globe className="h-3 w-3 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                        <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{pitch.websiteUrl}</p>
                      </div>
                    </div>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: deal.bg, color: deal.color }}
                    >
                      {deal.label}
                    </span>
                  </div>
                </div>

                {/* Score row */}
                <div className="px-5 py-4 grid grid-cols-3 gap-2 flex-1">
                  <div className="flex flex-col items-center gap-1">
                    <MiniRing score={Math.round(secRisk)} color={secRisk > 60 ? "#dc2626" : secRisk > 30 ? "#d97706" : "#16a34a"} />
                    <p className="text-[10px] text-center font-medium" style={{ color: "var(--text-muted)" }}>Security Risk</p>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <MiniRing score={pitch.dealScore} color="#0891b2" />
                    <p className="text-[10px] text-center font-medium" style={{ color: "var(--text-muted)" }}>Deal Score</p>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center font-black text-sm"
                      style={{ background: "#7c3aed20", color: "#7c3aed" }}
                    >
                      {pitch.painCount}
                    </div>
                    <p className="text-[10px] text-center font-medium" style={{ color: "var(--text-muted)" }}>Pain Points</p>
                  </div>
                </div>

                {/* Footer */}
                <div
                  className="px-5 py-3 flex items-center justify-between border-t"
                  style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}
                >
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" style={{ color: "var(--text-muted)" }} />
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {formatDate(new Date(pitch.createdAt))}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDelete(pitch.id, pitch.businessName)}
                      disabled={deletingId === pitch.id}
                      className="p-1.5 rounded-lg hover:opacity-80 transition-opacity"
                      style={{ color: "var(--error)" }}
                    >
                      {deletingId === pitch.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                    <Link href={`/portal/admin/pitch-board/${pitch.id}`}>
                      <button
                        className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                        style={{ background: "var(--brand-primary)", color: "white" }}
                      >
                        <ExternalLink className="h-3 w-3" /> View Pitch
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
