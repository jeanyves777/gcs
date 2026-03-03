"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  AlertTriangle, Shield, TrendingUp, Globe, ChevronDown, CheckCircle, Loader2,
  Send, Phone, Mail, User, MessageSquare, Lock, ShieldCheck, ShieldAlert,
  FileText, Link as LinkIcon, Monitor, Key, Server, Zap, Smartphone, Cloud,
  Settings, BarChart3, Wrench, Laptop, Code, Cpu, Building2, Lightbulb, Clock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
  brandLogoUrl?: string | null;
  createdAt: string;
};

// ─── Icon lookup ─────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  "shield-check": ShieldCheck,
  "lock": Lock,
  "shield-alert": ShieldAlert,
  "file-text": FileText,
  "link": LinkIcon,
  "server": Server,
  "shield": Shield,
  "zap": Zap,
  "smartphone": Smartphone,
  "globe": Globe,
  "cloud": Cloud,
  "settings": Settings,
  "bar-chart": BarChart3,
  "wrench": Wrench,
  "alert-triangle": AlertTriangle,
  "laptop": Laptop,
  "monitor": Monitor,
  "code": Code,
  "cpu": Cpu,
  "building": Building2,
  "lightbulb": Lightbulb,
};

function CategoryIcon({ iconKey, style }: { iconKey: string; style?: React.CSSProperties }) {
  const Icon = ICON_MAP[iconKey] || Shield;
  return <Icon style={{ width: 18, height: 18, ...style }} />;
}

// ─── Content extractors ──────────────────────────────────────────────────────

function countSecurityFailures(text: string): number {
  // Match heading with or without emoji prefix
  const match = text.match(/##\s*(?:🔒\s*)?Security Assessment([\s\S]*?)(?=\n##|$)/);
  if (!match) return 0;
  // Count ❌ markers AND [MISSING] markers (both indicate security failures)
  const xCount = (match[1].match(/❌/g) ?? []).length;
  const missingCount = (match[1].match(/\[MISSING\]/gi) ?? []).length;
  return xCount + missingCount;
}

function countPainPoints(text: string): number {
  // Match heading with or without emoji prefix
  const match = text.match(/##\s*(?:💡\s*)?Pain Points[^#]*([\s\S]*?)(?=\n##|$)/);
  if (!match) return 0;
  // Count bullet points, numbered items, and bold-prefixed lines
  const bullets = (match[1].match(/^[-•*]\s+|^\d+\.\s+|^\*\*[^*]+\*\*/gm) ?? []).length;
  return bullets;
}

function securityCategories(text: string): { label: string; iconKey: string }[] {
  const match = text.match(/##\s*(?:🔒\s*)?Security Assessment([\s\S]*?)(?=\n##|$)/);
  if (!match) return [];
  const t = match[1].toLowerCase();
  const cats: { label: string; iconKey: string }[] = [];
  if (t.includes("content-security") || t.includes("csp")) cats.push({ label: "Content Security", iconKey: "shield-check" });
  if (t.includes("transport") || t.includes("hsts") || t.includes("ssl")) cats.push({ label: "Transport Security", iconKey: "lock" });
  if (t.includes("x-frame") || t.includes("clickjack") || t.includes("xss") || t.includes("x-content")) cats.push({ label: "Input Validation", iconKey: "shield-alert" });
  if (t.includes("server") || t.includes("x-powered") || t.includes("information")) cats.push({ label: "Information Exposure", iconKey: "file-text" });
  if (t.includes("cookie") || t.includes("httponly") || t.includes("secure")) cats.push({ label: "Cookie Security", iconKey: "link" });
  if (t.includes("referrer") || t.includes("permissions") || t.includes("config")) cats.push({ label: "Server Configuration", iconKey: "server" });
  return cats.slice(0, 6);
}

function gapCategories(text: string): { label: string; iconKey: string }[] {
  const match = text.match(/##\s*(?:💡\s*)?Pain Points[^#]*([\s\S]*?)(?=\n##|$)/);
  if (!match) return [];
  const t = match[1].toLowerCase();
  const cats: { label: string; iconKey: string }[] = [];
  if (t.includes("security") || t.includes("vulnerab") || t.includes("risk")) cats.push({ label: "Security Risk", iconKey: "shield" });
  if (t.includes("speed") || t.includes("performance") || t.includes("slow") || t.includes("load")) cats.push({ label: "Performance Gap", iconKey: "zap" });
  if (t.includes("mobile") || t.includes("responsive")) cats.push({ label: "Mobile Experience", iconKey: "smartphone" });
  if (t.includes("seo") || t.includes("search") || t.includes("google")) cats.push({ label: "Online Visibility", iconKey: "globe" });
  if (t.includes("cloud") || t.includes("backup") || t.includes("infrastructure")) cats.push({ label: "Infrastructure", iconKey: "cloud" });
  if (t.includes("software") || t.includes("workflow") || t.includes("automat")) cats.push({ label: "Workflow Efficiency", iconKey: "settings" });
  if (t.includes("data") || t.includes("compliance") || t.includes("gdpr")) cats.push({ label: "Data & Compliance", iconKey: "bar-chart" });
  const fallbacks: { label: string; iconKey: string }[] = [
    { label: "Technology Gaps", iconKey: "wrench" },
    { label: "Operational Risk", iconKey: "alert-triangle" },
    { label: "Digital Presence", iconKey: "laptop" },
  ];
  for (const f of fallbacks) {
    if (cats.length >= 4) break;
    if (!cats.find((c) => c.label === f.label)) cats.push(f);
  }
  return cats.slice(0, 4);
}

// ─── Digital Health Score ─────────────────────────────────────────────────────

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

function healthRecommendations(securityScore: number, presenceScore: number, painCount: number): string[] {
  const recs: string[] = [];
  if (securityScore < 50) recs.push("Security hardening should be your first priority — your current vulnerabilities put customer data at risk");
  else if (securityScore < 70) recs.push("Security improvements are needed to meet industry standards and protect against growing cyber threats");
  if (presenceScore < 45) recs.push("Your digital presence is significantly below industry average — potential customers may struggle to find or trust your business online");
  else if (presenceScore < 65) recs.push("Strengthening your online presence and social media footprint could meaningfully increase your lead flow");
  if (painCount >= 4) recs.push("Multiple technology inefficiencies are creating operational drag — each one represents a real cost to your business");
  else if (painCount >= 2) recs.push("Key technology gaps are holding back your team's productivity and growth potential");
  if (recs.length < 2) recs.push("A structured technology roadmap could address all identified issues and deliver measurable ROI");
  return recs.slice(0, 3);
}

// ─── Health ring (light background) ──────────────────────────────────────────

function HealthScoreRing({ score, color, size = 150 }: { score: number; color: string; size?: number }) {
  const displayed = useCountUp(score, 1800, 200);
  const stroke = 13;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - displayed / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ filter: `drop-shadow(0 0 10px ${color}44)` }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E7EB" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.05s linear" }}
      />
      <text x={size / 2} y={size / 2 - 6} textAnchor="middle" fontSize={size * 0.24} fontWeight="800" fill={color} fontFamily="inherit">{displayed}</text>
      <text x={size / 2} y={size / 2 + size * 0.18} textAnchor="middle" fontSize={size * 0.1} fill="#9CA3AF" fontFamily="inherit">/100</text>
    </svg>
  );
}

function extractPitchTeaser(text: string): string {
  const match = text.match(/## 🚀 The Pitch([\s\S]*?)(?=\n##|$)/);
  if (!match) return "";
  const paragraphs = match[1]
    .trim()
    .split(/\n\n+/)
    .map((p) => p.replace(/^[-•*#>\s]+/, "").replace(/\*\*/g, "").trim())
    .filter((p) => p.length > 40);
  return paragraphs[0] ?? "";
}

function cleanDomain(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
}

// ─── Count-up hook ────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1600, delay = 0) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      const start = Date.now();
      const tick = () => {
        const elapsed = Date.now() - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(eased * target));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(timer);
  }, [target, duration, delay]);
  return value;
}

// ─── Score ring (light background version) ───────────────────────────────────

function ScoreRing({
  score,
  label,
  sublabel,
  color,
  size = 110,
  stroke = 9,
  delay = 0,
}: {
  score: number;
  label: string;
  sublabel: string;
  color: string;
  size?: number;
  stroke?: number;
  delay?: number;
}) {
  const displayed = useCountUp(score, 1600, delay);
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - displayed / 100);
  return (
    <div className="flex flex-col items-center gap-3">
      <div style={{ filter: `drop-shadow(0 0 12px ${color}33)` }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E7EB" strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={color} strokeWidth={stroke}
            strokeDasharray={circ} strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.05s linear" }}
          />
          <text
            x={size / 2} y={size / 2} textAnchor="middle" dy="0.35em"
            fontSize={size * 0.22} fontWeight="800" fill={color} fontFamily="inherit"
          >
            {displayed}
          </text>
          <text
            x={size / 2} y={size / 2 + size * 0.19} textAnchor="middle"
            fontSize={size * 0.1} fill="#9CA3AF" fontFamily="inherit"
          >
            /100
          </text>
        </svg>
      </div>
      <div className="text-center">
        <p style={{ color: "#0A1929", fontWeight: 700, fontSize: 13, margin: 0 }}>{label}</p>
        <p style={{ color, fontWeight: 600, fontSize: 11, margin: "2px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>{sublabel}</p>
      </div>
    </div>
  );
}

// ─── Mini horizontal bar ──────────────────────────────────────────────────────

function MiniBar({ value, color, label }: { value: number; color: string; label: string }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(value), 400);
    return () => clearTimeout(t);
  }, [value]);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 12, color, fontWeight: 700 }}>{value}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: "#F3F4F6", overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 99, background: color, width: `${width}%`, transition: "width 1.4s cubic-bezier(0.4,0,0.2,1)" }} />
      </div>
    </div>
  );
}

// ─── Service icon component ──────────────────────────────────────────────────

const SERVICE_ICONS: { label: string; icon: LucideIcon; desc: string; color: string }[] = [
  { label: "Managed IT Services", desc: "Proactive monitoring & support", color: "#1565C0", icon: Monitor },
  { label: "Cybersecurity", desc: "Protect your data & infrastructure", color: "#ef4444", icon: Shield },
  { label: "Cloud Solutions", desc: "Scalable cloud infrastructure", color: "#7c3aed", icon: Cloud },
  { label: "Custom Software", desc: "Apps built for your business", color: "#059669", icon: Code },
  { label: "AI Integration", desc: "Automate & innovate with AI", color: "#d97706", icon: Cpu },
  { label: "Enterprise IT", desc: "Large-scale IT strategy", color: "#f97316", icon: Building2 },
];

// ─── Expiry modal ────────────────────────────────────────────────────────────

function ExpiryModal({ businessName, pitchId }: { businessName: string; pitchId: string }) {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) return;
    setState("sending");
    try {
      const res = await fetch(`/api/consulting/${pitchId}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, businessName }),
      });
      if (!res.ok) throw new Error("Failed");
      setState("sent");
    } catch {
      setState("error");
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(255,255,255,0.85)", backdropFilter: "blur(16px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div style={{
        maxWidth: 460, width: "100%",
        background: "white", borderRadius: 24,
        boxShadow: "0 25px 50px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)",
        padding: "48px 36px", textAlign: "center",
      }}>
        {state === "sent" ? (
          <>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
            }}>
              <CheckCircle style={{ width: 32, height: 32, color: "#22c55e" }} />
            </div>
            <h2 style={{ margin: "0 0 8px", color: "#0A1929", fontSize: 22, fontWeight: 800 }}>
              Request Received
            </h2>
            <p style={{ margin: 0, color: "#6B7280", fontSize: 14, lineHeight: 1.6 }}>
              Thank you! A member of the GCS consulting team will contact you within 1 business day to provide access to the updated report.
            </p>
          </>
        ) : (
          <>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
            }}>
              <Clock style={{ width: 32, height: 32, color: "#d97706" }} />
            </div>
            <h2 style={{ margin: "0 0 8px", color: "#0A1929", fontSize: 22, fontWeight: 800 }}>
              This Report Has Expired
            </h2>
            <p style={{ margin: "0 0 28px", color: "#6B7280", fontSize: 14, lineHeight: 1.6 }}>
              The technology assessment for <strong style={{ color: "#0A1929" }}>{businessName}</strong> was available for 24 hours. Request access below and our team will follow up.
            </p>

            <form onSubmit={handleSubmit} style={{ textAlign: "left" }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Full Name *
                </label>
                <div style={{ position: "relative" }}>
                  <User style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "#9CA3AF" }} />
                  <input
                    required value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Jane Smith"
                    style={{
                      width: "100%", boxSizing: "border-box",
                      paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10,
                      border: "1px solid #D1D5DB", borderRadius: 8, fontSize: 14, color: "#111827",
                      background: "#F9FAFB", outline: "none",
                    }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Email Address *
                </label>
                <div style={{ position: "relative" }}>
                  <Mail style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "#9CA3AF" }} />
                  <input
                    type="email" required value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="jane@company.com"
                    style={{
                      width: "100%", boxSizing: "border-box",
                      paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10,
                      border: "1px solid #D1D5DB", borderRadius: 8, fontSize: 14, color: "#111827",
                      background: "#F9FAFB", outline: "none",
                    }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Message <span style={{ color: "#9CA3AF", fontWeight: 500, textTransform: "none" }}>(optional)</span>
                </label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="I'd like to review the assessment again..."
                  rows={3}
                  style={{
                    width: "100%", boxSizing: "border-box",
                    padding: 12, border: "1px solid #D1D5DB", borderRadius: 8,
                    fontSize: 14, color: "#111827", background: "#F9FAFB",
                    outline: "none", resize: "vertical", fontFamily: "inherit",
                  }}
                />
              </div>

              {state === "error" && (
                <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 14, textAlign: "center" }}>
                  Something went wrong. Please try again or email <a href="mailto:info@itatgcs.com" style={{ color: "#1565C0" }}>info@itatgcs.com</a>.
                </p>
              )}

              <button
                type="submit"
                disabled={state === "sending"}
                style={{
                  width: "100%", padding: "12px 24px",
                  background: "#1565C0", color: "white",
                  border: "none", borderRadius: 10,
                  fontSize: 14, fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  opacity: state === "sending" ? 0.7 : 1,
                }}
              >
                {state === "sending" ? (
                  <><Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> Sending...</>
                ) : (
                  <><Send style={{ width: 15, height: 15 }} /> Request Access</>
                )}
              </button>
              <style>{`@keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }`}</style>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ConsultingLandingClient({ pitch }: { pitch: Pitch }) {
  const formRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [formState, setFormState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    // 24-hour expiry check (client-side only to avoid hydration mismatch)
    const createdTime = new Date(pitch.createdAt).getTime();
    const expiryTime = createdTime + 24 * 60 * 60 * 1000;
    if (Date.now() > expiryTime) setIsExpired(true);
    return () => clearTimeout(t);
  }, [pitch.createdAt]);

  const domain = cleanDomain(pitch.websiteUrl);
  // Use the brand logo extracted from the actual website (most reliable for small businesses),
  // fall back to Clearbit (good for large companies), then Google favicon
  const logoUrl = pitch.brandLogoUrl || `https://logo.clearbit.com/${domain}`;
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  const securityRisk = Math.max(0, 100 - pitch.securityScore);
  const securityLabel = securityRisk > 70 ? "Critical" : securityRisk > 40 ? "At Risk" : "Moderate";
  const presenceLabel = pitch.presenceScore > 65 ? "Established" : pitch.presenceScore > 40 ? "Growing" : "Limited";
  const potentialLabel = pitch.dealScore > 70 ? "High" : pitch.dealScore > 45 ? "Strong" : "Moderate";

  const secFailureCount = countSecurityFailures(pitch.pitchText);
  const painPointCount = countPainPoints(pitch.pitchText);
  const secCats = securityCategories(pitch.pitchText);
  const gapCats = gapCategories(pitch.pitchText);
  const pitchTeaser = extractPitchTeaser(pitch.pitchText);

  const healthScore = computeDigitalHealth(pitch.securityScore, pitch.presenceScore, painPointCount);
  const grade = healthGrade(healthScore);
  const recs = healthRecommendations(pitch.securityScore, pitch.presenceScore, painPointCount);
  const techHealth = Math.max(0, 100 - painPointCount * 12);

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) return;
    setFormState("sending");
    try {
      const res = await fetch(`/api/consulting/${pitch.id}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, businessName: pitch.businessName }),
      });
      if (!res.ok) throw new Error("Failed");
      setFormState("sent");
    } catch {
      setFormState("error");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FAFBFC", fontFamily: "var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif)" }}>

      {/* Expiry overlay */}
      {isExpired && <ExpiryModal businessName={pitch.businessName} pitchId={pitch.id} />}

      {/* ── Sticky Nav (light) ──────────────────────────────────────────── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid #E5E7EB",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", height: 60,
      }}>
        <Image src="/logo.png" alt="GCS" width={80} height={28} style={{ objectFit: "contain" }} />
        <button
          onClick={scrollToForm}
          style={{
            background: "#1565C0",
            color: "white", border: "none", borderRadius: 8,
            padding: "8px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}
        >
          Book Free Consultation
        </button>
      </nav>

      {/* ── Hero (light) ────────────────────────────────────────────────── */}
      <section style={{
        background: "linear-gradient(160deg, #F0F7FF 0%, #F8FAFC 40%, #F5F3FF 100%)",
        paddingTop: 100, paddingBottom: 80, paddingLeft: 24, paddingRight: 24,
        textAlign: "center", position: "relative", overflow: "hidden",
      }}>
        {/* Subtle background shapes */}
        <div style={{ position: "absolute", top: "10%", left: "20%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(21,101,192,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "30%", right: "15%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{
          maxWidth: 780, margin: "0 auto",
          opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(24px)",
          transition: "opacity 0.7s ease, transform 0.7s ease",
        }}>
          {/* Business badge */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 24 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: "white", display: "flex", alignItems: "center", justifyContent: "center",
              border: "2px solid #E5E7EB", overflow: "hidden",
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
            }}>
              {!logoError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={pitch.businessName}
                  style={{ width: 52, height: 52, objectFit: "contain" }}
                  onError={() => setLogoError(true)}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={faviconUrl}
                  alt={pitch.businessName}
                  style={{ width: 40, height: 40, objectFit: "contain" }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                    (e.currentTarget.parentElement!).innerHTML = `<span style="color:#1565C0;font-size:24px;font-weight:900;">${pitch.businessName[0]}</span>`;
                  }}
                />
              )}
            </div>
            <div style={{ textAlign: "left" }}>
              <p style={{ margin: 0, color: "#6B7280", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Technology Assessment for</p>
              <p style={{ margin: 0, color: "#0A1929", fontSize: 18, fontWeight: 800 }}>{pitch.businessName}</p>
            </div>
          </div>

          <p style={{ margin: "0 0 8px", color: "#1565C0", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            GCS Technology Consulting · Personalized Report
          </p>
          <h1 style={{ margin: "0 0 16px", color: "#0A1929", fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 900, lineHeight: 1.15, fontFamily: "var(--font-display, inherit)" }}>
            We Analyzed Your Business&apos;s<br />Technology Footprint
          </h1>
          <p style={{ margin: "0 auto 48px", color: "#6B7280", fontSize: 16, lineHeight: 1.6, maxWidth: 560 }}>
            Our consulting team reviewed <strong style={{ color: "#0A1929" }}>{pitch.businessName}</strong>&apos;s online presence, security posture, and technology stack. Here&apos;s what we found.
          </p>

          {/* Score rings (light) */}
          <div style={{
            display: "flex", justifyContent: "center", gap: "clamp(24px, 6vw, 64px)",
            flexWrap: "wrap",
          }}>
            <ScoreRing score={securityRisk} label="Security Risk" sublabel={securityLabel} color={securityRisk > 60 ? "#ef4444" : securityRisk > 30 ? "#f97316" : "#22c55e"} delay={300} />
            <ScoreRing score={pitch.presenceScore} label="Online Presence" sublabel={presenceLabel} color="#1565C0" delay={500} />
            <ScoreRing score={pitch.dealScore} label="Opportunity Score" sublabel={potentialLabel} color="#7c3aed" delay={700} />
          </div>

          {/* Scroll cue */}
          <div style={{ marginTop: 48, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: 0.4 }}>
            <span style={{ color: "#6B7280", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>View Full Report Below</span>
            <ChevronDown style={{ color: "#6B7280", width: 18, height: 18, animation: "bounce 1.4s infinite" }} />
          </div>
        </div>
      </section>

      {/* bounce keyframe */}
      <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(6px)} }`}</style>

      {/* ── Metrics Strip (light) ────────────────────────────────────────── */}
      <section style={{ background: "white", padding: "24px", borderBottom: "1px solid #E5E7EB" }}>
        <div style={{ maxWidth: 780, margin: "0 auto", display: "flex", justifyContent: "center", gap: "clamp(20px, 5vw, 60px)", flexWrap: "wrap" }}>
          {[
            { icon: Lock, label: "Security Issues", value: secFailureCount, color: "#ef4444" },
            { icon: AlertTriangle, label: "Technology Gaps", value: painPointCount, color: "#f97316" },
            { icon: Globe, label: "Presence Score", value: `${pitch.presenceScore}%`, color: "#1565C0" },
            { icon: TrendingUp, label: "Opportunity", value: `${pitch.dealScore}%`, color: "#7c3aed" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `${color}10`, display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 8px",
              }}>
                <Icon style={{ width: 18, height: 18, color }} />
              </div>
              <p style={{ margin: 0, color: "#0A1929", fontWeight: 800, fontSize: 22, lineHeight: 1 }}>{value}</p>
              <p style={{ margin: "4px 0 0", color: "#9CA3AF", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Digital Health Score ─────────────────────────────────────── */}
      <section style={{ background: "#F8FAFC", padding: "72px 24px" }}>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <p style={{ margin: "0 0 6px", color: "#1565C0", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em" }}>
              Composite Analysis
            </p>
            <h2 style={{ margin: "0 0 10px", color: "#0A1929", fontSize: 26, fontWeight: 900 }}>
              Digital Health Score
            </h2>
            <p style={{ margin: 0, color: "#6B7280", fontSize: 14, lineHeight: 1.6, maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
              A composite score across security, online presence, and technology efficiency — measuring how your business stacks up digitally.
            </p>
          </div>

          {/* Ring + grade card */}
          <div style={{
            display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center",
            gap: 40, marginBottom: 36,
            background: grade.bg, border: `2px solid ${grade.border}`,
            borderRadius: 20, padding: "36px 32px",
          }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <HealthScoreRing score={healthScore} color={grade.color} size={150} />
              <span style={{
                display: "inline-block", background: grade.bg, border: `2px solid ${grade.color}`,
                borderRadius: 99, padding: "6px 18px", fontSize: 14, fontWeight: 800, color: grade.color,
              }}>
                {grade.label} Health
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 240 }}>
              <p style={{ margin: "0 0 18px", color: "#0A1929", fontSize: 18, fontWeight: 800, lineHeight: 1.3 }}>
                {pitch.businessName} scored <span style={{ color: grade.color }}>{healthScore}/100</span> on our Digital Health Index
              </p>
              <div style={{ background: "white", borderRadius: 12, padding: "16px 20px", border: `1px solid ${grade.border}` }}>
                <MiniBar value={pitch.securityScore} color={securityRisk > 40 ? "#ef4444" : "#22c55e"} label="Security Health" />
                <MiniBar value={pitch.presenceScore} color="#1565C0" label="Digital Presence" />
                <MiniBar value={Math.max(5, techHealth)} color="#7c3aed" label="Technology Efficiency" />
              </div>
            </div>
          </div>

          {/* Recommendations teaser */}
          <div style={{ background: "white", borderRadius: 16, padding: "24px 28px", border: "1px solid #E5E7EB" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Lightbulb style={{ width: 15, height: 15, color: "#d97706" }} />
              </div>
              <p style={{ margin: 0, color: "#0A1929", fontWeight: 700, fontSize: 14 }}>
                Key areas for improvement identified in your assessment:
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {recs.map((rec, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 99, background: grade.color + "20",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1,
                    fontSize: 11, fontWeight: 900, color: grade.color,
                  }}>{i + 1}</div>
                  <p style={{ margin: 0, color: "#374151", fontSize: 13, lineHeight: 1.6 }}>{rec}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, textAlign: "center" }}>
              <button onClick={scrollToForm} style={{
                background: "#1565C0",
                color: "white", border: "none", borderRadius: 10,
                padding: "11px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}>
                Get Your Full Health Report — Free Consultation
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Security Teaser ───────────────────────────────────────────── */}
      {secFailureCount > 0 && (
        <section style={{ background: "white", padding: "64px 24px" }}>
          <div style={{ maxWidth: 780, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Shield style={{ width: 18, height: 18, color: "#ef4444" }} />
              </div>
              <div>
                <p style={{ margin: 0, color: "#ef4444", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Security Assessment</p>
                <h2 style={{ margin: 0, color: "#0A1929", fontSize: 22, fontWeight: 800 }}>
                  {secFailureCount} Security {secFailureCount === 1 ? "Issue" : "Issues"} Detected
                </h2>
              </div>
            </div>
            <p style={{ color: "#6B7280", fontSize: 14, lineHeight: 1.6, marginTop: 8, marginBottom: 24 }}>
              Our scan of <strong style={{ color: "#0A1929" }}>{pitch.websiteUrl}</strong> found security vulnerabilities across multiple layers of your technology stack. These are areas where your business may be exposed.
            </p>

            {/* Category badges — with Lucide icons */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 28 }}>
              {secCats.map((cat) => (
                <span key={cat.label} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "#fef2f2", border: "1px solid #fecaca",
                  borderRadius: 99, padding: "7px 14px", fontSize: 13, color: "#991b1b", fontWeight: 600,
                }}>
                  <CategoryIcon iconKey={cat.iconKey} style={{ width: 14, height: 14, color: "#991b1b" }} /> {cat.label}
                </span>
              ))}
              {secFailureCount > secCats.length && (
                <span style={{
                  background: "#F3F4F6", border: "1px solid #E5E7EB",
                  borderRadius: 99, padding: "7px 14px", fontSize: 13, color: "#6B7280", fontWeight: 600,
                }}>
                  +{secFailureCount - secCats.length} more areas
                </span>
              )}
            </div>

            {/* Score bars */}
            <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "20px 24px", border: "1px solid #E5E7EB" }}>
              <MiniBar value={securityRisk} color="#ef4444" label="Security Risk Exposure" />
              <MiniBar value={pitch.presenceScore} color="#1565C0" label="Online Presence Strength" />
              <MiniBar value={pitch.dealScore} color="#7c3aed" label="Improvement Potential" />
            </div>

            <div style={{ marginTop: 20, textAlign: "center" }}>
              <p style={{ margin: "0 0 10px", color: "#6B7280", fontSize: 13 }}>
                The full security breakdown is included in our consultation — schedule a call to review it together.
              </p>
              <button onClick={scrollToForm} style={{
                background: "none", border: "1px solid #ef4444", color: "#ef4444",
                borderRadius: 8, padding: "9px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}>
                Get the Full Report
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Technology Gaps Teaser ────────────────────────────────────── */}
      {painPointCount > 0 && (
        <section style={{ background: "#F8FAFC", padding: "64px 24px" }}>
          <div style={{ maxWidth: 780, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "#fff7ed", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <AlertTriangle style={{ width: 18, height: 18, color: "#f97316" }} />
              </div>
              <div>
                <p style={{ margin: 0, color: "#f97316", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Technology Analysis</p>
                <h2 style={{ margin: 0, color: "#0A1929", fontSize: 22, fontWeight: 800 }}>
                  {painPointCount} Technology {painPointCount === 1 ? "Gap" : "Gaps"} Found
                </h2>
              </div>
            </div>
            <p style={{ color: "#6B7280", fontSize: 14, lineHeight: 1.6, marginTop: 8, marginBottom: 24 }}>
              Our analysis identified <strong style={{ color: "#0A1929" }}>{painPointCount} areas</strong> where {pitch.businessName}&apos;s technology may be limiting growth, efficiency, or security. Here&apos;s where they fall:
            </p>

            {/* Category cards — with Lucide icons */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
              {gapCats.map((cat, i) => {
                const cardColors = [
                  { bg: "#fef2f2", border: "#fecaca", text: "#991b1b", iconBg: "#fecaca" },
                  { bg: "#fff7ed", border: "#fed7aa", text: "#92400E", iconBg: "#fed7aa" },
                  { bg: "#fefce8", border: "#fde68a", text: "#78350F", iconBg: "#fde68a" },
                  { bg: "#eff6ff", border: "#dbeafe", text: "#1e3a8a", iconBg: "#dbeafe" },
                ];
                const c = cardColors[i % cardColors.length];
                return (
                  <div key={cat.label} style={{
                    background: c.bg,
                    border: `1px solid ${c.border}`,
                    borderRadius: 12, padding: "16px",
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: c.iconBg, display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <CategoryIcon iconKey={cat.iconKey} style={{ width: 18, height: 18, color: c.text }} />
                    </div>
                    <p style={{ margin: "10px 0 4px", fontWeight: 700, fontSize: 13, color: c.text }}>{cat.label}</p>
                    <p style={{ margin: 0, fontSize: 12, color: "#9CA3AF" }}>Identified · Needs attention</p>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 20, textAlign: "center" }}>
              <p style={{ margin: "0 0 10px", color: "#6B7280", fontSize: 13 }}>
                Specific findings and recommended actions are available in your consultation — no obligation to get the details.
              </p>
              <button onClick={scrollToForm} style={{
                background: "none", border: "1px solid #f97316", color: "#f97316",
                borderRadius: 8, padding: "9px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}>
                Discuss My Gaps
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Our Approach (Pitch Teaser) ───────────────────────────────── */}
      {pitchTeaser && (
        <section style={{ background: "white", padding: "64px 24px" }}>
          <div style={{ maxWidth: 780, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <TrendingUp style={{ width: 18, height: 18, color: "#1565C0" }} />
              </div>
              <div>
                <p style={{ margin: 0, color: "#1565C0", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Our Recommendation</p>
                <h2 style={{ margin: 0, color: "#0A1929", fontSize: 22, fontWeight: 800 }}>How GCS Can Help</h2>
              </div>
            </div>
            <div style={{
              marginTop: 24, background: "linear-gradient(135deg, #eff6ff, #f5f3ff)",
              border: "1px solid #dbeafe", borderRadius: 16, padding: "28px 32px",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: "linear-gradient(180deg, #1565C0, #7c3aed)" }} />
              <p style={{ margin: 0, color: "#1e3a5f", fontSize: 16, lineHeight: 1.8, fontStyle: "italic" }}>
                &ldquo;{pitchTeaser}&rdquo;
              </p>
            </div>
            {/* Fade teaser */}
            <div style={{ position: "relative", marginTop: 16 }}>
              <div style={{
                background: "#F8FAFC", borderRadius: 12, padding: "24px 28px",
                border: "1px solid #E5E7EB", maxHeight: 80, overflow: "hidden",
                position: "relative",
              }}>
                <p style={{ margin: 0, color: "#9CA3AF", fontSize: 14, lineHeight: 1.7 }}>
                  Our team has identified specific service areas where we can help {pitch.businessName} immediately reduce risk, improve efficiency, and accelerate growth — including managed security, cloud infrastructure, and custom technology solutions...
                </p>
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0, height: 60,
                  background: "linear-gradient(to top, #F8FAFC, transparent)",
                }} />
              </div>
              <div style={{ textAlign: "center", marginTop: 12 }}>
                <button
                  onClick={scrollToForm}
                  style={{
                    background: "none", border: "1px solid #1565C0",
                    color: "#1565C0", borderRadius: 8, padding: "10px 24px",
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  Request Full Assessment — Schedule a Call
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Services (light) ──────────────────────────────────────────── */}
      <section style={{ background: "#F8FAFC", padding: "64px 24px", borderTop: "1px solid #E5E7EB" }}>
        <div style={{ maxWidth: 780, margin: "0 auto", textAlign: "center" }}>
          <p style={{ margin: "0 0 8px", color: "#6B7280", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>What We Do</p>
          <h2 style={{ margin: "0 0 12px", color: "#0A1929", fontSize: 26, fontWeight: 800 }}>One Partner for Everything Technology</h2>
          <p style={{ margin: "0 0 40px", color: "#6B7280", fontSize: 14, lineHeight: 1.7, maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
            GCS delivers end-to-end technology consulting — from keeping your systems secure to building the software that drives your business forward.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
            {SERVICE_ICONS.map(({ label, desc, color, icon: SvcIcon }) => (
              <div key={label} style={{
                background: "white", border: "1px solid #E5E7EB",
                borderRadius: 12, padding: "20px 16px", textAlign: "left",
                borderTop: `3px solid ${color}`,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: `${color}12`, display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <SvcIcon style={{ width: 20, height: 20, color }} />
                </div>
                <p style={{ margin: "12px 0 4px", color: "#0A1929", fontWeight: 700, fontSize: 13 }}>{label}</p>
                <p style={{ margin: 0, color: "#9CA3AF", fontSize: 12, lineHeight: 1.5 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Consultation Form ─────────────────────────────────────────── */}
      <section ref={formRef} style={{ background: "white", padding: "80px 24px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: "#1565C0",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
            }}>
              <Phone style={{ width: 24, height: 24, color: "white" }} />
            </div>
            <h2 style={{ margin: "0 0 10px", color: "#0A1929", fontSize: 28, fontWeight: 900 }}>
              Let&apos;s Talk About Your Business
            </h2>
            <p style={{ margin: 0, color: "#6B7280", fontSize: 15, lineHeight: 1.6 }}>
              Schedule a free, no-obligation consultation with our technology team. We&apos;ll walk you through our full findings and explore exactly how GCS can help.
            </p>
          </div>

          {formState === "sent" ? (
            <div style={{
              background: "#f0fdf4", border: "2px solid #86efac",
              borderRadius: 16, padding: "48px 32px", textAlign: "center",
            }}>
              <CheckCircle style={{ width: 48, height: 48, color: "#22c55e", margin: "0 auto 16px", display: "block" }} />
              <h3 style={{ margin: "0 0 8px", color: "#14532d", fontSize: 20, fontWeight: 800 }}>Request Received!</h3>
              <p style={{ margin: 0, color: "#166534", fontSize: 14, lineHeight: 1.6 }}>
                Thank you for reaching out. A member of the GCS consulting team will contact you within 1 business day.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              style={{
                background: "#F8FAFC", border: "1px solid #E5E7EB",
                borderRadius: 16, padding: "36px 32px",
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                {/* Name */}
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Full Name *
                  </label>
                  <div style={{ position: "relative" }}>
                    <User style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "#9CA3AF" }} />
                    <input
                      required value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Jane Smith"
                      style={{
                        width: "100%", boxSizing: "border-box",
                        paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10,
                        border: "1px solid #D1D5DB", borderRadius: 8, fontSize: 14, color: "#111827",
                        background: "white", outline: "none",
                      }}
                    />
                  </div>
                </div>
                {/* Email */}
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Email Address *
                  </label>
                  <div style={{ position: "relative" }}>
                    <Mail style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "#9CA3AF" }} />
                    <input
                      type="email" required value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="jane@company.com"
                      style={{
                        width: "100%", boxSizing: "border-box",
                        paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10,
                        border: "1px solid #D1D5DB", borderRadius: 8, fontSize: 14, color: "#111827",
                        background: "white", outline: "none",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Phone */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Phone <span style={{ color: "#9CA3AF", fontWeight: 500, textTransform: "none" }}>(optional)</span>
                </label>
                <div style={{ position: "relative" }}>
                  <Phone style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "#9CA3AF" }} />
                  <input
                    type="tel" value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    style={{
                      width: "100%", boxSizing: "border-box",
                      paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10,
                      border: "1px solid #D1D5DB", borderRadius: 8, fontSize: 14, color: "#111827",
                      background: "white", outline: "none",
                    }}
                  />
                </div>
              </div>

              {/* Message */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Message *
                </label>
                <div style={{ position: "relative" }}>
                  <MessageSquare style={{ position: "absolute", left: 12, top: 12, width: 16, height: 16, color: "#9CA3AF" }} />
                  <textarea
                    required value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder={`Hi GCS Team, I'm interested in learning more about how you can help ${pitch.businessName}...`}
                    rows={4}
                    style={{
                      width: "100%", boxSizing: "border-box",
                      paddingLeft: 36, paddingRight: 12, paddingTop: 12, paddingBottom: 12,
                      border: "1px solid #D1D5DB", borderRadius: 8, fontSize: 14, color: "#111827",
                      background: "white", outline: "none", resize: "vertical",
                      fontFamily: "inherit",
                    }}
                  />
                </div>
              </div>

              {formState === "error" && (
                <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 16, textAlign: "center" }}>
                  Something went wrong. Please try again or email us at <a href="mailto:info@itatgcs.com" style={{ color: "#1565C0" }}>info@itatgcs.com</a>.
                </p>
              )}

              <button
                type="submit"
                disabled={formState === "sending"}
                style={{
                  width: "100%", padding: "14px 24px",
                  background: "#1565C0",
                  color: "white", border: "none", borderRadius: 10,
                  fontSize: 15, fontWeight: 800, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  opacity: formState === "sending" ? 0.7 : 1,
                }}
              >
                {formState === "sending" ? (
                  <><Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} /> Sending...</>
                ) : (
                  <><Send style={{ width: 16, height: 16 }} /> Book My Free Consultation</>
                )}
              </button>
              <style>{`@keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }`}</style>

              <p style={{ margin: "12px 0 0", textAlign: "center", color: "#9CA3AF", fontSize: 12 }}>
                No spam. No commitment. We&apos;ll reach out within 1 business day.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* ── Footer (light) ─────────────────────────────────────────────── */}
      <footer style={{ background: "#F8FAFC", padding: "32px 24px", textAlign: "center", borderTop: "1px solid #E5E7EB" }}>
        <Image src="/logo.png" alt="GCS" width={80} height={28} style={{ objectFit: "contain", margin: "0 auto 12px", display: "block" }} />
        <p style={{ margin: "0 0 4px", color: "#6B7280", fontSize: 12 }}>
          <a href="https://www.itatgcs.com" style={{ color: "#1565C0", textDecoration: "none" }}>www.itatgcs.com</a>
          &nbsp;·&nbsp;
          <a href="mailto:info@itatgcs.com" style={{ color: "#1565C0", textDecoration: "none" }}>info@itatgcs.com</a>
        </p>
        <p style={{ margin: 0, color: "#9CA3AF", fontSize: 11 }}>
          © {new Date().getFullYear()} Global Computing Solutions. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
