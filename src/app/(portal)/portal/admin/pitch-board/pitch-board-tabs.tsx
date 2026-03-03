"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Plus, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PitchBoardClient } from "./pitch-board-client";
import { LeadFinderClient } from "./lead-finder-client";

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

type PastSearch = {
  id: string;
  query: string;
  location: string;
  resultsCount: number;
  createdAt: Date | string;
};

type Tab = "pitches" | "leads";

export function PitchBoardTabs({
  pitches,
  leadSearches,
  pitchedUrls,
}: {
  pitches: Pitch[];
  leadSearches: PastSearch[];
  pitchedUrls: string[];
}) {
  const [tab, setTab] = useState<Tab>("pitches");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
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
            {tab === "pitches"
              ? `${pitches.length} saved pitch${pitches.length !== 1 ? "es" : ""} — AI-generated deal intelligence`
              : "Find and qualify local businesses as pitch prospects"}
          </p>
        </div>
        {tab === "pitches" && (
          <Link href="/portal/admin/pitch-board/new">
            <Button className="gap-2 text-white font-semibold" style={{ background: "var(--brand-primary)" }}>
              <Plus className="h-4 w-4" /> Build New Pitch
            </Button>
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b" style={{ borderColor: "var(--border)" }}>
        {(["pitches", "leads"] as Tab[]).map((t) => {
          const active = tab === t;
          const Icon = t === "pitches" ? Sparkles : Map;
          const label = t === "pitches" ? "My Pitches" : "Lead Finder";
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors relative"
              style={{
                color: active ? "var(--brand-primary)" : "var(--text-muted)",
                borderBottom: active ? "2px solid var(--brand-primary)" : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              <Icon className="h-4 w-4" />
              {label}
              {t === "pitches" && pitches.length > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-0.5"
                  style={{ background: "var(--brand-primary)18", color: "var(--brand-primary)" }}
                >
                  {pitches.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === "pitches" ? (
        <PitchBoardClient pitches={pitches} hideHeader />
      ) : (
        <LeadFinderClient initialSearches={leadSearches} pitchedUrls={pitchedUrls} />
      )}
    </div>
  );
}
