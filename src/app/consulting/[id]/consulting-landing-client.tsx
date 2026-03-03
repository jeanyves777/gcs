"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AlertTriangle, Shield, TrendingUp, Globe, ChevronDown, CheckCircle, Loader2, Send, Phone, Mail, User, MessageSquare, Lock } from "lucide-react";

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
};

// ─── Content extractors (counts/categories only — no specifics shared) ────────

function countSecurityFailures(text: string): number {
  const match = text.match(/## 🔒 Security Assessment([\s\S]*?)(?=\n##|$)/);
  if (!match) return 0;
  return (match[1].match(/❌/g) ?? []).length;
}

function countPainPoints(text: string): number {
  const match = text.match(/## 💡 Pain Points[^#]*([\s\S]*?)(?=\n##|$)/);
  if (!match) return 0;
  return (match[1].match(/^[-•*]\s+|^\d+\.\s+/gm) ?? []).length;
}

/** Generic security category labels derived from section text — no specifics */
function securityCategories(text: string): { label: string; icon: string }[] {
  const match = text.match(/## 🔒 Security Assessment([\s\S]*?)(?=\n##|$)/);
  if (!match) return [];
  const t = match[1].toLowerCase();
  const cats: { label: string; icon: string }[] = [];
  if (t.includes("content-security") || t.includes("csp")) cats.push({ label: "Content Security", icon: "🛡️" });
  if (t.includes("transport") || t.includes("hsts") || t.includes("ssl")) cats.push({ label: "Transport Security", icon: "🔐" });
  if (t.includes("frame") || t.includes("clickjack")) cats.push({ label: "Clickjacking Exposure", icon: "⚠️" });
  if (t.includes("content-type") || t.includes("mime")) cats.push({ label: "MIME Sniffing Risk", icon: "📄" });
  if (t.includes("referrer")) cats.push({ label: "Data Leakage Controls", icon: "🔗" });
  if (t.includes("permission") || t.includes("feature")) cats.push({ label: "Browser Permissions", icon: "🖥️" });
  return cats.slice(0, 4);
}

/** Generic gap category labels derived from pain points section — no specifics */
function gapCategories(text: string): { label: string; icon: string }[] {
  const match = text.match(/## 💡 Pain Points[^#]*([\s\S]*?)(?=\n##|$)/);
  if (!match) return [];
  const t = match[1].toLowerCase();
  const cats: { label: string; icon: string }[] = [];
  if (t.includes("security") || t.includes("vulnerab") || t.includes("risk")) cats.push({ label: "Security Risk", icon: "🔴" });
  if (t.includes("speed") || t.includes("performance") || t.includes("slow") || t.includes("load")) cats.push({ label: "Performance Gap", icon: "🟠" });
  if (t.includes("mobile") || t.includes("responsive")) cats.push({ label: "Mobile Experience", icon: "📱" });
  if (t.includes("seo") || t.includes("search") || t.includes("google")) cats.push({ label: "Online Visibility", icon: "🌐" });
  if (t.includes("cloud") || t.includes("backup") || t.includes("infrastructure")) cats.push({ label: "Infrastructure", icon: "☁️" });
  if (t.includes("software") || t.includes("workflow") || t.includes("automat")) cats.push({ label: "Workflow Efficiency", icon: "⚙️" });
  if (t.includes("data") || t.includes("compliance") || t.includes("gdpr")) cats.push({ label: "Data & Compliance", icon: "📊" });
  // Always include at least 3 generic ones if we didn't find enough
  const fallbacks = [
    { label: "Technology Gaps", icon: "🔧" },
    { label: "Operational Risk", icon: "⚠️" },
    { label: "Digital Presence", icon: "💻" },
  ];
  for (const f of fallbacks) {
    if (cats.length >= 4) break;
    if (!cats.find((c) => c.label === f.label)) cats.push(f);
  }
  return cats.slice(0, 4);
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

// ─── Animated score ring ─────────────────────────────────────────────────────

function ScoreRing({
  score,
  label,
  sublabel,
  color,
  trackColor = "rgba(255,255,255,0.12)",
  size = 110,
  stroke = 9,
  delay = 0,
}: {
  score: number;
  label: string;
  sublabel: string;
  color: string;
  trackColor?: string;
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
      <div style={{ filter: `drop-shadow(0 0 12px ${color}55)` }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
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
            fontSize={size * 0.22} fontWeight="800" fill="white" fontFamily="inherit"
          >
            {displayed}
          </text>
          <text
            x={size / 2} y={size / 2 + size * 0.19} textAnchor="middle"
            fontSize={size * 0.1} fill="rgba(255,255,255,0.6)" fontFamily="inherit"
          >
            /100
          </text>
        </svg>
      </div>
      <div className="text-center">
        <p style={{ color: "white", fontWeight: 700, fontSize: 13, margin: 0 }}>{label}</p>
        <p style={{ color: color, fontWeight: 600, fontSize: 11, margin: "2px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>{sublabel}</p>
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

// ─── Main component ───────────────────────────────────────────────────────────

export function ConsultingLandingClient({ pitch }: { pitch: Pitch }) {
  const formRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [formState, setFormState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const domain = cleanDomain(pitch.websiteUrl);
  const logoUrl = `https://logo.clearbit.com/${domain}`;
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
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif)" }}>

      {/* ── Sticky Nav ─────────────────────────────────────────────────── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: "rgba(10,25,41,0.92)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", height: 60,
      }}>
        <Image src="/logo.png" alt="GCS" width={80} height={28} style={{ filter: "brightness(0) invert(1)", objectFit: "contain" }} />
        <button
          onClick={scrollToForm}
          style={{
            background: "linear-gradient(135deg, #1565C0, #5e35b1)",
            color: "white", border: "none", borderRadius: 8,
            padding: "8px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}
        >
          Book Free Consultation
        </button>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section style={{
        background: "linear-gradient(160deg, #0A1929 0%, #1565C0 50%, #5e35b1 100%)",
        paddingTop: 100, paddingBottom: 80, paddingLeft: 24, paddingRight: 24,
        textAlign: "center", position: "relative", overflow: "hidden",
      }}>
        {/* Background glow */}
        <div style={{ position: "absolute", top: "20%", left: "30%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(94,53,177,0.3) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "40%", right: "20%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(21,101,192,0.4) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{
          maxWidth: 780, margin: "0 auto",
          opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(24px)",
          transition: "opacity 0.7s ease, transform 0.7s ease",
        }}>
          {/* Business badge */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 24 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center",
              border: "2px solid rgba(255,255,255,0.2)", overflow: "hidden",
              boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
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
                    (e.currentTarget.parentElement!).innerHTML = `<span style="color:white;font-size:24px;font-weight:900;">${pitch.businessName[0]}</span>`;
                  }}
                />
              )}
            </div>
            <div style={{ textAlign: "left" }}>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Technology Assessment for</p>
              <p style={{ margin: 0, color: "white", fontSize: 18, fontWeight: 800 }}>{pitch.businessName}</p>
            </div>
          </div>

          <p style={{ margin: "0 0 8px", color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            GCS Technology Consulting · Personalized Report
          </p>
          <h1 style={{ margin: "0 0 16px", color: "white", fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 900, lineHeight: 1.15, fontFamily: "var(--font-display, inherit)" }}>
            We Analyzed Your Business&apos;s<br />Technology Footprint
          </h1>
          <p style={{ margin: "0 auto 48px", color: "rgba(255,255,255,0.7)", fontSize: 16, lineHeight: 1.6, maxWidth: 560 }}>
            Our consulting team reviewed <strong style={{ color: "white" }}>{pitch.businessName}</strong>&apos;s online presence, security posture, and technology stack. Here&apos;s what we found.
          </p>

          {/* Score rings */}
          <div style={{
            display: "flex", justifyContent: "center", gap: "clamp(24px, 6vw, 64px)",
            flexWrap: "wrap",
          }}>
            <ScoreRing score={securityRisk} label="Security Risk" sublabel={securityLabel} color={securityRisk > 60 ? "#ef4444" : securityRisk > 30 ? "#f97316" : "#22c55e"} delay={300} />
            <ScoreRing score={pitch.presenceScore} label="Online Presence" sublabel={presenceLabel} color="#38bdf8" delay={500} />
            <ScoreRing score={pitch.dealScore} label="Opportunity Score" sublabel={potentialLabel} color="#a78bfa" delay={700} />
          </div>

          {/* Scroll cue */}
          <div style={{ marginTop: 48, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: 0.5 }}>
            <span style={{ color: "white", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>View Full Report Below</span>
            <ChevronDown style={{ color: "white", width: 18, height: 18, animation: "bounce 1.4s infinite" }} />
          </div>
        </div>
      </section>

      {/* bounce keyframe */}
      <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(6px)} }`}</style>

      {/* ── Metrics Strip ──────────────────────────────────────────────── */}
      <section style={{ background: "#0A1929", padding: "24px" }}>
        <div style={{ maxWidth: 780, margin: "0 auto", display: "flex", justifyContent: "center", gap: "clamp(20px, 5vw, 60px)", flexWrap: "wrap" }}>
          {[
            { icon: Lock, label: "Security Issues", value: secFailureCount, color: "#ef4444" },
            { icon: AlertTriangle, label: "Technology Gaps", value: painPointCount, color: "#f97316" },
            { icon: Globe, label: "Presence Score", value: `${pitch.presenceScore}%`, color: "#38bdf8" },
            { icon: TrendingUp, label: "Opportunity", value: `${pitch.dealScore}%`, color: "#a78bfa" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <Icon style={{ width: 20, height: 20, color, margin: "0 auto 6px" }} />
              <p style={{ margin: 0, color: "white", fontWeight: 800, fontSize: 22, lineHeight: 1 }}>{value}</p>
              <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.45)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>
            </div>
          ))}
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

            {/* Category badges — no specifics */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 28 }}>
              {secCats.map((cat) => (
                <span key={cat.label} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "#fef2f2", border: "1px solid #fecaca",
                  borderRadius: 99, padding: "7px 14px", fontSize: 13, color: "#991b1b", fontWeight: 600,
                }}>
                  <span>{cat.icon}</span> {cat.label}
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
              <MiniBar value={pitch.presenceScore} color="#38bdf8" label="Online Presence Strength" />
              <MiniBar value={pitch.dealScore} color="#a78bfa" label="Improvement Potential" />
            </div>

            <div style={{ marginTop: 20, textAlign: "center" }}>
              <p style={{ margin: "0 0 10px", color: "#6B7280", fontSize: 13 }}>
                The full security breakdown is included in our consultation — schedule a call to review it together.
              </p>
              <button onClick={scrollToForm} style={{
                background: "none", border: "1px solid #ef4444", color: "#ef4444",
                borderRadius: 8, padding: "9px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}>
                Get the Full Report →
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

            {/* Category chips — generic labels, no details */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
              {gapCats.map((cat, i) => {
                const intensities = ["#fef2f2", "#fff7ed", "#fefce8", "#eff6ff"];
                const borders = ["#fecaca", "#fed7aa", "#fde68a", "#dbeafe"];
                const textColors = ["#991b1b", "#92400E", "#78350F", "#1e3a8a"];
                return (
                  <div key={cat.label} style={{
                    background: intensities[i % intensities.length],
                    border: `1px solid ${borders[i % borders.length]}`,
                    borderRadius: 12, padding: "16px",
                  }}>
                    <span style={{ fontSize: 22 }}>{cat.icon}</span>
                    <p style={{ margin: "8px 0 4px", fontWeight: 700, fontSize: 13, color: textColors[i % textColors.length] }}>{cat.label}</p>
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
                Discuss My Gaps →
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
              <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: "linear-gradient(180deg, #1565C0, #5e35b1)" }} />
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
                  Request Full Assessment → Schedule a Call
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Services Teaser ───────────────────────────────────────────── */}
      <section style={{ background: "#0A1929", padding: "64px 24px" }}>
        <div style={{ maxWidth: 780, margin: "0 auto", textAlign: "center" }}>
          <p style={{ margin: "0 0 8px", color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>What We Do</p>
          <h2 style={{ margin: "0 0 12px", color: "white", fontSize: 26, fontWeight: 800 }}>One Partner for Everything Technology</h2>
          <p style={{ margin: "0 0 40px", color: "rgba(255,255,255,0.6)", fontSize: 14, lineHeight: 1.7, maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
            GCS delivers end-to-end technology consulting — from keeping your systems secure to building the software that drives your business forward.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
            {[
              { label: "Managed IT Services", desc: "Proactive monitoring & support", color: "#38bdf8", emoji: "🖥️" },
              { label: "Cybersecurity", desc: "Protect your data & infrastructure", color: "#ef4444", emoji: "🔒" },
              { label: "Cloud Solutions", desc: "Scalable cloud infrastructure", color: "#a78bfa", emoji: "☁️" },
              { label: "Custom Software", desc: "Apps built for your business", color: "#34d399", emoji: "💻" },
              { label: "AI Integration", desc: "Automate & innovate with AI", color: "#fbbf24", emoji: "🤖" },
              { label: "Enterprise IT", desc: "Large-scale IT strategy", color: "#f97316", emoji: "🏢" },
            ].map(({ label, desc, color, emoji }) => (
              <div key={label} style={{
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12, padding: "20px 16px", textAlign: "left",
                borderTop: `3px solid ${color}`,
              }}>
                <span style={{ fontSize: 24 }}>{emoji}</span>
                <p style={{ margin: "10px 0 4px", color: "white", fontWeight: 700, fontSize: 13 }}>{label}</p>
                <p style={{ margin: 0, color: "rgba(255,255,255,0.45)", fontSize: 12, lineHeight: 1.5 }}>{desc}</p>
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
              background: "linear-gradient(135deg, #1565C0, #5e35b1)",
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
                  background: "linear-gradient(135deg, #1565C0, #5e35b1)",
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

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer style={{ background: "#0A1929", padding: "32px 24px", textAlign: "center" }}>
        <Image src="/logo.png" alt="GCS" width={80} height={28} style={{ filter: "brightness(0) invert(1)", objectFit: "contain", margin: "0 auto 12px", display: "block" }} />
        <p style={{ margin: "0 0 4px", color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
          <a href="https://www.itatgcs.com" style={{ color: "#38bdf8", textDecoration: "none" }}>www.itatgcs.com</a>
          &nbsp;·&nbsp;
          <a href="mailto:info@itatgcs.com" style={{ color: "#38bdf8", textDecoration: "none" }}>info@itatgcs.com</a>
        </p>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.25)", fontSize: 11 }}>
          © {new Date().getFullYear()} Global Computing Solutions. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
