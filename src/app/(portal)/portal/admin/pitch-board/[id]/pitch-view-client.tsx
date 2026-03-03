"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Copy, Check, Mail, Trash2, Loader2, Globe, Calendar, User2,
  Building2, Shield, Lightbulb, Target, Rocket, MessageSquare,
  ChevronDown, ChevronUp, X, Send, Server, Cloud, Code2, Sparkles, AlertTriangle,
  TrendingUp, CheckCircle2, Info, Quote, Share2, Lock, Wifi, Database, Terminal,
  Globe2, ShieldAlert, ShieldCheck, Search, MapPin, Phone, Clock, ExternalLink,
  Star, Building, Network,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type PortResult = { port: number; service: string; open: boolean; risk: "critical" | "high" | "medium" | "info" };
type SslInfo    = { valid: boolean; grade: "A" | "B" | "C" | "F"; expiryDate: string | null; daysUntilExpiry: number | null; issuer: string | null; selfSigned: boolean; tlsVersion: string | null; subjectCN: string | null; sans: string[] };
type DnsInfo    = { ipAddress: string | null; hasSpf: boolean; spfRecord: string | null; hasDmarc: boolean; dmarcPolicy: string | null; mxRecords: string[]; nameservers: string[] };
type PathProbe  = { path: string; statusCode: number | null; exposed: boolean };
type SubResult  = { subdomain: string; fqdn: string; resolves: boolean; ip: string | null };
type PentestResults = {
  domain: string; scannedAt: string; riskScore: number;
  ports: PortResult[]; ssl: SslInfo | null; dns: DnsInfo;
  cookies: { name: string; hasHttpOnly: boolean; hasSecure: boolean; sameSite: string | null }[];
  httpMethods: string[]; corsWildcard: boolean; hasSecurityTxt: boolean; httpToHttpsRedirect: boolean;
  paths: PathProbe[]; subdomains: SubResult[];
  criticalFindings: string[]; highFindings: string[];
};

// Business Intel types
type GoogleReviewBI = { rating: number; text: string; relativeTime: string; authorName: string };
type GoogleBPInfo = {
  found: boolean; name: string | null; rating: number | null; reviewCount: number | null;
  ratingBenchmark: number; address: string | null; phone: string | null; website: string | null;
  googleMapsUrl: string | null; isOpenNow: boolean | null; weekdayHours: string[] | null;
  categories: string[]; recentReviews: GoogleReviewBI[];
};
type WebMentionBI = { source: string; url: string | null; rating: number | null; reviewCount: number | null; found: boolean; snippet: string | null };
type DomainRegistryBI = { domain: string; registrar: string | null; registeredDate: string | null; expiryDate: string | null; domainAgeYears: number | null; nameservers: string[]; isPrivacyProtected: boolean };
type IpGeoBI = { ip: string; city: string | null; region: string | null; country: string | null; org: string | null; hosting: string | null };
type WebSearchMentionBI = { title: string; snippet: string; url: string };
type BusinessIntelData = {
  businessName: string; domain: string; searchedAt: string;
  google: GoogleBPInfo | null; yelp: WebMentionBI | null; bbb: WebMentionBI | null;
  otherMentions: WebMentionBI[];
  domainRegistry: DomainRegistryBI | null; ipGeo: IpGeoBI | null;
  webSearchMentions: WebSearchMentionBI[];
};

type Pitch = {
  id: string; businessName: string; websiteUrl: string; pitchText: string;
  securityScore: number; presenceScore: number; dealScore: number; painCount: number;
  pentestData?: string | null;
  businessIntelData?: string | null;
  emailsSent?: string | null;
  createdAt: Date; createdBy: { name: string | null; email: string };
};
type Section = { heading: string; content: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractBullets(content: string): string[] {
  return content.split("\n")
    .filter((l) => /^[-•*]\s+/.test(l.trim()) || /^\d+\.\s+/.test(l.trim()))
    .map((l) => l.replace(/^[-•*\d.]+\s+/, "").trim())
    .filter(Boolean);
}

function extractParagraphs(content: string): string[] {
  return content.split(/\n\n+/).map((p) => p.trim()).filter((p) => p && !p.split("\n").every((l) => /^[-•*\d]/.test(l.trim())));
}

function b(t: string): string {
  return t
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text-primary)">$1</strong>')
    .replace(/`(.+?)`/g, '<code style="background:var(--bg-tertiary);padding:1px 5px;border-radius:4px;font-size:12px;font-family:monospace">$1</code>');
}

function parseSections(text: string): Section[] {
  return text.split(/\n##\s+/).filter(Boolean).map((part) => {
    const nl = part.indexOf("\n");
    return nl === -1 ? { heading: part.trim(), content: "" } : { heading: part.slice(0, nl).trim(), content: part.slice(nl + 1).trim() };
  });
}

// ─── Digital Health Helpers ───────────────────────────────────────────────────

function computeDigitalHealth(securityScore: number, presenceScore: number, painCount: number): number {
  const techHealth = Math.max(0, 100 - painCount * 12);
  return Math.max(5, Math.min(95, Math.round(0.40 * securityScore + 0.40 * presenceScore + 0.20 * techHealth)));
}

function healthGrade(score: number): { label: string; color: string; bg: string; border: string } {
  if (score >= 76) return { label: "Strong",   color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" };
  if (score >= 61) return { label: "Good",     color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc" };
  if (score >= 46) return { label: "Fair",     color: "#d97706", bg: "#fffbeb", border: "#fde68a" };
  if (score >= 26) return { label: "Poor",     color: "#f97316", bg: "#fff7ed", border: "#fed7aa" };
  return              { label: "Critical", color: "#ef4444", bg: "#fef2f2", border: "#fecaca" };
}

// ─── Digital Health Ring ──────────────────────────────────────────────────────

function DigitalHealthRing({ score, color, size = 110 }: { score: number; color: string; size?: number }) {
  const stroke = 11;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(100, score)) / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-tertiary)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`} strokeLinecap="round" />
      <text x={size / 2} y={size / 2 - 4} textAnchor="middle" fontSize="22" fontWeight="800" fill={color}>{score}</text>
      <text x={size / 2} y={size / 2 + 13} textAnchor="middle" fontSize="10" fill="var(--text-muted)">/100</text>
    </svg>
  );
}

// ─── SVG Score Ring ───────────────────────────────────────────────────────────

function ScoreRing({ score, color, label, sublabel, size = 100 }: { score: number; color: string; label: string; sublabel?: string; size?: number }) {
  const r = 36; const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(100, score)) / 100);
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--bg-tertiary)" strokeWidth="7" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={circ} strokeDashoffset={offset} transform="rotate(-90 50 50)" strokeLinecap="round" />
        <text x="50" y="46" textAnchor="middle" fontSize="18" fontWeight="800" fill={color}>{score}</text>
        <text x="50" y="60" textAnchor="middle" fontSize="10" fill="var(--text-muted)">/100</text>
      </svg>
      <p className="text-xs font-bold text-center" style={{ color: "var(--text-primary)" }}>{label}</p>
      {sublabel && <p className="text-[10px] text-center" style={{ color: "var(--text-muted)" }}>{sublabel}</p>}
    </div>
  );
}

// ─── Metric Bar ───────────────────────────────────────────────────────────────

function MetricBar({ label, value, color, note }: { label: string; value: number; color: string; note?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{label}</span>
        <div className="flex items-center gap-2">
          {note && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: color + "20", color }}>{note}</span>}
          <span className="text-xs font-mono font-bold" style={{ color }}>{value}%</span>
        </div>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--bg-tertiary)" }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: `linear-gradient(90deg, ${color}aa, ${color})` }} />
      </div>
    </div>
  );
}

// ─── Section: Business Overview ───────────────────────────────────────────────

function OverviewSection({ content }: { content: string }) {
  const paras = extractParagraphs(content);
  const bullets = extractBullets(content);
  const icons = ["🏢", "📍", "👥", "💼", "🌐", "📊", "🔑", "📈"];
  return (
    <div className="space-y-4">
      {paras.slice(0, 1).map((p, i) => (
        <div key={i} className="rounded-xl p-4" style={{ background: "var(--brand-primary)08", borderLeft: "4px solid var(--brand-primary)" }}>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }} dangerouslySetInnerHTML={{ __html: b(p.replace(/\n/g, " ")) }} />
        </div>
      ))}
      {bullets.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {bullets.map((bullet, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
              <span className="text-lg flex-shrink-0 mt-0.5">{icons[i % icons.length]}</span>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }} dangerouslySetInnerHTML={{ __html: b(bullet) }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section: Digital Footprint ───────────────────────────────────────────────

function FootprintSection({ content, presenceScore }: { content: string; presenceScore: number }) {
  const bullets = extractBullets(content);
  const paras = extractParagraphs(content);
  const presColor = presenceScore > 65 ? "#16a34a" : presenceScore > 40 ? "#d97706" : "#dc2626";
  const presLabel = presenceScore > 65 ? "Strong Presence" : presenceScore > 40 ? "Moderate Presence" : "Weak Presence";

  // Split bullets into positive/negative by keywords
  const positive = bullets.filter(b => /strong|good|well|active|modern|professional|https|fast|secure|seo/i.test(b));
  const concern = bullets.filter(b => /missing|lack|no |poor|slow|outdated|basic|limited|weak|without/i.test(b));
  const neutral = bullets.filter(b => !positive.includes(b) && !concern.includes(b));

  return (
    <div className="space-y-4">
      {/* Presence score bar */}
      <div className="rounded-xl p-4 flex items-center gap-4" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Digital Presence Strength</span>
            <span className="text-sm font-bold px-2 py-0.5 rounded-full" style={{ background: presColor + "20", color: presColor }}>{presLabel}</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: "var(--bg-tertiary)" }}>
            <div className="h-full rounded-full" style={{ width: `${presenceScore}%`, background: `linear-gradient(90deg, ${presColor}80, ${presColor})` }} />
          </div>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{presenceScore}/100 — {presLabel}</p>
        </div>
      </div>

      {/* Summary paragraph */}
      {paras.slice(0, 1).map((p, i) => (
        <p key={i} className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }} dangerouslySetInnerHTML={{ __html: b(p.replace(/\n/g, " ")) }} />
      ))}

      {/* Positive / Concern split */}
      {(positive.length > 0 || concern.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {positive.length > 0 && (
            <div className="rounded-xl p-4 space-y-2" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#16a34a" }}>✅ Strengths</p>
              {positive.map((p, i) => <p key={i} className="text-xs leading-relaxed" style={{ color: "#166534" }} dangerouslySetInnerHTML={{ __html: b(p) }} />)}
            </div>
          )}
          {concern.length > 0 && (
            <div className="rounded-xl p-4 space-y-2" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#dc2626" }}>⚠️ Gaps Identified</p>
              {concern.map((p, i) => <p key={i} className="text-xs leading-relaxed" style={{ color: "#991b1b" }} dangerouslySetInnerHTML={{ __html: b(p) }} />)}
            </div>
          )}
        </div>
      )}
      {neutral.map((n, i) => (
        <div key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
          <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: "var(--text-muted)" }} />
          <span dangerouslySetInnerHTML={{ __html: b(n) }} />
        </div>
      ))}
    </div>
  );
}

// ─── Section: Security Assessment ─────────────────────────────────────────────

function SecuritySection({ content, securityScore }: { content: string; securityScore: number }) {
  const secRisk = 100 - securityScore;
  const riskColor = secRisk > 60 ? "#dc2626" : secRisk > 30 ? "#d97706" : "#16a34a";
  const riskLabel = secRisk > 60 ? "Critical Risk" : secRisk > 30 ? "High Risk" : "Low Risk";
  const paras = extractParagraphs(content);
  const bullets = extractBullets(content);
  const missing = bullets.filter(b => /❌|missing|no |without|lack/.test(b));
  const passing = bullets.filter(b => /✅|present|enabled|configured/.test(b));

  return (
    <div className="space-y-4">
      {/* Risk level callout */}
      <div className="rounded-xl p-4 flex items-center gap-4" style={{ background: riskColor + "10", border: `1px solid ${riskColor}40` }}>
        <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: riskColor + "20" }}>
          <AlertTriangle className="h-7 w-7" style={{ color: riskColor }} />
        </div>
        <div className="flex-1">
          <p className="font-bold" style={{ color: riskColor }}>{riskLabel} — {secRisk}% Exposed</p>
          <div className="mt-2 h-2.5 rounded-full overflow-hidden" style={{ background: "var(--bg-tertiary)" }}>
            <div className="h-full rounded-full" style={{ width: `${secRisk}%`, background: `linear-gradient(90deg, ${riskColor}80, ${riskColor})` }} />
          </div>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{securityScore}/100 security headers passing</p>
        </div>
      </div>

      {/* Summary */}
      {paras.slice(0, 1).map((p, i) => (
        <p key={i} className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }} dangerouslySetInnerHTML={{ __html: b(p.replace(/\n/g, " ")) }} />
      ))}

      {/* Issues grid */}
      {missing.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Vulnerabilities Identified</p>
          <div className="grid grid-cols-1 gap-2">
            {missing.map((issue, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "#dc2626", minWidth: 20 }}>
                  <span className="text-white font-bold" style={{ fontSize: 10 }}>{i + 1}</span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "#991b1b" }} dangerouslySetInnerHTML={{ __html: b(issue.replace(/❌\s*/g, "")) }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* What's OK */}
      {passing.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {passing.map((p, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}>
              ✅ {p.replace(/✅\s*/g, "").split("—")[0].trim()}
            </span>
          ))}
        </div>
      )}

      {/* Remaining bullets */}
      {bullets.filter(b => !missing.includes(b) && !passing.includes(b)).map((b2, i) => (
        <p key={i} className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }} dangerouslySetInnerHTML={{ __html: b(b2) }} />
      ))}
    </div>
  );
}

// ─── Section: Pain Points ─────────────────────────────────────────────────────

const PAIN_COLORS = ["#dc2626", "#ea580c", "#d97706", "#ca8a04", "#16a34a", "#0891b2"];
const PAIN_SEVERITY = ["Critical", "High", "Medium-High", "Medium", "Moderate", "Low"];

function PainPointsSection({ content }: { content: string }) {
  const bullets = extractBullets(content);
  const paras = extractParagraphs(content);

  return (
    <div className="space-y-4">
      {paras.slice(0, 1).map((p, i) => (
        <p key={i} className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }} dangerouslySetInnerHTML={{ __html: b(p.replace(/\n/g, " ")) }} />
      ))}

      <div className="space-y-2.5">
        {bullets.map((pain, i) => {
          const color = PAIN_COLORS[Math.min(i, PAIN_COLORS.length - 1)];
          const severity = PAIN_SEVERITY[Math.min(i, PAIN_SEVERITY.length - 1)];
          return (
            <div key={i} className="rounded-xl p-4 flex items-start gap-3"
              style={{ background: `${color}08`, border: `1px solid ${color}25` }}>
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm text-white"
                  style={{ background: color, minWidth: 32 }}>
                  {i + 1}
                </div>
                <span className="text-[9px] font-bold uppercase" style={{ color, letterSpacing: "0.05em" }}>{severity}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }} dangerouslySetInnerHTML={{ __html: b(pain) }} />
                {/* Subtle impact bar */}
                <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-tertiary)" }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.max(30, 100 - i * 14)}%`, background: color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Section: GCS Service Recommendations ─────────────────────────────────────

const SERVICE_MAP: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  "managed it":  { icon: Server,    color: "#1565C0", bg: "#eff6ff" },
  "cybersecuri": { icon: Shield,    color: "#dc2626", bg: "#fef2f2" },
  "cloud":       { icon: Cloud,     color: "#0891b2", bg: "#ecfeff" },
  "software dev":{ icon: Code2,     color: "#7c3aed", bg: "#f5f3ff" },
  "ai integrat": { icon: Sparkles,  color: "#c026d3", bg: "#fdf4ff" },
  "enterprise":  { icon: Building2, color: "#d97706", bg: "#fffbeb" },
  "default":     { icon: Target,    color: "#16a34a", bg: "#f0fdf4" },
};

function getServiceStyle(name: string) {
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(SERVICE_MAP)) {
    if (lower.includes(key)) return val;
  }
  return SERVICE_MAP.default;
}

function ServicesSection({ content }: { content: string }) {
  const bullets = extractBullets(content);
  const paras = extractParagraphs(content);

  return (
    <div className="space-y-4">
      {paras.slice(0, 1).map((p, i) => (
        <p key={i} className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }} dangerouslySetInnerHTML={{ __html: b(p.replace(/\n/g, " ")) }} />
      ))}

      <div className="grid grid-cols-1 gap-3">
        {bullets.map((service, i) => {
          // Format: "**Service Name** — Because [finding] → [outcome]"
          // Or: "Service Name — detail"
          const cleanService = service.replace(/\*\*/g, "").trim();
          // Extract service name (before em dash, colon, or " — ")
          const dashIdx = cleanService.search(/\s[—–]\s|:\s/);
          const namePart = dashIdx > 0 ? cleanService.slice(0, dashIdx).trim() : cleanService.split(/[,]/)[0].trim();
          const { icon: Icon, color, bg } = getServiceStyle(namePart);
          const detail = dashIdx > 0 ? cleanService.slice(dashIdx).replace(/^[\s—–:\s]+/, "").trim() : "";

          // Split on " → " to get "Because [finding]" and "[outcome]"
          const [findingPart, outcomePart] = detail.split(/\s*→\s*/);
          const percentMatch = service.match(/(\d+)%/);
          const dollarMatch = service.match(/\$[\d,]+/);

          return (
            <div key={i} className="rounded-xl p-4 space-y-3" style={{ background: bg, border: `1px solid ${color}30` }}>
              {/* Service name header */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: color + "20" }}>
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
                <div className="flex-1">
                  <p className="font-black text-sm" style={{ color }}>{namePart}</p>
                  {/* Impact badges */}
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {percentMatch && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: color + "20", color }}>
                        ~{percentMatch[1]}% impact
                      </span>
                    )}
                    {dollarMatch && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: color + "20", color }}>
                        {dollarMatch[0]}
                      </span>
                    )}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: color + "20", color }}>
                      #{i + 1} priority
                    </span>
                  </div>
                </div>
              </div>

              {/* Finding trigger (why this service) */}
              {findingPart && (
                <div className="rounded-lg px-3 py-2" style={{ background: color + "10", borderLeft: `3px solid ${color}` }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: color + "cc" }}>Finding Trigger</p>
                  <p className="text-xs leading-relaxed" style={{ color: "#374151" }} dangerouslySetInnerHTML={{ __html: b(findingPart.replace(/^because\s*/i, "")) }} />
                </div>
              )}

              {/* Outcome */}
              {outcomePart && (
                <div className="flex items-start gap-2">
                  <TrendingUp className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color }} />
                  <p className="text-xs leading-relaxed font-medium" style={{ color: "#166534" }} dangerouslySetInnerHTML={{ __html: b(outcomePart) }} />
                </div>
              )}

              {/* Fallback detail (if no arrow format) */}
              {!findingPart && detail && (
                <p className="text-xs leading-relaxed" style={{ color: "#374151" }} dangerouslySetInnerHTML={{ __html: b(detail) }} />
              )}

              {/* Impact bar */}
              {percentMatch && (
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: color + "20" }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min(Number(percentMatch[1]), 100)}%`, background: color }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Section: The Pitch ───────────────────────────────────────────────────────

function ThePitchSection({ content, businessName }: { content: string; businessName: string }) {
  const paras = extractParagraphs(content);

  return (
    <div className="space-y-5">
      {/* Executive header */}
      <div className="rounded-xl px-5 py-4 flex items-center gap-3"
        style={{ background: "linear-gradient(135deg, var(--brand-primary)12 0%, #7c3aed12 100%)", border: "1px solid var(--brand-primary)25" }}>
        <Rocket className="h-6 w-6 flex-shrink-0" style={{ color: "var(--brand-primary)" }} />
        <div>
          <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Executive Pitch — {businessName}</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Ready to deliver on a sales call or send via email</p>
        </div>
      </div>

      {/* First paragraph — the hook */}
      {paras.length > 0 && (
        <div className="rounded-xl p-5 relative" style={{ background: "var(--brand-primary)08", border: "1px solid var(--brand-primary)20" }}>
          <Quote className="h-8 w-8 absolute -top-3 -left-2 opacity-20" style={{ color: "var(--brand-primary)" }} />
          <p className="text-base leading-relaxed font-medium italic" style={{ color: "var(--text-primary)" }}
            dangerouslySetInnerHTML={{ __html: b(paras[0].replace(/\n/g, " ")) }} />
        </div>
      )}

      {/* Remaining paragraphs */}
      {paras.slice(1).map((para, i) => {
        const isLast = i === paras.length - 2;
        return (
          <div key={i} className={`rounded-xl p-4 ${isLast ? "border-l-4" : ""}`}
            style={{
              background: isLast ? "#f0fdf4" : "var(--bg-secondary)",
              border: isLast ? "1px solid #bbf7d0" : "1px solid var(--border)",
              borderLeftColor: isLast ? "#16a34a" : undefined,
              borderLeftWidth: isLast ? 4 : undefined,
            }}>
            {isLast && (
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4" style={{ color: "#16a34a" }} />
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#16a34a" }}>Call to Action</p>
              </div>
            )}
            <p className="text-sm leading-relaxed" style={{ color: isLast ? "#166534" : "var(--text-secondary)" }}
              dangerouslySetInnerHTML={{ __html: b(para.replace(/\n/g, " ")) }} />
          </div>
        );
      })}
    </div>
  );
}

// ─── Section: Deal Talking Points ─────────────────────────────────────────────

function TalkingPointsSection({ content }: { content: string }) {
  const bullets = extractBullets(content);
  const colors = ["#1565C0", "#7c3aed", "#dc2626", "#d97706", "#16a34a", "#0891b2", "#db2777"];

  return (
    <div className="space-y-3">
      <div className="rounded-xl p-3" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          💡 Use these one-liners in your next sales call, email, or meeting with this prospect.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {bullets.map((point, i) => {
          const color = colors[i % colors.length];
          return (
            <div key={i} className="rounded-xl p-4 flex items-start gap-3"
              style={{ background: `${color}06`, border: `1px solid ${color}25` }}>
              <div className="flex-shrink-0 mt-0.5">
                <Quote className="h-5 w-5" style={{ color: color + "80" }} />
              </div>
              <p className="text-sm leading-relaxed font-medium" style={{ color: "var(--text-primary)" }}
                dangerouslySetInnerHTML={{ __html: b(point) }} />
              <div className="flex-shrink-0 ml-auto">
                <span className="text-[10px] font-black px-2 py-1 rounded-full" style={{ background: color + "20", color }}>#{i + 1}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Smart Section Renderer ───────────────────────────────────────────────────

function SmartSectionCard({
  section, index, pitch, pentestResults,
}: {
  section: Section; index: number; pitch: Pitch; pentestResults: PentestResults | null;
}) {
  const [expanded, setExpanded] = useState(true);
  const lower = section.heading.toLowerCase();

  const accent = ["#1565C0","#7c3aed","#dc2626","#d97706","#059669","#0891b2","#db2777","#0f766e"][index % 8];
  const Icon = lower.includes("business") ? Building2
    : lower.includes("digital") ? Globe
    : lower.includes("security") && !lower.includes("penetration") ? Shield
    : lower.includes("penetration") || lower.includes("pentest") ? ShieldAlert
    : lower.includes("pain") ? Lightbulb
    : lower.includes("gcs") || lower.includes("service") ? Target
    : lower.includes("pitch") ? Rocket
    : MessageSquare;

  const renderBody = () => {
    if (lower.includes("business")) return <OverviewSection content={section.content} />;
    if (lower.includes("digital")) return <FootprintSection content={section.content} presenceScore={pitch.presenceScore} />;
    if (lower.includes("security") && !lower.includes("penetration")) return <SecuritySection content={section.content} securityScore={pitch.securityScore} />;
    if (lower.includes("penetration") || lower.includes("pentest")) {
      return pentestResults
        ? <PentestCard pentest={pentestResults} />
        : <DefaultSection content={section.content} />;
    }
    if (lower.includes("pain")) return <PainPointsSection content={section.content} />;
    if (lower.includes("gcs") || lower.includes("service") || lower.includes("recommend")) return <ServicesSection content={section.content} />;
    if (lower.includes("pitch")) return <ThePitchSection content={section.content} businessName={pitch.businessName} />;
    if (lower.includes("talking") || lower.includes("deal")) return <TalkingPointsSection content={section.content} />;
    return <DefaultSection content={section.content} />;
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg-primary)" }}>
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        style={{ background: `${accent}10`, borderBottom: expanded ? `1px solid ${accent}20` : "none" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${accent}20` }}>
            <Icon className="h-4.5 w-4.5" style={{ color: accent }} />
          </div>
          <div>
            <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{section.heading}</span>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
              {lower.includes("business") ? "Company profile & market position" :
               lower.includes("digital") ? "Web presence & technology assessment" :
               lower.includes("penetration") || lower.includes("pentest") ? "Automated port scan, SSL, DNS & path reconnaissance" :
               lower.includes("security") ? "Vulnerability analysis & risk score" :
               lower.includes("pain") ? "Identified business challenges" :
               lower.includes("gcs") || lower.includes("service") ? "AI-tailored GCS solutions based on findings" :
               lower.includes("pitch") ? "Executive-ready sales pitch" :
               "Conversation starters for your sales team"}
            </p>
          </div>
        </div>
        {expanded
          ? <ChevronUp className="h-4 w-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
          : <ChevronDown className="h-4 w-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />}
      </button>
      {expanded && <div className="p-5">{renderBody()}</div>}
    </div>
  );
}

// ─── Default Section (fallback) ────────────────────────────────────────────────

function DefaultSection({ content }: { content: string }) {
  const bullets = extractBullets(content);
  const paras = extractParagraphs(content);
  return (
    <div className="space-y-3">
      {paras.map((p, i) => (
        <p key={i} className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }} dangerouslySetInnerHTML={{ __html: b(p.replace(/\n/g, " ")) }} />
      ))}
      {bullets.length > 0 && (
        <ul className="space-y-2">
          {bullets.map((bullet, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: "var(--brand-primary)", minWidth: 6 }} />
              <span className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }} dangerouslySetInnerHTML={{ __html: b(bullet) }} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Section: Pentest Findings ────────────────────────────────────────────────

const PORT_RISK_COLORS: Record<string, string> = {
  critical: "#dc2626",
  high:     "#f97316",
  medium:   "#d97706",
  info:     "#0891b2",
};

const SSL_GRADE_COLORS: Record<string, string> = { A: "#16a34a", B: "#0891b2", C: "#d97706", F: "#dc2626" };

function PentestCard({ pentest }: { pentest: PentestResults }) {
  const riskColor   = pentest.riskScore > 60 ? "#dc2626" : pentest.riskScore > 30 ? "#f97316" : "#16a34a";
  const riskLabel   = pentest.riskScore > 60 ? "Critical Risk" : pentest.riskScore > 30 ? "High Risk" : pentest.riskScore > 15 ? "Medium Risk" : "Low Risk";
  const openPorts   = pentest.ports.filter((p) => p.open);
  const closedPorts = pentest.ports.filter((p) => !p.open);
  const exposedPaths = pentest.paths.filter((p) => p.exposed);
  const blockedPaths = pentest.paths.filter((p) => p.statusCode === 403);
  const activeSubdomains = pentest.subdomains.filter((s) => s.resolves);

  const sslGrade = pentest.ssl?.grade ?? null;
  const sslColor = sslGrade ? SSL_GRADE_COLORS[sslGrade] : "#9ca3af";

  return (
    <div className="space-y-5">
      {/* Header row: risk score + critical count */}
      <div className="rounded-xl p-4 flex items-center gap-4" style={{ background: riskColor + "10", border: `1px solid ${riskColor}30` }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: riskColor + "20" }}>
          <ShieldAlert className="h-8 w-8" style={{ color: riskColor }} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-black text-lg" style={{ color: riskColor }}>{riskLabel}</p>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: riskColor + "20", color: riskColor }}>
              {pentest.riskScore}/100
            </span>
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {pentest.criticalFindings.length} critical · {pentest.highFindings.length} high · {openPorts.length} open ports · scanned {new Date(pentest.scannedAt).toLocaleDateString()}
          </p>
          <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-tertiary)" }}>
            <div className="h-full rounded-full" style={{ width: `${pentest.riskScore}%`, background: `linear-gradient(90deg, ${riskColor}80, ${riskColor})` }} />
          </div>
        </div>
      </div>

      {/* Critical findings */}
      {pentest.criticalFindings.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#dc2626" }}>Critical Findings</p>
          {pentest.criticalFindings.map((f, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl p-3" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
              <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0 mt-0.5" style={{ minWidth: 20 }}>
                <span className="text-white font-bold" style={{ fontSize: 9 }}>!</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "#991b1b" }}>{f}</p>
            </div>
          ))}
        </div>
      )}

      {/* High findings */}
      {pentest.highFindings.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#f97316" }}>High Severity Findings</p>
          {pentest.highFindings.map((f, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl p-3" style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}>
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "#f97316" }} />
              <p className="text-xs leading-relaxed" style={{ color: "#92400e" }}>{f}</p>
            </div>
          ))}
        </div>
      )}

      {/* Port scan results */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Port Scan</p>
          <span className="text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>
            {openPorts.length} open / {pentest.ports.length} scanned
          </span>
        </div>
        {openPorts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {openPorts.map((p) => (
              <span key={p.port} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold"
                style={{ background: PORT_RISK_COLORS[p.risk] + "15", color: PORT_RISK_COLORS[p.risk], border: `1px solid ${PORT_RISK_COLORS[p.risk]}40` }}>
                <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: PORT_RISK_COLORS[p.risk] }} />
                {p.port} {p.service}
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {closedPorts.slice(0, 12).map((p) => (
            <span key={p.port} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium"
              style={{ background: "var(--bg-secondary)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
              ✅ {p.port}
            </span>
          ))}
        </div>
      </div>

      {/* SSL + DNS in 2-col grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* SSL Card */}
        <div className="rounded-xl p-4 space-y-2" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4" style={{ color: sslColor }} />
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>SSL/TLS Certificate</p>
          </div>
          {pentest.ssl ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-lg font-black px-2 py-0.5 rounded" style={{ color: sslColor, background: sslColor + "15" }}>
                  Grade {pentest.ssl.grade}
                </span>
                <span className="text-xs" style={{ color: pentest.ssl.valid ? "#16a34a" : "#dc2626" }}>
                  {pentest.ssl.valid ? "✅ Valid" : "❌ Invalid"}
                </span>
              </div>
              {pentest.ssl.daysUntilExpiry !== null && (
                <p className="text-xs" style={{ color: pentest.ssl.daysUntilExpiry < 14 ? "#dc2626" : pentest.ssl.daysUntilExpiry < 30 ? "#f97316" : "var(--text-secondary)" }}>
                  {pentest.ssl.daysUntilExpiry < 0 ? "⚠️ EXPIRED" : `Expires in ${pentest.ssl.daysUntilExpiry} days`}
                </p>
              )}
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>TLS: {pentest.ssl.tlsVersion ?? "Unknown"}</p>
              {pentest.ssl.selfSigned && <p className="text-xs font-semibold" style={{ color: "#dc2626" }}>⚠️ Self-signed certificate</p>}
              {pentest.ssl.issuer && <p className="text-xs" style={{ color: "var(--text-muted)" }}>Issuer: {pentest.ssl.issuer}</p>}
            </div>
          ) : (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>SSL analysis unavailable</p>
          )}
        </div>

        {/* DNS Security */}
        <div className="rounded-xl p-4 space-y-2" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4" style={{ color: "var(--brand-primary)" }} />
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>DNS Security</p>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              {pentest.dns.hasSpf
                ? <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                : <ShieldAlert className="h-3.5 w-3.5 text-red-600" />}
              <span className="text-xs" style={{ color: pentest.dns.hasSpf ? "#16a34a" : "#dc2626" }}>
                SPF: {pentest.dns.hasSpf ? "Configured" : "MISSING — spoofing risk"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {pentest.dns.hasDmarc
                ? <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                : <ShieldAlert className="h-3.5 w-3.5 text-red-600" />}
              <span className="text-xs" style={{ color: pentest.dns.hasDmarc ? "#16a34a" : "#dc2626" }}>
                DMARC: {pentest.dns.hasDmarc ? `policy=${pentest.dns.dmarcPolicy ?? "set"}` : "MISSING — phishing risk"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {pentest.httpToHttpsRedirect
                ? <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                : <ShieldAlert className="h-3.5 w-3.5 text-orange-500" />}
              <span className="text-xs" style={{ color: pentest.httpToHttpsRedirect ? "#16a34a" : "#f97316" }}>
                HTTP→HTTPS: {pentest.httpToHttpsRedirect ? "Redirected" : "No redirect"}
              </span>
            </div>
            {pentest.dns.ipAddress && (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>IP: {pentest.dns.ipAddress}</p>
            )}
            {pentest.dns.mxRecords.length > 0 && (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>MX: {pentest.dns.mxRecords[0]}</p>
            )}
          </div>
        </div>
      </div>

      {/* Sensitive paths */}
      {(exposedPaths.length > 0 || blockedPaths.length > 0) && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Sensitive Path Probe</p>
          <div className="flex flex-wrap gap-1.5">
            {exposedPaths.map((p) => (
              <span key={p.path} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold"
                style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
                🔴 {p.path} <span style={{ opacity: 0.7 }}>({p.statusCode})</span>
              </span>
            ))}
            {blockedPaths.map((p) => (
              <span key={p.path} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a" }}>
                🟡 {p.path} <span style={{ opacity: 0.7 }}>(403)</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Subdomains found */}
      {activeSubdomains.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Active Subdomains ({activeSubdomains.length} discovered)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {activeSubdomains.map((s) => (
              <span key={s.fqdn} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: "#eff6ff", color: "#1565C0", border: "1px solid #bfdbfe" }}>
                <Globe2 className="h-3 w-3" />
                {s.fqdn}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Cookie security */}
      {pentest.cookies.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Cookie Security</p>
          <div className="space-y-1">
            {pentest.cookies.slice(0, 5).map((c, i) => (
              <div key={i} className="flex items-center gap-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                <span className="font-mono font-semibold" style={{ color: "var(--text-primary)", minWidth: 120 }}>{c.name}</span>
                <span style={{ color: c.hasHttpOnly ? "#16a34a" : "#dc2626" }}>{c.hasHttpOnly ? "✅" : "❌"} HttpOnly</span>
                <span style={{ color: c.hasSecure ? "#16a34a" : "#dc2626" }}>{c.hasSecure ? "✅" : "❌"} Secure</span>
                <span style={{ color: "var(--text-muted)" }}>SameSite: {c.sameSite ?? "missing"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scan metadata */}
      <div className="flex flex-wrap gap-3 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
        {[
          { icon: Wifi, label: `${openPorts.length} open ports`, color: openPorts.length > 0 ? "#dc2626" : "#16a34a" },
          { icon: Lock, label: `SSL ${pentest.ssl?.grade ?? "N/A"}`, color: sslColor },
          { icon: Search, label: `${activeSubdomains.length} subdomains`, color: "#0891b2" },
          { icon: Terminal, label: pentest.corsWildcard ? "CORS *" : "CORS ok", color: pentest.corsWildcard ? "#f97316" : "#16a34a" },
        ].map(({ icon: Icon, label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5" style={{ color }} />
            <span className="text-xs font-semibold" style={{ color }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Business Intel Card ──────────────────────────────────────────────────────

function StarRow({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size}
          fill={i <= Math.round(rating) ? "#f59e0b" : "none"}
          style={{ color: i <= Math.round(rating) ? "#f59e0b" : "#d1d5db" }} />
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: GoogleReviewBI }) {
  const [expanded, setExpanded] = useState(false);
  const short = review.text.length > 160;
  const text = short && !expanded ? review.text.slice(0, 160) + "…" : review.text;
  return (
    <div className="rounded-xl p-3 space-y-1.5" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between">
        <StarRow rating={review.rating} size={13} />
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{review.relativeTime}</span>
      </div>
      <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{review.authorName}</p>
      <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{text}</p>
      {short && (
        <button className="text-[10px] font-semibold" style={{ color: "var(--brand-primary)" }}
          onClick={() => setExpanded(!expanded)}>
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}

function BusinessIntelCard({ bi }: { bi: BusinessIntelData }) {
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showAllHours, setShowAllHours] = useState(false);
  const gbp = bi.google;
  const found = bi.otherMentions.filter((m) => m.found);
  const missing = bi.otherMentions.filter((m) => !m.found);
  const reviews = gbp?.recentReviews ?? [];
  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 2);

  const ratingPct = gbp?.rating ? (gbp.rating / 5) * 100 : 0;
  const benchmarkPct = gbp ? (gbp.ratingBenchmark / 5) * 100 : 0;
  const aboveBenchmark = gbp?.rating != null && gbp.rating >= gbp.ratingBenchmark;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
      <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
        <Building className="h-4 w-4" style={{ color: "#1565C0" }} />
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#1565C0" }}>
          Business Intelligence & Online Registry
        </p>
      </div>

      <div className="p-5 space-y-5">
        {/* Google Business Profile */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Google Business Profile</p>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: gbp?.found ? "#f0fdf4" : "#fef2f2", color: gbp?.found ? "#16a34a" : "#dc2626", border: `1px solid ${gbp?.found ? "#bbf7d0" : "#fecaca"}` }}>
              {gbp?.found ? "✅ Listed" : "❌ Not Found"}
            </span>
          </div>

          {gbp?.found && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
              {/* Rating row */}
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <StarRow rating={gbp.rating ?? 0} size={18} />
                    <span className="text-xl font-black" style={{ color: "#f59e0b" }}>{gbp.rating?.toFixed(1)}</span>
                    <span className="text-sm" style={{ color: "var(--text-muted)" }}>/ 5.0</span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {gbp.reviewCount?.toLocaleString()} reviews · Benchmark: {gbp.ratingBenchmark}/5
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                    style={{ background: aboveBenchmark ? "#f0fdf4" : "#fef2f2", color: aboveBenchmark ? "#16a34a" : "#dc2626", border: `1px solid ${aboveBenchmark ? "#bbf7d0" : "#fecaca"}` }}>
                    {aboveBenchmark ? "✅ Above benchmark" : `❌ ${(gbp.ratingBenchmark - (gbp.rating ?? 0)).toFixed(1)} below benchmark`}
                  </span>
                  {gbp.isOpenNow !== null && (
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full text-center"
                      style={{ background: gbp.isOpenNow ? "#f0fdf4" : "#fef2f2", color: gbp.isOpenNow ? "#16a34a" : "#dc2626", border: `1px solid ${gbp.isOpenNow ? "#bbf7d0" : "#fecaca"}` }}>
                      {gbp.isOpenNow ? "🟢 Open Now" : "🔴 Closed Now"}
                    </span>
                  )}
                </div>
              </div>

              {/* Rating vs benchmark bar */}
              <div className="space-y-1">
                <div className="h-2 rounded-full overflow-hidden relative" style={{ background: "var(--bg-tertiary)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${ratingPct}%`, background: aboveBenchmark ? "#16a34a" : "#f59e0b" }} />
                  {/* Benchmark marker */}
                  <div className="absolute top-0 bottom-0 w-0.5" style={{ left: `${benchmarkPct}%`, background: "#1565C0" }} />
                </div>
                <div className="flex justify-between text-[10px]" style={{ color: "var(--text-muted)" }}>
                  <span>0</span>
                  <span style={{ color: "#1565C0" }}>▲ Industry avg {gbp.ratingBenchmark}</span>
                  <span>5.0</span>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-1 gap-2">
                {gbp.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: "var(--text-muted)" }} />
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{gbp.address}</span>
                  </div>
                )}
                {gbp.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{gbp.phone}</span>
                  </div>
                )}
                {gbp.googleMapsUrl && (
                  <a href={gbp.googleMapsUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs font-semibold"
                    style={{ color: "#1565C0" }}>
                    <ExternalLink className="h-3.5 w-3.5" />
                    View on Google Maps
                  </a>
                )}
              </div>

              {/* Hours */}
              {gbp.weekdayHours && gbp.weekdayHours.length > 0 && (
                <div className="space-y-1">
                  <button className="flex items-center gap-1.5 text-xs font-semibold"
                    style={{ color: "var(--text-muted)" }} onClick={() => setShowAllHours(!showAllHours)}>
                    <Clock className="h-3.5 w-3.5" />
                    Business Hours
                    {showAllHours ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                  {showAllHours && (
                    <div className="rounded-lg p-2.5 space-y-0.5" style={{ background: "var(--bg-tertiary)" }}>
                      {gbp.weekdayHours.map((h, i) => (
                        <p key={i} className="text-xs" style={{ color: "var(--text-secondary)" }}>{h}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reviews */}
        {reviews.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Recent Google Reviews ({reviews.length})
            </p>
            <div className="space-y-2">
              {displayedReviews.map((r, i) => <ReviewCard key={i} review={r} />)}
            </div>
            {reviews.length > 2 && (
              <button className="text-xs font-semibold" style={{ color: "var(--brand-primary)" }}
                onClick={() => setShowAllReviews(!showAllReviews)}>
                {showAllReviews ? "Show fewer reviews" : `Show all ${reviews.length} reviews`}
              </button>
            )}
          </div>
        )}

        {/* Directory presence */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Directory & Platform Presence</p>
          <div className="grid grid-cols-2 gap-2">
            {bi.yelp && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ background: bi.yelp.found ? "#f0fdf4" : "#fef2f2", border: `1px solid ${bi.yelp.found ? "#bbf7d0" : "#fecaca"}` }}>
                <span className="text-xs font-semibold" style={{ color: bi.yelp.found ? "#16a34a" : "#dc2626" }}>
                  {bi.yelp.found ? "✅" : "❌"} Yelp
                </span>
                {bi.yelp.rating && <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{bi.yelp.rating}/5</span>}
              </div>
            )}
            {bi.bbb && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ background: bi.bbb.found ? "#f0fdf4" : "#fef2f2", border: `1px solid ${bi.bbb.found ? "#bbf7d0" : "#fecaca"}` }}>
                <span className="text-xs font-semibold" style={{ color: bi.bbb.found ? "#16a34a" : "#dc2626" }}>
                  {bi.bbb.found ? "✅" : "❌"} BBB
                </span>
                {bi.bbb.snippet && <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{bi.bbb.snippet}</span>}
              </div>
            )}
          </div>
          {bi.otherMentions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {found.map((m) => (
                <a key={m.source} href={m.url ?? "#"} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}>
                  ✅ {m.source}
                </a>
              ))}
              {missing.slice(0, 6).map((m) => (
                <span key={m.source}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                  ❌ {m.source}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Domain & Infrastructure */}
        {(bi.domainRegistry || bi.ipGeo) && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Domain & Infrastructure</p>
            <div className="rounded-xl p-3 space-y-2" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
              {bi.domainRegistry && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {[
                    { label: "Domain Age", value: bi.domainRegistry.domainAgeYears != null ? `${bi.domainRegistry.domainAgeYears} years` : "Unknown" },
                    { label: "Registered", value: bi.domainRegistry.registeredDate ?? "Unknown" },
                    { label: "Expires", value: bi.domainRegistry.expiryDate ?? "Unknown" },
                    { label: "Registrar", value: bi.domainRegistry.registrar ?? "Unknown" },
                    { label: "Privacy Shield", value: bi.domainRegistry.isPrivacyProtected ? "Yes" : "No (exposed)" },
                    { label: "Nameservers", value: bi.domainRegistry.nameservers.slice(0, 2).join(", ") || "Unknown" },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-[10px] font-semibold uppercase" style={{ color: "var(--text-muted)" }}>{label}</p>
                      <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{value}</p>
                    </div>
                  ))}
                </div>
              )}
              {bi.ipGeo && (
                <div className="pt-2 border-t flex flex-wrap gap-3" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-1.5">
                    <Network className="h-3.5 w-3.5" style={{ color: "var(--text-muted)" }} />
                    <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                      {bi.ipGeo.hosting ?? bi.ipGeo.org ?? "Unknown hosting"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" style={{ color: "var(--text-muted)" }} />
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      {[bi.ipGeo.city, bi.ipGeo.region, bi.ipGeo.country].filter(Boolean).join(", ") || "Unknown location"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Web search mentions */}
        {bi.webSearchMentions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Web Search Mentions</p>
            <div className="space-y-2">
              {bi.webSearchMentions.map((m, i) => (
                <div key={i} className="rounded-xl p-3" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{m.snippet}</p>
                  {m.url && (
                    <a href={m.url} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] font-semibold mt-1 inline-block"
                      style={{ color: "var(--brand-primary)" }}>
                      {m.url.slice(0, 60)}{m.url.length > 60 ? "…" : ""}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Parse security headers ────────────────────────────────────────────────────

function parseSecurityHeaders(pitchText: string): Array<{ name: string; present: boolean }> {
  const secMatch = pitchText.match(/## 🔒 Security Assessment([\s\S]*?)(?=\n##|$)/);
  if (!secMatch) return [];
  const headers: Array<{ name: string; present: boolean }> = [];
  for (const line of secMatch[1].split("\n")) {
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

// ─── Email modal ───────────────────────────────────────────────────────────────

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
        body: JSON.stringify({
          recipientEmail: email.trim(),
          businessName: pitch.businessName,
          pitchText: pitch.pitchText,
          pitchId: pitch.id,
          securityScore: pitch.securityScore,
          presenceScore: pitch.presenceScore,
          dealScore: pitch.dealScore,
          businessIntelData: pitch.businessIntelData,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast.success(`Pitch email sent to ${email}`);
      onClose();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); setSending(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" style={{ color: "var(--brand-primary)" }} />
            <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Send Pitch to Prospect</h3>
          </div>
          <button onClick={onClose}><X className="h-4 w-4" style={{ color: "var(--text-muted)" }} /></button>
        </div>
        <div className="rounded-xl p-3" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-primary)" }}>What will be sent:</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            A professional consulting email from <strong>GCS Technology Consulting</strong> with our tailored pitch for <strong>{pitch.businessName}</strong>, including a "Book a Consultation" call-to-action. No mention of AI analysis.
          </p>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Prospect&apos;s Email Address</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="decision-maker@company.com"
            className="w-full rounded-lg px-3 py-2.5 text-sm outline-none border"
            style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
          <Button size="sm" className="flex-1 gap-1.5 text-white" style={{ background: "var(--brand-primary)" }} onClick={handleSend} disabled={sending}>
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {sending ? "Sending..." : "Send Pitch Email"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function PitchViewClient({ pitch }: { pitch: Pitch }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const sections = parseSections(pitch.pitchText);
  const headers = parseSecurityHeaders(pitch.pitchText);

  // Parse stored pentest JSON
  const pentestResults: PentestResults | null = (() => {
    if (!pitch.pentestData) return null;
    try { return JSON.parse(pitch.pentestData) as PentestResults; } catch { return null; }
  })();

  // Parse stored business intel JSON
  const businessIntel: BusinessIntelData | null = (() => {
    if (!pitch.businessIntelData) return null;
    try { return JSON.parse(pitch.businessIntelData) as BusinessIntelData; } catch { return null; }
  })();

  // Parse email send history
  const emailsSentLog: Array<{ email: string; sentAt: string }> = (() => {
    if (!pitch.emailsSent) return [];
    try { return JSON.parse(pitch.emailsSent); } catch { return []; }
  })();
  const secRisk = Math.max(0, 100 - pitch.securityScore);
  const riskColor = secRisk > 60 ? "#dc2626" : secRisk > 30 ? "#d97706" : "#16a34a";
  const dealColor = pitch.dealScore >= 80 ? "#16a34a" : pitch.dealScore >= 60 ? "#0891b2" : pitch.dealScore >= 40 ? "#d97706" : "#6b7280";
  const dealLabel = pitch.dealScore >= 80 ? "Very High" : pitch.dealScore >= 60 ? "High" : pitch.dealScore >= 40 ? "Medium" : "Low";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(pitch.pitchText);
    setCopied(true); toast.success("Pitch copied");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareLink = async () => {
    const url = `https://www.itatgcs.com/consulting/${pitch.id}`;
    await navigator.clipboard.writeText(url);
    setLinkCopied(true); toast.success("Landing page link copied!");
    setTimeout(() => setLinkCopied(false), 2500);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete pitch for "${pitch.businessName}"?`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/admin/pitch-board/pitches/${pitch.id}`, { method: "DELETE" });
      toast.success("Pitch deleted");
      router.push("/portal/admin/pitch-board");
    } catch { toast.error("Failed"); setDeleting(false); }
  };

  return (
    <div className="space-y-6">

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Link href="/portal/admin/pitch-board">
          <Button variant="ghost" size="sm" className="gap-1.5" style={{ color: "var(--text-muted)" }}>
            <ArrowLeft className="h-4 w-4" /> Pitch Board
          </Button>
        </Link>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowEmail(true)}>
            <Mail className="h-3.5 w-3.5" /> Email Prospect
          </Button>
          <Button
            variant="outline" size="sm" className="gap-1.5 text-xs font-semibold"
            style={{ borderColor: "var(--brand-primary)", color: "var(--brand-primary)" }}
            onClick={handleShareLink}
          >
            {linkCopied ? <><Check className="h-3.5 w-3.5" /> Link Copied!</> : <><Share2 className="h-3.5 w-3.5" /> Share Landing Page</>}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleCopy}>
            {copied ? <><Check className="h-3.5 w-3.5" /> Copied!</> : <><Copy className="h-3.5 w-3.5" /> Copy Pitch</>}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs"
            style={{ color: "var(--error)", borderColor: "var(--error)" }}
            onClick={handleDelete} disabled={deleting}>
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Delete
          </Button>
        </div>
      </div>

      {/* Hero banner */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <div className="px-8 py-7 flex items-start justify-between flex-wrap gap-4"
          style={{ background: "linear-gradient(135deg, var(--brand-primary) 0%, #7c3aed 100%)" }}>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-2 inline-block"
              style={{ background: "rgba(255,255,255,0.2)", color: "white" }}>
              GCS Deal Intelligence
            </span>
            <h1 className="text-3xl font-black mt-1" style={{ color: "white", fontFamily: "var(--font-display)" }}>
              {pitch.businessName}
            </h1>
            <div className="flex flex-wrap gap-4 mt-2">
              {[
                { icon: Globe, text: pitch.websiteUrl },
                { icon: Calendar, text: formatDate(new Date(pitch.createdAt)) },
                { icon: User2, text: pitch.createdBy.name ?? pitch.createdBy.email },
              ].map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.65)" }} />
                  <span className="text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl px-6 py-4 text-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.15)" }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.7)" }}>Deal Potential</p>
            <p className="text-4xl font-black" style={{ color: "white", fontFamily: "var(--font-display)" }}>{dealLabel}</p>
            <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.7)" }}>Score: {pitch.dealScore}/100</p>
          </div>
        </div>

        {/* Score rings */}
        <div className="px-8 py-6 grid grid-cols-2 sm:grid-cols-4 gap-6 border-b" style={{ borderColor: "var(--border)", background: "var(--bg-primary)" }}>
          <ScoreRing score={secRisk} color={riskColor} label="Security Risk"
            sublabel={secRisk > 60 ? "Critical — GCS Urgency" : secRisk > 30 ? "High — Act Now" : "Low"} />
          <ScoreRing score={pitch.dealScore} color={dealColor} label="Deal Potential" sublabel={dealLabel} />
          <ScoreRing score={pitch.presenceScore} color="#7c3aed" label="Digital Presence"
            sublabel={pitch.presenceScore > 65 ? "Strong" : pitch.presenceScore > 40 ? "Moderate" : "Weak"} />
          <div className="flex flex-col items-center gap-2">
            <div className="relative w-24 h-24 flex items-center justify-center"
              style={{ borderRadius: "50%", background: "#7c3aed12", border: "7px solid var(--bg-tertiary)" }}>
              <span className="text-2xl font-black" style={{ color: "#7c3aed" }}>{pitch.painCount}</span>
            </div>
            <p className="text-xs font-bold text-center" style={{ color: "var(--text-primary)" }}>Pain Points</p>
            <p className="text-[10px] text-center" style={{ color: "var(--text-muted)" }}>
              {pitch.painCount >= 5 ? "High opportunity" : pitch.painCount >= 3 ? "Good opportunity" : "Some opportunity"}
            </p>
          </div>
        </div>

        {/* Metric bars */}
        <div className="px-8 py-6 border-b" style={{ borderColor: "var(--border)", background: "var(--bg-primary)" }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>Intelligence Summary</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MetricBar label="Security Risk Exposure" value={secRisk} color={riskColor}
              note={secRisk > 60 ? "Critical" : secRisk > 30 ? "High" : "Low"} />
            <MetricBar label="Deal Potential" value={pitch.dealScore} color={dealColor} note={dealLabel} />
            <MetricBar label="Digital Presence Strength" value={pitch.presenceScore} color="#7c3aed"
              note={pitch.presenceScore > 65 ? "Strong" : "Needs Work"} />
            <MetricBar label="GCS Opportunity Score"
              value={Math.min(97, Math.round(0.5 * secRisk + 0.5 * Math.min(pitch.painCount * 14, 100)))}
              color="#0891b2" note="Composite" />
          </div>
        </div>

        {/* Digital Health Score */}
        {(() => {
          const healthScore = computeDigitalHealth(pitch.securityScore, pitch.presenceScore, pitch.painCount);
          const grade = healthGrade(healthScore);
          const techHealth = Math.max(0, 100 - pitch.painCount * 12);
          const subMetrics = [
            { label: "Security Health", value: pitch.securityScore, color: pitch.securityScore > 60 ? "#16a34a" : pitch.securityScore > 30 ? "#d97706" : "#ef4444" },
            { label: "Digital Presence", value: pitch.presenceScore, color: pitch.presenceScore > 65 ? "#0891b2" : pitch.presenceScore > 40 ? "#d97706" : "#ef4444" },
            { label: "Technology Efficiency", value: Math.max(5, Math.min(95, techHealth)), color: techHealth > 60 ? "#16a34a" : techHealth > 30 ? "#d97706" : "#ef4444" },
          ];
          return (
            <div className="px-8 py-6 border-b" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>Digital Health Score</p>
              <div className="flex flex-col sm:flex-row items-start gap-6">
                {/* Ring + grade */}
                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                  <DigitalHealthRing score={healthScore} color={grade.color} size={110} />
                  <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: grade.bg, color: grade.color, border: `1.5px solid ${grade.border}` }}>
                    {grade.label}
                  </span>
                </div>
                {/* Sub-metrics */}
                <div className="flex-1 w-full space-y-3">
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    Composite score across security, presence &amp; efficiency
                  </p>
                  {subMetrics.map(({ label, value, color }) => (
                    <MetricBar key={label} label={label} value={value} color={color} />
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Security headers */}
        {headers.length > 0 && (
          <div className="px-8 py-5 border-b" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Security Headers Audit
              </p>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: riskColor + "20", color: riskColor }}>
                {headers.filter((h) => h.present).length}/{headers.length} passing
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {headers.map((h) => (
                <span key={h.name}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{
                    background: h.present ? "#f0fdf4" : "#fef2f2",
                    color: h.present ? "#16a34a" : "#dc2626",
                    border: `1px solid ${h.present ? "#bbf7d0" : "#fecaca"}`,
                  }}>
                  {h.present ? "✅" : "❌"} {h.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Email send log */}
      {emailsSentLog.length > 0 && (
        <div className="rounded-2xl px-5 py-4" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Mail className="h-4 w-4" style={{ color: "#0891b2" }} />
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#0891b2" }}>
              Pitch Sent To ({emailsSentLog.length})
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {emailsSentLog.map((log, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{ background: "#ecfeff", border: "1px solid #a5f3fc" }}>
                <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "#0891b2" }} />
                <span className="text-xs font-semibold" style={{ color: "#164e63" }}>{log.email}</span>
                <span className="text-[10px]" style={{ color: "#0891b2" }}>
                  {new Date(log.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Business Intel Card */}
      {businessIntel && <BusinessIntelCard bi={businessIntel} />}

      {/* Pitch sections */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
          Full Intelligence Report — {sections.length} sections {pentestResults ? `· Pentest Risk: ${pentestResults.riskScore}/100` : ""}
        </p>
        <div className="space-y-3">
          {sections.map((section, i) => (
            <SmartSectionCard key={i} section={section} index={i} pitch={pitch} pentestResults={pentestResults} />
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="rounded-2xl px-6 py-5 flex items-center justify-between flex-wrap gap-3"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
        <div>
          <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Ready to close this deal?</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Send a professional consulting email directly to {pitch.businessName}.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" className="gap-2 text-white" style={{ background: "var(--brand-primary)" }} onClick={() => setShowEmail(true)}>
            <Mail className="h-4 w-4" /> Email the Prospect
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
