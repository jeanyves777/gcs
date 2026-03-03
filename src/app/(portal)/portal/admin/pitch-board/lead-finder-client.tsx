"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Search, MapPin, Star, Phone, Globe, ExternalLink, Loader2,
  ChevronDown, ChevronUp, FileDown, Sparkles, TrendingUp, AlertTriangle, CheckSquare, Square, X,
} from "lucide-react";

const LS_KEY = "gcs_lead_finder_state";
import { toast } from "sonner";
import type { LeadResult } from "@/app/api/admin/pitch-board/lead-finder/route";

type PastSearch = {
  id: string;
  query: string;
  location: string;
  resultsCount: number;
  createdAt: Date | string;
};

type SortKey = "dealPotential" | "rating_asc" | "rating_desc" | "reviews";

function StarRating({ rating }: { rating: number | null }) {
  if (rating === null) return <span style={{ color: "var(--text-muted)", fontSize: 12 }}>No rating</span>;
  return (
    <span className="flex items-center gap-1">
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{rating.toFixed(1)}</span>
    </span>
  );
}

function DealBadge({ score }: { score: number }) {
  const { label, bg, color } =
    score >= 70 ? { label: "High Opportunity", bg: "#fef2f2", color: "#dc2626" } :
    score >= 50 ? { label: "Medium Opportunity", bg: "#fffbeb", color: "#d97706" } :
    { label: "Low Opportunity", bg: "#f0fdf4", color: "#16a34a" };
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
      style={{ background: bg, color }}
    >
      {label}
    </span>
  );
}

function ResultCard({
  result,
  checked,
  alreadyPitched,
  onCheck,
  onCreatePitch,
}: {
  result: LeadResult;
  checked: boolean;
  alreadyPitched: boolean;
  onCheck: (id: string, checked: boolean) => void;
  onCreatePitch: (result: LeadResult) => void;
}) {
  return (
    <div
      className="rounded-xl px-5 py-4 flex flex-col gap-3"
      style={{
        background: "var(--bg-primary)",
        border: `1px solid ${checked ? "var(--brand-primary)" : "var(--border)"}`,
        transition: "border-color 0.15s",
        opacity: alreadyPitched ? 0.75 : 1,
      }}
    >
      {/* Top row */}
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={() => onCheck(result.placeId, !checked)}
          className="mt-0.5 flex-shrink-0"
          style={{ color: checked ? "var(--brand-primary)" : "var(--text-muted)" }}
        >
          {checked ? <CheckSquare className="h-4.5 w-4.5 h-5 w-5" /> : <Square className="h-5 w-5" />}
        </button>

        {/* Name + badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
              {result.name}
            </span>
            {alreadyPitched && (
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ background: "var(--brand-primary)18", color: "var(--brand-primary)" }}
              >
                Already Pitched
              </span>
            )}
            <DealBadge score={result.dealPotential} />
          </div>

          {/* Rating + reviews */}
          <div className="flex items-center gap-3 mt-1">
            <StarRating rating={result.rating} />
            {result.reviewCount !== null && (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                ({result.reviewCount.toLocaleString()} reviews)
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href={result.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
            style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
            title="Open in Google Maps"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <Button
            size="sm"
            onClick={() => onCreatePitch(result)}
            className="gap-1.5 text-white text-xs font-semibold"
            style={{ background: "var(--brand-primary)", height: 32 }}
          >
            <Sparkles className="h-3 w-3" /> Create Pitch
          </Button>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-8">
        {result.address && (
          <div className="flex items-start gap-1.5">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: "var(--text-muted)" }} />
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{result.address}</span>
          </div>
        )}
        {result.phone && (
          <div className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{result.phone}</span>
          </div>
        )}
        {result.website && (
          <div className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
            <a
              href={result.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs hover:underline truncate"
              style={{ color: "var(--brand-primary)" }}
            >
              {result.website.replace(/^https?:\/\/(www\.)?/, "")}
            </a>
          </div>
        )}
        {!result.website && (
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#d97706" }} />
            <span className="text-xs font-medium" style={{ color: "#d97706" }}>No website detected</span>
          </div>
        )}
      </div>

      {/* Categories */}
      {result.categories.length > 0 && (
        <div className="flex items-center gap-1.5 pl-8 flex-wrap">
          {result.categories.map((cat) => (
            <span
              key={cat}
              className="text-[11px] px-2 py-0.5 rounded-full"
              style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}
            >
              {cat}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function LeadFinderClient({
  initialSearches,
  pitchedUrls,
}: {
  initialSearches: PastSearch[];
  pitchedUrls: string[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LeadResult[]>([]);
  const [pastSearches, setPastSearches] = useState<PastSearch[]>(initialSearches);
  const [showPast, setShowPast] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortKey>("dealPotential");
  const [searched, setSearched] = useState(false);

  // ── Restore persisted results on mount ──────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { query: string; location: string; results: LeadResult[] };
      if (saved.results?.length) {
        setQuery(saved.query ?? "");
        setLocation(saved.location ?? "");
        setResults(saved.results);
        setSearched(true);
      }
    } catch { /* ignore */ }
  }, []);

  // ── Persist results to localStorage whenever they change ────────────────────
  useEffect(() => {
    if (results.length === 0) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ query, location, results }));
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);

  const handleClear = () => {
    setResults([]);
    setSearched(false);
    setSelected(new Set());
    setQuery("");
    setLocation("");
    try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
  };

  const pitchedSet = useMemo(() => new Set(pitchedUrls.map((u) => u.toLowerCase())), [pitchedUrls]);

  const sortedResults = useMemo(() => {
    const arr = [...results];
    if (sort === "dealPotential") return arr.sort((a, b) => b.dealPotential - a.dealPotential);
    if (sort === "rating_asc") return arr.sort((a, b) => (a.rating ?? 5) - (b.rating ?? 5));
    if (sort === "rating_desc") return arr.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    if (sort === "reviews") return arr.sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
    return arr;
  }, [results, sort]);

  const handleSearch = async () => {
    if (!query.trim() || !location.trim()) {
      toast.error("Enter an industry and location");
      return;
    }
    setLoading(true);
    setResults([]);
    setSelected(new Set());
    setSearched(false);
    try {
      const res = await fetch("/api/admin/pitch-board/lead-finder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), location: location.trim() }),
      });
      const data = await res.json() as { results?: LeadResult[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setResults(data.results ?? []);
      setSearched(true);
      // Refresh past searches list
      setPastSearches((prev) => [
        {
          id: Date.now().toString(),
          query: query.trim(),
          location: location.trim(),
          resultsCount: data.results?.length ?? 0,
          createdAt: new Date().toISOString(),
        },
        ...prev.slice(0, 19),
      ]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const toggleSelect = (placeId: string, val: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (val) next.add(placeId); else next.delete(placeId);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === sortedResults.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sortedResults.map((r) => r.placeId)));
    }
  };

  const handleCreatePitch = (result: LeadResult) => {
    const url = result.website ?? "";
    const params = new URLSearchParams();
    params.set("name", result.name);
    if (url) params.set("url", url);
    router.push(`/portal/admin/pitch-board/new?${params.toString()}`);
  };

  const handleExportCSV = () => {
    const rows = sortedResults.filter((r) => selected.size === 0 || selected.has(r.placeId));
    if (rows.length === 0) { toast.error("No results to export"); return; }
    const header = ["Name", "Rating", "Reviews", "Address", "Phone", "Website", "Categories", "Deal Potential", "Google Maps"];
    const lines = [
      header.join(","),
      ...rows.map((r) =>
        [
          `"${r.name.replace(/"/g, '""')}"`,
          r.rating ?? "",
          r.reviewCount ?? "",
          `"${(r.address ?? "").replace(/"/g, '""')}"`,
          r.phone ?? "",
          r.website ?? "",
          `"${r.categories.join("; ")}"`,
          r.dealPotential,
          r.mapsUrl,
        ].join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `leads-${query}-${location}-${new Date().toISOString().slice(0, 10)}.csv`.replace(/\s+/g, "-");
    a.click();
    toast.success(`Exported ${rows.length} leads`);
  };

  const handleRepeatSearch = (s: PastSearch) => {
    setQuery(s.query);
    setLocation(s.location);
  };

  const opportunityCount = results.filter((r) => r.dealPotential >= 50).length;

  return (
    <div className="space-y-5">
      {/* Search card */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
      >
        <div className="mb-4">
          <h2 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>Find Local Businesses</h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            Search Google Business listings by industry and location to discover pitch opportunities.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Industry input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Industry (e.g. tax services, restaurants, dentists)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl outline-none transition-all"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            />
          </div>
          {/* Location input */}
          <div className="flex-1 relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Location (e.g. Pittsfield, MA)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl outline-none transition-all"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={loading}
            className="gap-2 text-white font-semibold px-6"
            style={{ background: "var(--brand-primary)" }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loading ? "Searching..." : "Search"}
          </Button>
        </div>
      </div>

      {/* Results section */}
      {(searched || loading) && (
        <div className="space-y-3">
          {/* Results toolbar */}
          {!loading && results.length > 0 && (
            <div className="flex items-center justify-between flex-wrap gap-3">
              {/* Select all + count */}
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleAll}
                  className="flex items-center gap-2 text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {selected.size === sortedResults.length
                    ? <CheckSquare className="h-4 w-4" style={{ color: "var(--brand-primary)" }} />
                    : <Square className="h-4 w-4" />}
                  <span>{results.length} results</span>
                </button>
                {opportunityCount > 0 && (
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: "#fef2f2", color: "#dc2626" }}
                  >
                    <TrendingUp className="h-3 w-3 inline mr-1" />
                    {opportunityCount} opportunities
                  </span>
                )}
              </div>

              {/* Sort + actions */}
              <div className="flex items-center gap-2">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="text-xs px-3 py-1.5 rounded-lg outline-none"
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="dealPotential">Best Opportunities</option>
                  <option value="rating_asc">Lowest Rating First</option>
                  <option value="rating_desc">Highest Rating First</option>
                  <option value="reviews">Most Reviews</option>
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportCSV}
                  className="gap-1.5 text-xs"
                  style={{ height: 32 }}
                >
                  <FileDown className="h-3.5 w-3.5" />
                  Export {selected.size > 0 ? `(${selected.size})` : "CSV"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleClear}
                  className="gap-1.5 text-xs"
                  style={{ height: 32, color: "var(--error)", borderColor: "var(--error)" }}
                >
                  <X className="h-3.5 w-3.5" />
                  Clear
                </Button>
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div
              className="rounded-2xl p-12 flex flex-col items-center gap-3"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
            >
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--brand-primary)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                Searching Google Business listings...
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Fetching contact details for each business
              </p>
            </div>
          )}

          {/* No results */}
          {!loading && results.length === 0 && searched && (
            <div
              className="rounded-2xl p-12 flex flex-col items-center gap-3 text-center"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
            >
              <Search className="h-8 w-8" style={{ color: "var(--text-muted)" }} />
              <p className="font-medium" style={{ color: "var(--text-primary)" }}>No results found</p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Try a different industry or location
              </p>
            </div>
          )}

          {/* Results list */}
          {!loading && sortedResults.length > 0 && (
            <div className="space-y-2">
              {sortedResults.map((result) => (
                <ResultCard
                  key={result.placeId}
                  result={result}
                  checked={selected.has(result.placeId)}
                  alreadyPitched={!!result.website && pitchedSet.has(result.website.toLowerCase())}
                  onCheck={toggleSelect}
                  onCreatePitch={handleCreatePitch}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Past Searches */}
      {pastSearches.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
        >
          <button
            onClick={() => setShowPast((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:opacity-80 transition-opacity"
          >
            <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
              Past Searches ({pastSearches.length})
            </span>
            {showPast ? (
              <ChevronUp className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
            ) : (
              <ChevronDown className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
            )}
          </button>

          {showPast && (
            <div style={{ borderTop: "1px solid var(--border)" }}>
              {pastSearches.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleRepeatSearch(s)}
                  className="w-full flex items-center justify-between px-5 py-3 hover:opacity-80 transition-opacity text-left"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <div>
                    <span className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
                      {s.query}
                    </span>
                    <span className="text-sm mx-2" style={{ color: "var(--text-muted)" }}>·</span>
                    <span className="text-sm" style={{ color: "var(--text-muted)" }}>{s.location}</span>
                    <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>
                      {s.resultsCount} results
                    </span>
                  </div>
                  <span className="text-xs flex-shrink-0 ml-4" style={{ color: "var(--text-muted)" }}>
                    {new Date(s.createdAt).toLocaleDateString()}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
