"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, Eye, Clock, ArrowUpRight, ArrowDownRight, Globe, Monitor, Smartphone,
  Tablet, MousePointer, BarChart3, TrendingUp, ExternalLink, RefreshCw,
  Activity, Fingerprint, MapPin, Chrome, Layers, Percent,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Overview {
  totalVisitors: number;
  totalPageViews: number;
  totalSessions: number;
  newVisitors: number;
  returningVisitors: number;
  avgSessionDuration: number;
  bounceRate: number;
}

interface TopItem { path?: string; referrer?: string; views?: number; count?: number }
interface BreakdownItem { browser?: string; os?: string; deviceType?: string; country?: string; countryCode?: string; count: number }
interface DailyItem { day: string; views: number }

interface VisitorData {
  id: string;
  fingerprint: string;
  firstSeen: string;
  lastSeen: string;
  totalVisits: number;
  totalPageViews: number;
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  deviceType?: string;
  screenWidth?: number;
  screenHeight?: number;
  language?: string;
  timezone?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  firstReferrer?: string;
  firstUtmSource?: string;
  firstUtmMedium?: string;
  firstUtmCampaign?: string;
  tags?: string;
  lastSession?: {
    ip: string;
    startedAt: string;
    entryPage: string;
    duration: number;
    pageCount: number;
    referrer?: string;
    utmSource?: string;
  };
}

interface AnalyticsData {
  overview: Overview;
  topPages: TopItem[];
  topReferrers: TopItem[];
  devices: BreakdownItem[];
  browsers: BreakdownItem[];
  operatingSystems: BreakdownItem[];
  countries: BreakdownItem[];
  dailyPageViews: DailyItem[];
  visitors: VisitorData[];
  pagination: { page: number; perPage: number; total: number; totalPages: number };
  range: string;
}

type TimeRange = "24h" | "7d" | "30d" | "90d" | "all";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

function timeAgo(date: string): string {
  const ms = Date.now() - new Date(date).getTime();
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

const deviceIcon = (type?: string) => {
  if (type === "mobile") return <Smartphone className="w-3.5 h-3.5" />;
  if (type === "tablet") return <Tablet className="w-3.5 h-3.5" />;
  return <Monitor className="w-3.5 h-3.5" />;
};

const COLORS = ["#3b82f6", "#8b5cf6", "#06b6d4", "#f59e0b", "#ef4444", "#22c55e", "#ec4899", "#f97316"];

// ─── Mini Bar Chart (SVG) ───────────────────────────────────────────────────

function BarChartSVG({ data, height = 120 }: { data: DailyItem[]; height?: number }) {
  if (!data.length) return <div className="text-xs text-center py-8" style={{ color: "var(--text-muted)" }}>No data yet</div>;
  const maxViews = Math.max(...data.map(d => d.views), 1);
  const barWidth = Math.max(8, Math.min(32, (600 - data.length * 2) / data.length));
  const totalWidth = data.length * (barWidth + 2);

  return (
    <svg viewBox={`0 0 ${totalWidth} ${height + 20}`} className="w-full" style={{ maxHeight: height + 30 }}>
      {data.map((d, i) => {
        const barH = (d.views / maxViews) * height;
        const x = i * (barWidth + 2);
        return (
          <g key={i}>
            <rect x={x} y={height - barH} width={barWidth} height={barH} rx={2}
              fill="var(--brand-primary)" opacity={0.8} />
            <title>{d.day}: {d.views} views</title>
            {i % Math.max(1, Math.floor(data.length / 7)) === 0 && (
              <text x={x + barWidth / 2} y={height + 14} textAnchor="middle"
                fontSize={8} fill="var(--text-muted)">{d.day.slice(5)}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Donut Chart ────────────────────────────────────────────────────────────

function DonutChart({ items, size = 100 }: { items: { label: string; value: number; color: string }[]; size?: number }) {
  const total = items.reduce((s, i) => s + i.value, 0);
  if (total === 0) return null;
  const radius = size / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {items.map((item, i) => {
        const pct = item.value / total;
        const dashLength = pct * circumference;
        const dashOffset = -offset * circumference;
        offset += pct;
        return (
          <circle key={i} cx={size / 2} cy={size / 2} r={radius} fill="none"
            stroke={item.color} strokeWidth={12} strokeDasharray={`${dashLength} ${circumference}`}
            strokeDashoffset={dashOffset} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        );
      })}
      <text x={size / 2} y={size / 2 - 4} textAnchor="middle" fontSize={16} fontWeight="bold"
        fill="var(--text-primary)">{formatNumber(total)}</text>
      <text x={size / 2} y={size / 2 + 12} textAnchor="middle" fontSize={9}
        fill="var(--text-muted)">total</text>
    </svg>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [range, setRange] = useState<TimeRange>("7d");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorData | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?range=${range}&page=${page}`);
      if (res.ok) setData(await res.json());
    } catch { }
    setLoading(false);
  }, [range, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const o = data?.overview;

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">
      {/* ═══ HEADER ═══════════════════════════════════════════════════════ */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
        <div className="h-1" style={{ background: "linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4)" }} />
        <div className="p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}>
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Visitor Analytics</h1>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {o ? `${formatNumber(o.totalVisitors)} visitors tracked` : "Loading..."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(["24h", "7d", "30d", "90d", "all"] as TimeRange[]).map(r => (
              <button key={r} onClick={() => { setRange(r); setPage(1); }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: range === r ? "var(--brand-primary)" : "var(--bg-secondary)",
                  color: range === r ? "#fff" : "var(--text-secondary)",
                }}>
                {r === "all" ? "All" : r}
              </button>
            ))}
            <Button size="sm" variant="outline" onClick={fetchData} disabled={loading} className="ml-2">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* ═══ KPI CARDS ═══════════════════════════════════════════════════ */}
      {o && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <KPICard icon={Users} label="Visitors" value={formatNumber(o.totalVisitors)} color="#3b82f6" />
          <KPICard icon={Eye} label="Page Views" value={formatNumber(o.totalPageViews)} color="#8b5cf6" />
          <KPICard icon={Activity} label="Sessions" value={formatNumber(o.totalSessions)} color="#06b6d4" />
          <KPICard icon={ArrowUpRight} label="New" value={formatNumber(o.newVisitors)} color="#22c55e" />
          <KPICard icon={ArrowDownRight} label="Returning" value={formatNumber(o.returningVisitors)} color="#f59e0b" />
          <KPICard icon={Clock} label="Avg Duration" value={formatDuration(o.avgSessionDuration)} color="#ec4899" />
          <KPICard icon={Percent} label="Bounce Rate" value={`${o.bounceRate}%`} color="#ef4444" />
        </div>
      )}

      {/* ═══ PAGE VIEWS CHART ════════════════════════════════════════════ */}
      {data && (
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
          <div className="px-5 py-4 flex items-center gap-2.5 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(59,130,246,0.1)" }}>
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Page Views Over Time</h3>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Daily page view trend</p>
            </div>
          </div>
          <div className="p-5">
            <BarChartSVG data={data.dailyPageViews} height={140} />
          </div>
        </div>
      )}

      {/* ═══ BREAKDOWN PANELS (2-col) ════════════════════════════════════ */}
      {data && (
        <div className="grid md:grid-cols-2 gap-5">
          {/* Top Pages */}
          <Panel icon={MousePointer} title="Top Pages" subtitle="Most viewed pages" color="#3b82f6">
            {data.topPages.length === 0 ? <EmptyState /> : data.topPages.map((p, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-2.5 border-t" style={{ borderColor: "var(--border)" }}>
                <span className="w-5 text-center text-[10px] font-bold rounded-full" style={{ color: "var(--text-muted)" }}>#{i + 1}</span>
                <span className="flex-1 text-xs font-mono truncate">{p.path}</span>
                <Badge variant="secondary" className="text-[10px]">{formatNumber(p.views || 0)}</Badge>
              </div>
            ))}
          </Panel>

          {/* Top Referrers */}
          <Panel icon={ExternalLink} title="Top Referrers" subtitle="Traffic sources" color="#8b5cf6">
            {data.topReferrers.length === 0 ? <EmptyState /> : data.topReferrers.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-2.5 border-t" style={{ borderColor: "var(--border)" }}>
                <span className="w-5 text-center text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>#{i + 1}</span>
                <span className="flex-1 text-xs truncate">{r.referrer || "Direct"}</span>
                <Badge variant="secondary" className="text-[10px]">{formatNumber(r.count || 0)}</Badge>
              </div>
            ))}
          </Panel>

          {/* Devices */}
          <Panel icon={Monitor} title="Devices" subtitle="Device type breakdown" color="#06b6d4">
            <div className="p-5 flex items-center gap-6">
              <DonutChart items={data.devices.map((d, i) => ({ label: d.deviceType || "?", value: d.count, color: COLORS[i % COLORS.length] }))} />
              <div className="flex-1 space-y-2">
                {data.devices.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="flex items-center gap-1.5">{deviceIcon(d.deviceType)} {d.deviceType || "Unknown"}</span>
                    <span className="ml-auto font-semibold">{d.count}</span>
                  </div>
                ))}
                {data.devices.length === 0 && <EmptyState />}
              </div>
            </div>
          </Panel>

          {/* Browsers */}
          <Panel icon={Chrome} title="Browsers" subtitle="Browser distribution" color="#f59e0b">
            <div className="p-5 flex items-center gap-6">
              <DonutChart items={data.browsers.map((b, i) => ({ label: b.browser || "?", value: b.count, color: COLORS[i % COLORS.length] }))} />
              <div className="flex-1 space-y-2">
                {data.browsers.map((b, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span>{b.browser || "Unknown"}</span>
                    <span className="ml-auto font-semibold">{b.count}</span>
                  </div>
                ))}
                {data.browsers.length === 0 && <EmptyState />}
              </div>
            </div>
          </Panel>

          {/* OS */}
          <Panel icon={Layers} title="Operating Systems" subtitle="OS distribution" color="#22c55e">
            <div className="p-5 flex items-center gap-6">
              <DonutChart items={data.operatingSystems.map((o, i) => ({ label: o.os || "?", value: o.count, color: COLORS[i % COLORS.length] }))} />
              <div className="flex-1 space-y-2">
                {data.operatingSystems.map((o, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span>{o.os || "Unknown"}</span>
                    <span className="ml-auto font-semibold">{o.count}</span>
                  </div>
                ))}
                {data.operatingSystems.length === 0 && <EmptyState />}
              </div>
            </div>
          </Panel>

          {/* Countries */}
          <Panel icon={Globe} title="Countries" subtitle="Geographic distribution" color="#ef4444">
            {data.countries.length === 0 ? <div className="p-5"><EmptyState /></div> : (
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {data.countries.map((c, i) => {
                  const maxCount = data.countries[0]?.count || 1;
                  const pct = Math.round((c.count / maxCount) * 100);
                  return (
                    <div key={i} className="relative px-5 py-2.5">
                      <div className="absolute left-0 top-0 bottom-0 rounded-r" style={{ width: `${pct}%`, background: `${COLORS[i % COLORS.length]}08` }} />
                      <div className="relative flex items-center gap-3">
                        <span className="text-base">{countryFlag(c.countryCode)}</span>
                        <span className="flex-1 text-xs">{c.country}</span>
                        <span className="text-xs font-semibold">{c.count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* ═══ VISITOR LIST ════════════════════════════════════════════════ */}
      {data && (
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
          <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(236,72,153,0.1)" }}>
                <Fingerprint className="w-4 h-4 text-pink-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Visitor Profiles</h3>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  {data.pagination.total} total visitors &middot; Page {data.pagination.page}/{data.pagination.totalPages || 1}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <Button size="sm" variant="outline" disabled={page >= (data.pagination.totalPages || 1)} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>

          {/* Desktop table header */}
          <div className="hidden md:grid grid-cols-[1fr_120px_100px_80px_80px_100px_80px] gap-2 px-5 py-2 text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--text-muted)", background: "var(--bg-secondary)" }}>
            <span>Visitor</span>
            <span>Location</span>
            <span>Device</span>
            <span>Pages</span>
            <span>Visits</span>
            <span>Last Seen</span>
            <span>Source</span>
          </div>

          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {data.visitors.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>No visitors tracked yet. Data will appear after visitors browse the site.</div>
            ) : data.visitors.map((v) => (
              <div key={v.id} className="group cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors"
                onClick={() => setSelectedVisitor(selectedVisitor?.id === v.id ? null : v)}>
                {/* Row */}
                <div className="grid md:grid-cols-[1fr_120px_100px_80px_80px_100px_80px] gap-2 px-5 py-3 items-center">
                  {/* Visitor */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold"
                      style={{ background: `${stringToColor(v.fingerprint)}20`, color: stringToColor(v.fingerprint) }}>
                      {v.fingerprint.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-mono truncate" style={{ maxWidth: "180px" }}>{v.fingerprint.slice(0, 16)}...</div>
                      <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        {v.lastSession?.ip || "No IP"} {v.browser && `| ${v.browser}`}
                      </div>
                    </div>
                  </div>
                  {/* Location */}
                  <div className="flex items-center gap-1 text-xs">
                    {v.countryCode && <span>{countryFlag(v.countryCode)}</span>}
                    <span className="truncate">{v.city || v.country || "Unknown"}</span>
                  </div>
                  {/* Device */}
                  <div className="flex items-center gap-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                    {deviceIcon(v.deviceType)}
                    <span>{v.os || "?"}</span>
                  </div>
                  {/* Pages */}
                  <span className="text-xs font-semibold">{v.totalPageViews}</span>
                  {/* Visits */}
                  <span className="text-xs">{v.totalVisits}</span>
                  {/* Last seen */}
                  <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{timeAgo(v.lastSeen)}</span>
                  {/* Source */}
                  <span className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>
                    {v.firstUtmSource || v.firstReferrer?.replace(/https?:\/\/(www\.)?/, "").split("/")[0] || "Direct"}
                  </span>
                </div>

                {/* Expanded detail card */}
                {selectedVisitor?.id === v.id && (
                  <div className="px-5 pb-4">
                    <div className="rounded-lg p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs"
                      style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                      <div>
                        <div className="font-semibold mb-2" style={{ color: "var(--text-muted)" }}>Device Info</div>
                        <div className="space-y-1">
                          <div>Browser: <strong>{v.browser} {v.browserVersion}</strong></div>
                          <div>OS: <strong>{v.os} {v.osVersion}</strong></div>
                          <div>Screen: <strong>{v.screenWidth}x{v.screenHeight}</strong></div>
                          <div>Language: <strong>{v.language}</strong></div>
                          <div>Timezone: <strong>{v.timezone}</strong></div>
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold mb-2" style={{ color: "var(--text-muted)" }}>Location</div>
                        <div className="space-y-1">
                          <div>IP: <strong className="font-mono">{v.lastSession?.ip || "N/A"}</strong></div>
                          <div>Country: <strong>{v.country || "N/A"} {v.countryCode && countryFlag(v.countryCode)}</strong></div>
                          <div>Region: <strong>{v.region || "N/A"}</strong></div>
                          <div>City: <strong>{v.city || "N/A"}</strong></div>
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold mb-2" style={{ color: "var(--text-muted)" }}>Marketing</div>
                        <div className="space-y-1">
                          <div>First Referrer: <strong>{v.firstReferrer || "Direct"}</strong></div>
                          <div>UTM Source: <strong>{v.firstUtmSource || "None"}</strong></div>
                          <div>UTM Medium: <strong>{v.firstUtmMedium || "None"}</strong></div>
                          <div>UTM Campaign: <strong>{v.firstUtmCampaign || "None"}</strong></div>
                          <div>First Visit: <strong>{new Date(v.firstSeen).toLocaleDateString()}</strong></div>
                          <div>Last Entry: <strong>{v.lastSession?.entryPage || "N/A"}</strong></div>
                        </div>
                      </div>
                      <div className="sm:col-span-2 lg:col-span-3">
                        <div className="font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Fingerprint (Device ID)</div>
                        <div className="font-mono text-[11px] break-all p-2 rounded" style={{ background: "var(--bg-primary)" }}>{v.fingerprint}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function KPICard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl p-3.5" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${color}14` }}>
          <Icon className="w-3 h-3" style={{ color }} />
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</span>
      </div>
      <div className="text-lg font-bold" style={{ color }}>{value}</div>
    </div>
  );
}

function Panel({ icon: Icon, title, subtitle, color, children }: {
  icon: React.ElementType; title: string; subtitle: string; color: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
      <div className="px-5 py-4 flex items-center gap-2.5 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}14` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function EmptyState() {
  return <div className="px-5 py-6 text-center text-xs" style={{ color: "var(--text-muted)" }}>No data yet</div>;
}

function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 65%, 50%)`;
}

function countryFlag(code?: string): string {
  if (!code || code.length !== 2) return "";
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1f1e6 + c.charCodeAt(0) - 65));
}
