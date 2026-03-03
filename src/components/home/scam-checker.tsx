"use client";

import { useState, useRef, useEffect } from "react";
import {
  ShieldAlert, ShieldCheck, ShieldX, ArrowRight, X, Search,
  CheckCircle, AlertTriangle, XCircle, Loader2, Mail, Globe,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type ScamFinding = { type: "positive" | "warning" | "danger"; title: string; detail: string };
type ScamDetail = { label: string; value: string; status: "good" | "warning" | "bad" };
type ScamResult = {
  input: string;
  type: "url" | "email";
  riskScore: number;
  trustLevel: "safe" | "suspicious" | "dangerous";
  findings: ScamFinding[];
  details: ScamDetail[];
  checkedAt: string;
};

// ─── Constants ──────────────────────────────────────────────────────────────

const TRUST_COLORS = {
  safe: { bg: "#E8F5E9", color: "#2E7D32", border: "#A5D6A7" },
  suspicious: { bg: "#FFF3E0", color: "#E65100", border: "#FFCC80" },
  dangerous: { bg: "#FFEBEE", color: "#C62828", border: "#EF9A9A" },
};

const TRUST_LABELS = {
  safe: "Likely Safe",
  suspicious: "Suspicious",
  dangerous: "Likely Dangerous",
};

const FINDING_ICONS = {
  positive: CheckCircle,
  warning: AlertTriangle,
  danger: XCircle,
};
const FINDING_COLORS = {
  positive: "#2E7D32",
  warning: "#E65100",
  danger: "#C62828",
};

const URL_STEPS = [
  "Checking domain registration…",
  "Verifying SSL certificate…",
  "Analyzing DNS security…",
  "Scanning for suspicious patterns…",
  "Checking blacklists & typosquatting…",
  "Calculating risk score…",
];
const EMAIL_STEPS = [
  "Validating email format…",
  "Checking email domain…",
  "Verifying DNS & mail records…",
  "Checking against scam databases…",
  "Calculating risk score…",
];

function detectType(input: string): "url" | "email" | null {
  const t = input.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return "email";
  if (/^[^\s]+\.[a-z]{2,}/i.test(t.replace(/^https?:\/\//, ""))) return "url";
  return null;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ScamChecker() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [state, setState] = useState<"idle" | "checking" | "complete" | "error">("idle");
  const [result, setResult] = useState<ScamResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const [expandedFinding, setExpandedFinding] = useState<number | null>(null);
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const inputType = detectType(input);
  const steps = inputType === "email" ? EMAIL_STEPS : URL_STEPS;

  // Lock body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  const startSteps = () => {
    setStepIndex(0);
    stepTimer.current = setInterval(() => {
      setStepIndex((i) => (i < steps.length - 1 ? i + 1 : i));
    }, 2500);
  };
  const stopSteps = () => {
    if (stepTimer.current) { clearInterval(stepTimer.current); stepTimer.current = null; }
  };

  const handleCheck = async () => {
    const trimmed = input.trim();
    if (!trimmed || !inputType) return;
    setState("checking");
    setResult(null);
    setErrorMsg("");
    setExpandedFinding(null);
    startSteps();
    try {
      const res = await fetch("/api/public/scam-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: trimmed }),
      });
      const data = await res.json();
      stopSteps();
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setResult(data as ScamResult);
      setState("complete");
    } catch (err) {
      stopSteps();
      setErrorMsg(err instanceof Error ? err.message : "Check failed");
      setState("error");
    }
  };

  const reset = () => {
    setState("idle");
    setResult(null);
    setErrorMsg("");
    setStepIndex(0);
    setExpandedFinding(null);
  };

  const close = () => {
    setOpen(false);
    // Reset after animation
    setTimeout(() => { reset(); setInput(""); }, 200);
  };

  const riskColor = result
    ? result.riskScore >= 60 ? "#C62828" : result.riskScore >= 30 ? "#E65100" : "#2E7D32"
    : "#90A4AE";
  const riskAngle = result ? Math.round(result.riskScore * 3.6) : 0;

  return (
    <>
      {/* ── Floating Button ─────────────────────────────────────────── */}
      <div className="relative flex justify-center" style={{ zIndex: 10, marginTop: "-26px", marginBottom: "-26px" }}>
        <button
          onClick={() => setOpen(true)}
          className="group flex items-center gap-3 rounded-full px-6 sm:px-8 py-3.5 sm:py-4 text-sm font-bold text-white transition-all hover:scale-[1.03] active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, #D32F2F 0%, #B71C1C 50%, #880E4F 100%)",
            boxShadow: "0 8px 32px rgba(211,47,47,0.35), 0 2px 8px rgba(0,0,0,0.1)",
            animation: "scam-checker-pulse 3s ease-in-out infinite",
          }}
        >
          <ShieldAlert className="h-5 w-5" />
          <span className="hidden sm:inline">Check if a Website or Email is a Scam</span>
          <span className="sm:hidden">Scam Checker</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>

      {/* ── Modal Overlay ───────────────────────────────────────────── */}
      {open && (
        <div className="fixed inset-0" style={{ zIndex: 9999 }}>
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{ background: "rgba(10,25,41,0.45)", backdropFilter: "blur(4px)" }}
            onClick={() => { if (state !== "checking") close(); }}
          />

          {/* Panel */}
          <div
            className="absolute top-1/2 left-1/2 w-[calc(100%-2rem)] max-w-lg rounded-2xl overflow-y-auto"
            style={{
              transform: "translate(-50%, -50%)",
              maxHeight: "85vh",
              background: "#FFFFFF",
              border: "1px solid #E3F2FD",
              boxShadow: "0 24px 80px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.1)",
              animation: "scam-panel-appear 0.25s ease-out",
            }}
          >
            {/* Close Button */}
            <button
              onClick={close}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full transition-colors"
              style={{ background: "#F5F5F5", color: "#546E7A", zIndex: 1 }}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="p-6">
              {/* ── IDLE / ERROR STATE ── */}
              {(state === "idle" || state === "error") && (
                <div className="space-y-5">
                  {/* Header */}
                  <div className="text-center">
                    <div
                      className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
                      style={{ background: "linear-gradient(135deg, #FFEBEE, #FCE4EC)", border: "1px solid #FFCDD2" }}
                    >
                      <ShieldAlert className="h-7 w-7" style={{ color: "#C62828" }} />
                    </div>
                    <h3
                      className="text-xl font-black mb-1"
                      style={{ color: "#0A1929", fontFamily: "var(--font-display)" }}
                    >
                      Scam Checker
                    </h3>
                    <p className="text-sm" style={{ color: "#546E7A" }}>
                      Enter any website URL or email address to check if it&apos;s a scam
                    </p>
                  </div>

                  {/* Input */}
                  <div
                    className="flex items-center gap-2 rounded-xl p-1.5"
                    style={{ background: "#F5F7FA", border: "1px solid #E0E0E0" }}
                  >
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#90A4AE" }} />
                      <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCheck()}
                        placeholder="website.com or someone@email.com"
                        className="w-full rounded-lg pl-10 pr-3 py-3 text-sm outline-none border-0"
                        style={{ background: "transparent", color: "#0A1929" }}
                      />
                    </div>
                    {inputType && (
                      <span
                        className="flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-1 rounded-md flex-shrink-0"
                        style={{
                          background: inputType === "email" ? "#E3F2FD" : "#E8F5E9",
                          color: inputType === "email" ? "#1565C0" : "#2E7D32",
                        }}
                      >
                        {inputType === "email" ? <Mail className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                        {inputType}
                      </span>
                    )}
                  </div>

                  {/* Check Button */}
                  <button
                    onClick={handleCheck}
                    disabled={!input.trim() || !inputType}
                    className="w-full flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold text-white transition-all"
                    style={{
                      background: input.trim() && inputType
                        ? "linear-gradient(135deg, #D32F2F 0%, #B71C1C 100%)"
                        : "#BDBDBD",
                      boxShadow: input.trim() && inputType
                        ? "0 4px 20px rgba(211,47,47,0.3)"
                        : "none",
                    }}
                  >
                    <ShieldAlert className="h-4 w-4" />
                    Check Now — Free
                  </button>

                  {state === "error" && (
                    <p className="text-center text-sm" style={{ color: "#C62828" }}>
                      {errorMsg}
                    </p>
                  )}

                  {/* Trust badges */}
                  <div className="flex items-center justify-center gap-5 flex-wrap">
                    {["No account required", "Instant results", "100% free"].map((t) => (
                      <div key={t} className="flex items-center gap-1.5">
                        <CheckCircle className="h-3 w-3" style={{ color: "#2E7D32" }} />
                        <span className="text-[11px] font-medium" style={{ color: "#90A4AE" }}>{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── CHECKING STATE ── */}
              {state === "checking" && (
                <div className="space-y-6 py-4">
                  {/* Pulsing shield */}
                  <div className="relative mx-auto" style={{ width: 120, height: 120 }}>
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="absolute inset-0 rounded-full"
                        style={{
                          background: "rgba(211,47,47,0.08)",
                          animation: `scam-shield-pulse 2s ease-out infinite ${i * 0.5}s`,
                        }}
                      />
                    ))}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <ShieldAlert
                        className="h-12 w-12"
                        style={{ color: "#D32F2F", animation: "scam-shield-glow 2s ease-in-out infinite" }}
                      />
                    </div>
                  </div>

                  <p className="text-center text-sm font-semibold" style={{ color: "#0A1929" }}>
                    Checking <span style={{ color: "#D32F2F" }}>{input.trim()}</span>
                  </p>

                  {/* Steps */}
                  <div className="space-y-2.5 max-w-xs mx-auto">
                    {steps.map((step, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                          {i < stepIndex
                            ? <CheckCircle className="h-4 w-4" style={{ color: "#2E7D32" }} />
                            : i === stepIndex
                            ? <Loader2 className="h-4 w-4 animate-spin" style={{ color: "#D32F2F" }} />
                            : <div className="w-2 h-2 rounded-full" style={{ background: "#CFD8DC" }} />}
                        </div>
                        <span className="text-sm" style={{ color: i <= stepIndex ? "#0A1929" : "#B0BEC5" }}>
                          {step}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── COMPLETE STATE ── */}
              {state === "complete" && result && (
                <div className="space-y-5">
                  {/* Score + Trust Level */}
                  <div className="flex items-center gap-5">
                    {/* Risk gauge */}
                    <div className="flex-shrink-0" style={{ width: 100, height: 100 }}>
                      <div className="relative flex items-center justify-center" style={{ width: 100, height: 100 }}>
                        <div style={{
                          position: "absolute", inset: 0, borderRadius: "50%",
                          background: `conic-gradient(${riskColor} ${riskAngle}deg, #ECEFF1 ${riskAngle}deg)`,
                          boxShadow: `0 0 20px ${riskColor}15`,
                        }} />
                        <div
                          className="relative flex flex-col items-center justify-center rounded-full"
                          style={{ width: 76, height: 76, background: "#FFFFFF" }}
                        >
                          <span className="text-2xl font-black" style={{ color: riskColor }}>{result.riskScore}</span>
                          <span className="text-[9px] font-semibold" style={{ color: "#90A4AE" }}>Risk</span>
                        </div>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "#90A4AE" }}>
                        {result.type === "url" ? "Website Check" : "Email Check"}
                      </p>
                      <p className="text-base font-black truncate mb-2" style={{ color: "#0A1929" }}>
                        {result.input}
                      </p>
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full"
                        style={{
                          background: TRUST_COLORS[result.trustLevel].bg,
                          color: TRUST_COLORS[result.trustLevel].color,
                          border: `1px solid ${TRUST_COLORS[result.trustLevel].border}`,
                        }}
                      >
                        {result.trustLevel === "safe"
                          ? <ShieldCheck className="h-3.5 w-3.5" />
                          : result.trustLevel === "suspicious"
                          ? <AlertTriangle className="h-3.5 w-3.5" />
                          : <ShieldX className="h-3.5 w-3.5" />}
                        {TRUST_LABELS[result.trustLevel]}
                      </span>
                    </div>
                  </div>

                  {/* Findings (expandable) */}
                  {result.findings.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#90A4AE" }}>
                        Findings ({result.findings.length})
                      </p>
                      {result.findings.map((f, i) => {
                        const Icon = FINDING_ICONS[f.type];
                        const fc = FINDING_COLORS[f.type];
                        const isExpanded = expandedFinding === i;
                        return (
                          <button
                            key={i}
                            onClick={() => setExpandedFinding(isExpanded ? null : i)}
                            className="w-full text-left rounded-xl p-3 transition-all"
                            style={{
                              background: `${fc}08`,
                              border: `1px solid ${fc}20`,
                            }}
                          >
                            <div className="flex items-start gap-2.5">
                              <Icon className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: fc }} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-semibold" style={{ color: "#0A1929" }}>
                                    {f.title}
                                  </span>
                                  <span
                                    className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded flex-shrink-0"
                                    style={{ background: `${fc}15`, color: fc }}
                                  >
                                    {f.type}
                                  </span>
                                </div>
                                {isExpanded && (
                                  <p className="text-xs mt-2 leading-relaxed" style={{ color: "#546E7A" }}>
                                    {f.detail}
                                  </p>
                                )}
                                {!isExpanded && (
                                  <p className="text-[10px] mt-0.5" style={{ color: "#90A4AE" }}>
                                    Tap to see details
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Details table */}
                  {result.details.length > 0 && (
                    <div className="rounded-xl p-4" style={{ background: "#F5F7FA", border: "1px solid #ECEFF1" }}>
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "#90A4AE" }}>
                        Technical Details
                      </p>
                      <div className="space-y-0">
                        {result.details.map((d, i) => {
                          const sc = d.status === "good" ? "#2E7D32" : d.status === "warning" ? "#E65100" : "#C62828";
                          return (
                            <div
                              key={i}
                              className="flex items-center justify-between py-2"
                              style={{ borderBottom: i < result.details.length - 1 ? "1px solid #E0E0E0" : "none" }}
                            >
                              <span className="text-xs font-medium" style={{ color: "#78909C" }}>{d.label}</span>
                              <span className="text-xs font-bold" style={{ color: sc }}>{d.value}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      onClick={reset}
                      className="flex-1 text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors"
                      style={{ background: "#F5F5F5", color: "#546E7A", border: "1px solid #E0E0E0" }}
                    >
                      Check Another
                    </button>
                    <a
                      href="/services/cybersecurity"
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-lg text-white text-center"
                      style={{ background: "linear-gradient(135deg, #1565C0, #7c3aed)", boxShadow: "0 2px 12px rgba(21,101,192,0.3)" }}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" /> Get Full Security Audit
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
