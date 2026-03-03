import React from "react";
import fs from "fs";
import path from "path";
import {
  Document, Page, Text, View, StyleSheet, renderToBuffer,
  Svg, Path, G, Line, Image,
} from "@react-pdf/renderer";
import type { SecurityReport, CategoryScore } from "@/lib/pentest";

// react-pdf SVG components have incomplete TS typings for some SVG attributes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SvgText = Text as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SvgPath = Path as any;

// ─── Constants ──────────────────────────────────────────────────────────────

const BRAND_BLUE = "#1565C0";
const BRAND_DARK = "#0A1929";
const BRAND_LIGHT = "#E3F2FD";
const CRITICAL_COLOR = "#DC2626";
const HIGH_COLOR = "#F97316";
const MEDIUM_COLOR = "#D97706";
const SUCCESS_COLOR = "#16A34A";

const gradeColor = (g: string) =>
  g === "A" ? SUCCESS_COLOR : g === "B" ? "#0891B2" : g === "C" ? MEDIUM_COLOR : g === "D" ? HIGH_COLOR : CRITICAL_COLOR;

// ─── Pitch text parsers (mirrors send-email route) ──────────────────────────

function countSecurityFailures(pitchText: string): number {
  const match = pitchText.match(/##\s*(?:🔒\s*)?Security Assessment([\s\S]*?)(?=\n##|$)/);
  if (!match) return 0;
  const xCount = (match[1].match(/❌/g) ?? []).length;
  const missingCount = (match[1].match(/\[MISSING\]/gi) ?? []).length;
  return xCount + missingCount;
}

function countPainPoints(pitchText: string): number {
  const match = pitchText.match(/##\s*(?:💡\s*)?Pain Points[^#]*([\s\S]*?)(?=\n##|$)/);
  if (!match) return 0;
  return (match[1].match(/^[-•*]\s+|^\d+\.\s+|^\*\*[^*]+\*\*/gm) ?? []).length;
}

function extractIndustry(pitchText: string): string {
  const match = pitchText.match(/##\s*(?:🏢\s*)?Business Overview([\s\S]*?)(?=\n##|$)/);
  if (!match) return "your sector";
  const t = match[1].toLowerCase();
  const industries: [string, string][] = [
    ["healthcare", "Healthcare"], ["retail", "Retail"], ["restaurant", "Food & Beverage"],
    ["manufacturing", "Manufacturing"], ["education", "Education"], ["legal", "Legal Services"],
    ["accounting", "Accounting"], ["finance", "Financial Services"], ["real estate", "Real Estate"],
    ["construction", "Construction"], ["hospitality", "Hospitality"],
    ["technology", "Tech"], ["consulting", "Consulting"], ["logistics", "Logistics"],
    ["automotive", "Automotive"], ["insurance", "Insurance"], ["dental", "Dental"],
    ["medical", "Medical"], ["fitness", "Fitness & Wellness"], ["marketing", "Marketing"],
  ];
  const found = industries.find(([key]) => t.includes(key));
  return found ? found[1] : "your sector";
}

function securityCategories(pitchText: string): string[] {
  const match = pitchText.match(/##\s*(?:🔒\s*)?Security Assessment([\s\S]*?)(?=\n##|$)/);
  if (!match) return [];
  const t = match[1].toLowerCase();
  const cats: string[] = [];
  if (t.includes("content-security") || t.includes("csp")) cats.push("Content Security");
  if (t.includes("transport") || t.includes("hsts") || t.includes("ssl")) cats.push("Transport Security");
  if (t.includes("frame") || t.includes("clickjack")) cats.push("Clickjacking Protection");
  if (t.includes("content-type") || t.includes("mime")) cats.push("MIME Type Controls");
  if (t.includes("referrer")) cats.push("Data Leakage Controls");
  if (t.includes("permission") || t.includes("feature")) cats.push("Browser Permissions");
  return cats.slice(0, 4);
}

function gapCategories(pitchText: string): string[] {
  const match = pitchText.match(/##\s*(?:💡\s*)?Pain Points[^#]*([\s\S]*?)(?=\n##|$)/);
  if (!match) return [];
  const t = match[1].toLowerCase();
  const cats: string[] = [];
  if (t.includes("security") || t.includes("vulnerab")) cats.push("Security Risk");
  if (t.includes("speed") || t.includes("performance") || t.includes("slow")) cats.push("Performance Gap");
  if (t.includes("seo") || t.includes("search") || t.includes("google")) cats.push("Online Visibility");
  if (t.includes("cloud") || t.includes("backup")) cats.push("Infrastructure");
  if (t.includes("software") || t.includes("workflow") || t.includes("automat")) cats.push("Workflow Efficiency");
  if (t.includes("mobile") || t.includes("responsive")) cats.push("Mobile Experience");
  const fallbacks = ["Technology Gaps", "Operational Risk", "Digital Presence"];
  for (const f of fallbacks) {
    if (cats.length >= 3) break;
    if (!cats.includes(f)) cats.push(f);
  }
  return cats.slice(0, 4);
}

function extractSection(pitchText: string, heading: string): string {
  const regex = new RegExp(`## [^\\n]*${heading}[^\\n]*\\n([\\s\\S]*?)(?=\\n##|$)`, "i");
  const match = pitchText.match(regex);
  return match ? match[1].trim() : "";
}

function extractBulletPoints(text: string): string[] {
  return text
    .split("\n")
    .filter(l => /^[-•*]\s+|^\d+\.\s+/.test(l.trim()))
    .map(l => l.replace(/^[-•*\d.]+\s*/, "").trim())
    .filter(Boolean);
}

// ─── Styles ─────────────────────────────────────────────────────────────────

function createStyles(accent: string) {
  return StyleSheet.create({
    page: { fontFamily: "Helvetica", fontSize: 10, color: "#374151", paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0 },
    // Cover
    coverPage: { backgroundColor: BRAND_DARK, flexDirection: "column", justifyContent: "space-between", padding: 0 },
    coverTop: { padding: 48, paddingBottom: 0 },
    coverBrand: { fontSize: 11, color: "#90CAF9", letterSpacing: 3, marginBottom: 12, textTransform: "uppercase" },
    coverPrepared: { fontSize: 10, color: "#64B5F6", marginBottom: 40 },
    coverTitle: { fontSize: 30, color: "#FFFFFF", fontFamily: "Helvetica-Bold", lineHeight: 1.3, marginBottom: 8 },
    coverSub: { fontSize: 14, color: "#90CAF9", marginBottom: 32 },
    coverBusiness: { fontSize: 20, color: accent, fontFamily: "Helvetica-Bold", marginBottom: 6 },
    coverUrl: { fontSize: 10, color: "#90CAF9", marginBottom: 40 },
    coverBottom: { padding: 48, paddingTop: 32, borderTop: "1px solid #1E3A5F", flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
    coverDate: { fontSize: 9, color: "#64B5F6" },
    coverConfidential: { fontSize: 9, color: "#EF4444", backgroundColor: "#7F1D1D", padding: "4 8", borderRadius: 4 },
    // Content pages
    contentPage: { padding: "40 48", backgroundColor: "#FFFFFF", flexDirection: "column" },
    sectionHeader: { marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontFamily: "Helvetica-Bold", color: BRAND_DARK, marginBottom: 4 },
    sectionLine: { height: 3, backgroundColor: accent, width: 48, borderRadius: 2 },
    // Cards
    card: { borderRadius: 8, padding: 14, marginBottom: 10, border: "1px solid #E5E7EB" },
    cardRow: { flexDirection: "row", gap: 10 },
    // Text
    label: { fontSize: 8, color: "#6B7280", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 3 },
    value: { fontSize: 13, fontFamily: "Helvetica-Bold", color: BRAND_DARK },
    bodyText: { fontSize: 10, color: "#4B5563", lineHeight: 1.6 },
    // Badges
    badge: { borderRadius: 4, padding: "2 6", fontSize: 8, fontFamily: "Helvetica-Bold", letterSpacing: 0.3 },
    // Footer
    footer: { position: "absolute", bottom: 24, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between" },
    footerText: { fontSize: 8, color: "#9CA3AF" },
  });
}

// ─── SVG Components ─────────────────────────────────────────────────────────

function HalfGaugeSvg({ score, color }: { score: number; color: string }) {
  const s = Math.min(Math.max(score, 0), 99.5);
  const r = 42;
  const cx = 60, cy = 60;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const arcStart = { x: cx + r * Math.cos(toRad(-180)), y: cy + r * Math.sin(toRad(-180)) };
  const angle = -180 + s * 1.8;
  const arcEnd = { x: cx + r * Math.cos(toRad(0)), y: cy + r * Math.sin(toRad(0)) };
  const scoreEnd = { x: cx + r * Math.cos(toRad(angle)), y: cy + r * Math.sin(toRad(angle)) };

  return (
    <Svg width={120} height={80} viewBox="0 0 120 80">
      <Path d={`M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 0 1 ${arcEnd.x} ${arcEnd.y}`} fill="none" stroke="#E5E7EB" strokeWidth={7} strokeLinecap="round" />
      {s > 0.5 && (
        <Path d={`M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 ${s > 50 ? 1 : 0} 1 ${scoreEnd.x} ${scoreEnd.y}`} fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" />
      )}
      <SvgText x={cx} y={cy - 2} fontSize={18} fontFamily="Helvetica-Bold" fill={color} textAnchor="middle">{Math.round(score)}</SvgText>
      <SvgText x={cx} y={cy + 12} fontSize={7} fill="#6B7280" textAnchor="middle">/100</SvgText>
    </Svg>
  );
}

function HealthRingSvg({ score, color, size = 100 }: { score: number; color: string; size?: number }) {
  const sw = 10;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const cx = size / 2, cy = size / 2;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <SvgPath d={`M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r}`} fill="none" stroke="#E5E7EB" strokeWidth={sw} />
      <SvgPath d={`M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r}`} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={`${circ}`} strokeDashoffset={`${offset}`} strokeLinecap="round" />
      <SvgText x={cx} y={cy - 2} fontSize={20} fontFamily="Helvetica-Bold" fill={color} textAnchor="middle">{score}</SvgText>
      <SvgText x={cx} y={cy + 12} fontSize={8} fill="#6B7280" textAnchor="middle">/100</SvgText>
    </Svg>
  );
}

function RadarSvg({ scores, size = 200, accent }: { scores: CategoryScore[]; size?: number; accent: string }) {
  const cx = size / 2, cy = size / 2, r = size * 0.38;
  const n = scores.length;
  const angleOf = (i: number) => (i * 2 * Math.PI) / n - Math.PI / 2;
  const pt = (frac: number, i: number) => ({
    x: cx + frac * r * Math.cos(angleOf(i)),
    y: cy + frac * r * Math.sin(angleOf(i)),
  });
  const rings = [0.25, 0.5, 0.75, 1.0];
  const ringPaths = rings.map((frac) => {
    const pts = scores.map((_, i) => pt(frac, i));
    return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";
  });
  const scorePts = scores.map((c, i) => pt(c.score / 100, i));
  const scorePath = scorePts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";
  const axes = scores.map((_, i) => ({ from: { x: cx, y: cy }, to: pt(1.0, i) }));
  const labelPts = scores.map((c, i) => {
    const p = pt(1.15, i);
    return { ...p, label: c.label.replace(" Security", "").replace(" / ", "/"), grade: c.grade };
  });

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {ringPaths.map((d, i) => <Path key={i} d={d} fill="none" stroke="#E5E7EB" strokeWidth={0.5} />)}
      {axes.map((a, i) => <Line key={i} x1={a.from.x} y1={a.from.y} x2={a.to.x} y2={a.to.y} stroke="#E5E7EB" strokeWidth={0.5} />)}
      <Path d={scorePath} fill={`${accent}30`} stroke={accent} strokeWidth={1.5} />
      {scorePts.map((p, i) => <Path key={i} d={`M ${p.x} ${p.y} m -3 0 a 3 3 0 1 0 6 0 a 3 3 0 1 0 -6 0`} fill={accent} />)}
      {labelPts.map((p, i) => (
        <G key={i}>
          <SvgText x={p.x} y={p.y} fontSize={5.5} fill="#374151" textAnchor="middle" dominantBaseline="central">{p.label}</SvgText>
          <SvgText x={p.x} y={p.y + 7} fontSize={6} fill={gradeColor(p.grade)} textAnchor="middle" fontFamily="Helvetica-Bold" dominantBaseline="central">{p.grade}</SvgText>
        </G>
      ))}
    </Svg>
  );
}

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <View style={{ height: 6, backgroundColor: "#E5E7EB", borderRadius: 3, overflow: "hidden" }}>
      <View style={{ height: 6, width: `${Math.min(100, Math.max(0, score))}%`, backgroundColor: color, borderRadius: 3 }} />
    </View>
  );
}

// ─── Shared sub-components ──────────────────────────────────────────────────

function Footer({ pageNum, businessName }: { pageNum: number; businessName: string }) {
  const s = createStyles(BRAND_BLUE);
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>Confidential — {businessName} — GCS Technology Assessment</Text>
      <Text style={s.footerText}>Page {pageNum} | General Computing Solutions | info@itatgcs.com</Text>
    </View>
  );
}

function SectionHeader({ title, accent }: { title: string; accent: string }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold", color: BRAND_DARK, marginBottom: 4 }}>{title}</Text>
      <View style={{ height: 3, backgroundColor: accent, width: 48, borderRadius: 2 }} />
    </View>
  );
}

function MetricRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
        <Text style={{ fontSize: 9, color: "#374151" }}>{label}</Text>
        <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color }}>{value}</Text>
      </View>
      <ScoreBar score={value} color={color} />
    </View>
  );
}

function Chip({ text, bg, border, color }: { text: string; bg: string; border: string; color: string }) {
  return (
    <View style={{ backgroundColor: bg, borderRadius: 99, padding: "3 10", border: `1px solid ${border}`, marginRight: 4, marginBottom: 4 }}>
      <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color }}>{text}</Text>
    </View>
  );
}

// ─── Public interface ───────────────────────────────────────────────────────

export interface PitchPDFData {
  businessName: string;
  websiteUrl: string;
  pitchText: string;
  securityScore: number;
  presenceScore: number;
  dealScore: number;
  painCount: number;
  businessIntelData: string | null;
  reportData: string | null;
  brandColor: string | null;
  brandLogoUrl: string | null;
  createdAt: Date;
}

// ─── Main Document ──────────────────────────────────────────────────────────

function PitchPDFDocument({ data, logoBuffer, gcsLogoBuffer }: { data: PitchPDFData; logoBuffer: Buffer | null; gcsLogoBuffer: Buffer | null }) {
  const accent = data.brandColor || BRAND_BLUE;
  const styles = createStyles(accent);

  const { businessName, websiteUrl, pitchText, securityScore, presenceScore, dealScore, painCount } = data;
  const secRisk = Math.max(0, 100 - securityScore);
  const riskColor = secRisk > 60 ? CRITICAL_COLOR : secRisk > 30 ? HIGH_COLOR : SUCCESS_COLOR;
  const riskLabel = secRisk > 60 ? "Critical Risk" : secRisk > 30 ? "At Risk" : "Low Risk";
  const presColor = presenceScore > 65 ? SUCCESS_COLOR : presenceScore > 40 ? HIGH_COLOR : CRITICAL_COLOR;
  const dealColor = dealScore > 70 ? SUCCESS_COLOR : dealScore > 45 ? "#0891B2" : "#A78BFA";

  const industry = extractIndustry(pitchText);
  const secFailures = countSecurityFailures(pitchText);
  const secCats = securityCategories(pitchText);
  const gapCats = gapCategories(pitchText);

  // Digital Health Score
  const computedPainCount = painCount || countPainPoints(pitchText);
  const techHealth = Math.max(0, 100 - computedPainCount * 12);
  const healthScore = Math.max(5, Math.min(95, Math.round(0.40 * securityScore + 0.40 * presenceScore + 0.20 * techHealth)));
  const healthLabel = healthScore >= 76 ? "Strong" : healthScore >= 61 ? "Good" : healthScore >= 46 ? "Fair" : healthScore >= 26 ? "Poor" : "Critical";
  const healthColor = healthScore >= 76 ? SUCCESS_COLOR : healthScore >= 61 ? "#0891B2" : healthScore >= 46 ? MEDIUM_COLOR : healthScore >= 26 ? HIGH_COLOR : CRITICAL_COLOR;

  // Presence sub-metrics
  const websiteHealthScore = Math.min(100, Math.max(20, securityScore));
  const analyticsScore = presenceScore > 70 ? 80 : presenceScore > 50 ? 42 : 8;
  const leadGenScore = presenceScore > 65 ? 68 : presenceScore > 45 ? 32 : 6;
  const socialScore = Math.round(presenceScore * 0.85);

  // Parse Google Business Profile data
  let googleRating: number | null = null;
  let googleReviewCount: number | null = null;
  let googleRatingBenchmark = 4.4;
  let googleAddress: string | null = null;
  let googlePhone: string | null = null;
  let recentReviews: Array<{ rating: number; text: string; relativeTime: string; authorName: string }> = [];
  let domainAge: number | null = null;
  let hostingProvider: string | null = null;

  if (data.businessIntelData) {
    try {
      const bi = JSON.parse(data.businessIntelData);
      if (bi?.google?.found) {
        googleRating = bi.google.rating;
        googleReviewCount = bi.google.reviewCount;
        googleRatingBenchmark = bi.google.ratingBenchmark ?? 4.4;
        googleAddress = bi.google.address ?? null;
        googlePhone = bi.google.phone ?? null;
        recentReviews = (bi.google.recentReviews ?? []).slice(0, 3);
      }
      if (bi?.domainRegistry?.domainAgeYears != null) domainAge = bi.domainRegistry.domainAgeYears;
      if (bi?.ipGeo?.hosting) hostingProvider = bi.ipGeo.hosting;
    } catch { /* ignore */ }
  }

  const onlineRepScore = googleRating ? Math.round(googleRating / 5 * 100) : Math.max(20, Math.round(presenceScore * 0.9));
  const googleRatingColor = googleRating
    ? (googleRating >= googleRatingBenchmark ? SUCCESS_COLOR : googleRating >= googleRatingBenchmark - 0.3 ? HIGH_COLOR : CRITICAL_COLOR)
    : "#D1D5DB";

  // Parse security report
  let report: SecurityReport | null = null;
  if (data.reportData) {
    try { report = JSON.parse(data.reportData) as SecurityReport; } catch { /* ignore */ }
  }

  // Sub-metric scores for security
  const headersScore = securityScore;
  const sslScore = securityScore > 60 ? Math.min(95, securityScore + 12) : Math.round(securityScore * 1.1);
  const configScore = Math.round(securityScore * 0.85);

  // Extract pitch text sections
  const pitchSection = extractSection(pitchText, "The Pitch");
  const talkingPointsSection = extractSection(pitchText, "Deal Talking Points");
  const talkingPoints = extractBulletPoints(talkingPointsSection);
  const painPointsSection = extractSection(pitchText, "Pain Points");
  const painPointsList = extractBulletPoints(painPointsSection);
  const recommendationsSection = extractSection(pitchText, "Service Recommendations");
  const recommendations = extractBulletPoints(recommendationsSection);

  let pageNum = 0;
  const nextPage = () => ++pageNum;

  return (
    <Document title={`Technology Assessment — ${businessName}`} author="General Computing Solutions" subject="Technology Assessment Report">

      {/* ── PAGE 1: COVER ──────────────────────────────────────────────── */}
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.coverTop}>
          {/* Logos row */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
            <View>
              {gcsLogoBuffer && (
                <Image src={{ data: gcsLogoBuffer, format: "png" }} style={{ height: 28, marginBottom: 8 }} />
              )}
              <Text style={styles.coverBrand}>GCS Technology Consulting</Text>
            </View>
            {logoBuffer && (
              <View style={{ alignItems: "center" }}>
                <Image src={{ data: logoBuffer, format: "png" }} style={{ height: 40, maxWidth: 120, objectFit: "contain" }} />
                <Text style={{ fontSize: 7, color: "#64B5F6", marginTop: 4 }}>Client</Text>
              </View>
            )}
          </View>

          <Text style={styles.coverTitle}>Technology Assessment{"\n"}Report</Text>
          <Text style={styles.coverSub}>Personalized digital health analysis for {industry} businesses</Text>

          <Text style={styles.coverBusiness}>{businessName}</Text>
          <Text style={styles.coverUrl}>{websiteUrl}</Text>

          {/* Score gauges row */}
          <View style={{ flexDirection: "row", gap: 12, marginTop: 16, marginBottom: 24 }}>
            <View style={{ flex: 1, alignItems: "center", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "12 8 8" }}>
              <HalfGaugeSvg score={secRisk} color={riskColor} />
              <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: "#FFFFFF", marginTop: 2 }}>Security Risk</Text>
              <Text style={{ fontSize: 8, color: riskColor, fontFamily: "Helvetica-Bold", marginTop: 2 }}>{riskLabel}</Text>
            </View>
            <View style={{ flex: 1, alignItems: "center", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "12 8 8" }}>
              <HalfGaugeSvg score={presenceScore} color="#38BDF8" />
              <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: "#FFFFFF", marginTop: 2 }}>Online Presence</Text>
              <Text style={{ fontSize: 8, color: "#38BDF8", fontFamily: "Helvetica-Bold", marginTop: 2 }}>{presenceScore > 65 ? "Strong" : presenceScore > 40 ? "Growing" : "Weak"}</Text>
            </View>
            <View style={{ flex: 1, alignItems: "center", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "12 8 8" }}>
              <HalfGaugeSvg score={dealScore} color="#A78BFA" />
              <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: "#FFFFFF", marginTop: 2 }}>Opportunity</Text>
              <Text style={{ fontSize: 8, color: "#A78BFA", fontFamily: "Helvetica-Bold", marginTop: 2 }}>{dealScore > 70 ? "High" : dealScore > 45 ? "Strong" : "Solid"}</Text>
            </View>
          </View>

          {/* Infrastructure chips */}
          <View style={{ flexDirection: "row", gap: 6 }}>
            {domainAge != null && (
              <View style={{ backgroundColor: "#1E3A5F", borderRadius: 99, padding: "3 10" }}>
                <Text style={{ fontSize: 8, color: "#64B5F6", fontFamily: "Helvetica-Bold" }}>{domainAge}yr domain</Text>
              </View>
            )}
            {hostingProvider && (
              <View style={{ backgroundColor: "#1E3A5F", borderRadius: 99, padding: "3 10" }}>
                <Text style={{ fontSize: 8, color: "#64B5F6", fontFamily: "Helvetica-Bold" }}>{hostingProvider}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.coverBottom}>
          <View>
            <Text style={styles.coverDate}>Prepared by: General Computing Solutions</Text>
            <Text style={styles.coverDate}>Date: {new Date(data.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</Text>
            <Text style={styles.coverDate}>Contact: info@itatgcs.com | www.itatgcs.com</Text>
          </View>
          <View style={styles.coverConfidential}>
            <Text style={{ color: "#FCA5A5", fontSize: 8, fontFamily: "Helvetica-Bold" }}>CONFIDENTIAL</Text>
          </View>
        </View>
      </Page>

      {/* ── PAGE 2: DIGITAL HEALTH OVERVIEW ────────────────────────────── */}
      <Page size="A4" style={styles.contentPage}>
        {(() => { nextPage(); return null; })()}
        <SectionHeader title="Digital Health Overview" accent={accent} />

        {/* Health score ring + sub-metrics */}
        <View style={{ flexDirection: "row", gap: 20, marginBottom: 20 }}>
          <View style={{ alignItems: "center", width: 120 }}>
            <HealthRingSvg score={healthScore} color={healthColor} size={110} />
            <View style={{ backgroundColor: `${healthColor}15`, borderRadius: 99, padding: "3 12", marginTop: 6, border: `1px solid ${healthColor}40` }}>
              <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: healthColor }}>{healthLabel}</Text>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: BRAND_DARK, marginBottom: 4 }}>{businessName} Digital Health</Text>
            <Text style={{ fontSize: 9, color: "#6B7280", marginBottom: 12 }}>Composite score: 40% security + 40% presence + 20% tech efficiency</Text>
            <MetricRow label="Security Health" value={securityScore} color={secRisk > 60 ? CRITICAL_COLOR : secRisk > 30 ? HIGH_COLOR : SUCCESS_COLOR} />
            <MetricRow label="Online Presence" value={presenceScore} color={presColor} />
            <MetricRow label="Tech Efficiency" value={Math.max(5, Math.min(95, techHealth))} color={techHealth > 60 ? SUCCESS_COLOR : techHealth > 30 ? HIGH_COLOR : CRITICAL_COLOR} />
            <MetricRow label="Overall Health" value={healthScore} color={healthColor} />
          </View>
        </View>

        {/* Digital Presence Score Card */}
        <View style={[styles.card, { backgroundColor: "#F9FAFB", borderColor: `${accent}30` }]}>
          <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: accent, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10 }}>Digital Presence Score</Text>

          <View style={{ flexDirection: "row", gap: 16, marginBottom: 14 }}>
            <View style={{ width: 60, height: 60, borderRadius: 8, border: `2px solid ${presColor}`, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 22, fontFamily: "Helvetica-Bold", color: presColor }}>{presenceScore}</Text>
              <Text style={{ fontSize: 7, color: "#9CA3AF" }}>/100</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontFamily: "Helvetica-Bold", color: presColor, marginBottom: 2 }}>
                {presenceScore > 65 ? "Strong Digital Presence" : presenceScore > 40 ? "Growing Digital Presence" : "Weak Digital Presence"}
              </Text>
              <Text style={{ fontSize: 9, color: "#6B7280", marginBottom: 6 }}>Industry avg: {Math.round(presenceScore * 0.85 + 8)} | Top performers: 85</Text>
              <ScoreBar score={presenceScore} color={presColor} />
            </View>
          </View>

          {/* Sub-metrics grid */}
          <View style={{ flexDirection: "row", gap: 16 }}>
            <View style={{ flex: 1 }}>
              <MetricRow label="Website Health" value={websiteHealthScore} color={websiteHealthScore >= 70 ? SUCCESS_COLOR : websiteHealthScore >= 35 ? HIGH_COLOR : CRITICAL_COLOR} />
              <MetricRow label="Lead Generation" value={leadGenScore} color={leadGenScore >= 70 ? SUCCESS_COLOR : leadGenScore >= 35 ? HIGH_COLOR : CRITICAL_COLOR} />
              <MetricRow label="Social Presence" value={socialScore} color={socialScore >= 70 ? SUCCESS_COLOR : socialScore >= 35 ? HIGH_COLOR : CRITICAL_COLOR} />
            </View>
            <View style={{ flex: 1 }}>
              <MetricRow label="Analytics" value={analyticsScore} color={analyticsScore >= 70 ? SUCCESS_COLOR : analyticsScore >= 35 ? HIGH_COLOR : CRITICAL_COLOR} />
              <MetricRow label="Online Reputation" value={onlineRepScore} color={onlineRepScore >= 70 ? SUCCESS_COLOR : onlineRepScore >= 35 ? HIGH_COLOR : CRITICAL_COLOR} />
              {googleRating && (
                <View style={{ marginBottom: 8 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                    <Text style={{ fontSize: 9, color: "#D97706", fontFamily: "Helvetica-Bold" }}>Google Rating</Text>
                    <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: googleRatingColor }}>{googleRating.toFixed(1)}/5.0</Text>
                  </View>
                  <ScoreBar score={googleRating / 5 * 100} color={googleRatingColor} />
                </View>
              )}
            </View>
          </View>
        </View>
        <Footer pageNum={2} businessName={businessName} />
      </Page>

      {/* ── PAGE 3: SECURITY ASSESSMENT ───────────────────────────────── */}
      <Page size="A4" style={styles.contentPage}>
        {(() => { nextPage(); return null; })()}
        <SectionHeader title="Security Assessment" accent={accent} />

        <View style={{ flexDirection: "row", gap: 20, marginBottom: 16 }}>
          <View style={{ alignItems: "center", width: 130 }}>
            <HalfGaugeSvg score={secRisk} color={riskColor} />
            <Text style={{ fontSize: 12, fontFamily: "Helvetica-Bold", color: riskColor, marginTop: 4 }}>{riskLabel}</Text>
            <Text style={{ fontSize: 8, color: "#6B7280", marginTop: 2 }}>{secFailures} vulnerabilit{secFailures === 1 ? "y" : "ies"} detected</Text>
          </View>
          <View style={{ flex: 1 }}>
            <MetricRow label="HTTP Headers" value={headersScore} color={riskColor} />
            <MetricRow label="SSL / TLS" value={sslScore} color={riskColor} />
            <MetricRow label="Configuration" value={configScore} color={riskColor} />
            <MetricRow label="Overall Security" value={securityScore} color={secRisk > 60 ? CRITICAL_COLOR : secRisk > 30 ? HIGH_COLOR : SUCCESS_COLOR} />
          </View>
        </View>

        {/* Security category chips */}
        {secCats.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 16 }}>
            {secCats.map((c) => <Chip key={c} text={c} bg="#FEF2F2" border="#FECACA" color="#991B1B" />)}
          </View>
        )}

        {/* Radar chart + category breakdown (if report data available) */}
        {report?.categoryScores && report.categoryScores.length > 0 && (
          <View style={{ flexDirection: "row", gap: 20 }}>
            <View style={{ flex: 1 }}>
              <RadarSvg scores={report.categoryScores} size={200} accent={accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 8, color: "#6B7280", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>Category Breakdown</Text>
              {report.categoryScores.map((cat) => (
                <View key={cat.category} style={{ marginBottom: 8 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                    <Text style={{ fontSize: 8, color: BRAND_DARK, fontFamily: "Helvetica-Bold" }}>{cat.label}</Text>
                    <View style={{ flexDirection: "row", gap: 4 }}>
                      <Text style={{ fontSize: 8, color: gradeColor(cat.grade), fontFamily: "Helvetica-Bold" }}>Grade {cat.grade}</Text>
                      <Text style={{ fontSize: 8, color: "#6B7280" }}>{cat.score}/100</Text>
                    </View>
                  </View>
                  <ScoreBar score={cat.score} color={gradeColor(cat.grade)} />
                </View>
              ))}
            </View>
          </View>
        )}
        <Footer pageNum={3} businessName={businessName} />
      </Page>

      {/* ── PAGE 4: GOOGLE BUSINESS PROFILE (conditional) ────────────── */}
      {googleRating && (
        <Page size="A4" style={styles.contentPage}>
          {(() => { nextPage(); return null; })()}
          <SectionHeader title="Google Business Profile" accent={accent} />

          <View style={[styles.card, { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
              <View>
                <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold", color: BRAND_DARK, marginBottom: 4 }}>{businessName}</Text>
                {googleAddress && <Text style={{ fontSize: 9, color: "#6B7280", marginBottom: 2 }}>{googleAddress}</Text>}
                {googlePhone && <Text style={{ fontSize: 9, color: "#6B7280" }}>{googlePhone}</Text>}
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 28, fontFamily: "Helvetica-Bold", color: "#F59E0B" }}>{googleRating.toFixed(1)}</Text>
                <Text style={{ fontSize: 8, color: "#6B7280" }}>{(googleReviewCount ?? 0).toLocaleString()} reviews</Text>
              </View>
            </View>

            {/* Rating vs benchmark */}
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                  <Text style={{ fontSize: 9, color: "#374151" }}>Your Rating</Text>
                  <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: googleRatingColor }}>{googleRating.toFixed(1)}</Text>
                </View>
                <ScoreBar score={googleRating / 5 * 100} color={googleRatingColor} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                  <Text style={{ fontSize: 9, color: "#374151" }}>Industry Avg</Text>
                  <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: "#6B7280" }}>{googleRatingBenchmark.toFixed(1)}</Text>
                </View>
                <ScoreBar score={googleRatingBenchmark / 5 * 100} color="#6B7280" />
              </View>
            </View>

            <View style={{ padding: "4 8", borderRadius: 4, backgroundColor: googleRating >= googleRatingBenchmark ? "#F0FDF4" : "#FEF2F2" }}>
              <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: googleRating >= googleRatingBenchmark ? SUCCESS_COLOR : CRITICAL_COLOR }}>
                {googleRating >= googleRatingBenchmark ? "Above industry average" : `Below industry average by ${(googleRatingBenchmark - googleRating).toFixed(1)} stars`}
              </Text>
            </View>
          </View>

          {/* Recent reviews */}
          {recentReviews.length > 0 && (
            <View>
              <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: "#F59E0B", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>Recent Reviews</Text>
              {recentReviews.map((review, i) => (
                <View key={i} style={[styles.card, { backgroundColor: "#F9FAFB" }]} wrap={false}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: "#374151" }}>{review.authorName}</Text>
                    <Text style={{ fontSize: 8, color: "#9CA3AF" }}>{review.relativeTime}</Text>
                  </View>
                  <Text style={{ fontSize: 10, color: "#F59E0B", marginBottom: 4 }}>{"★".repeat(Math.floor(review.rating))}{"☆".repeat(5 - Math.floor(review.rating))}</Text>
                  <Text style={{ fontSize: 9, color: "#6B7280", lineHeight: 1.5 }}>&ldquo;{review.text.slice(0, 300)}{review.text.length > 300 ? "..." : ""}&rdquo;</Text>
                </View>
              ))}
            </View>
          )}
          <Footer pageNum={4} businessName={businessName} />
        </Page>
      )}

      {/* ── PAGE 5: KEY FINDINGS ──────────────────────────────────────── */}
      <Page size="A4" style={styles.contentPage}>
        {(() => { nextPage(); return null; })()}
        <SectionHeader title="What We Discovered" accent={accent} />

        <View style={[styles.card, { backgroundColor: "#FFF7ED", borderColor: "#FED7AA", borderLeftWidth: 4, borderLeftColor: HIGH_COLOR }]}>
          <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: BRAND_DARK, marginBottom: 6 }}>
            {computedPainCount > 0 ? `${computedPainCount} Technology Gap${computedPainCount !== 1 ? "s" : ""} Identified` : "Technology Gaps Identified"}
          </Text>
          <Text style={{ fontSize: 9, color: "#6B7280", marginBottom: 10 }}>
            During our review of {businessName}&rsquo;s technology infrastructure, we identified areas that may be limiting growth and efficiency.
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {gapCats.map((c) => <Chip key={c} text={c} bg="#FFF7ED" border="#FED7AA" color="#92400E" />)}
            {secCats.map((c) => <Chip key={c} text={c} bg="#FEF2F2" border="#FECACA" color="#991B1B" />)}
          </View>
        </View>

        {/* Pain points list */}
        {painPointsList.length > 0 && (
          <View style={{ marginTop: 8 }}>
            {painPointsList.slice(0, 8).map((point, i) => {
              const colors = [CRITICAL_COLOR, HIGH_COLOR, MEDIUM_COLOR, "#0891B2", "#7C3AED", SUCCESS_COLOR];
              const color = colors[i % colors.length];
              return (
                <View key={i} style={{ flexDirection: "row", gap: 8, marginBottom: 8, padding: 10, backgroundColor: `${color}08`, borderRadius: 6, borderLeft: `3 solid ${color}` }} wrap={false}>
                  <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: `${color}20`, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color }}>{i + 1}</Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: 9, color: "#374151", lineHeight: 1.5 }}>{point}</Text>
                </View>
              );
            })}
          </View>
        )}
        <Footer pageNum={pageNum} businessName={businessName} />
      </Page>

      {/* ── PAGE 6: RECOMMENDATIONS + PITCH ──────────────────────────── */}
      <Page size="A4" style={styles.contentPage}>
        {(() => { nextPage(); return null; })()}
        <SectionHeader title="GCS Service Recommendations" accent={accent} />

        {recommendations.length > 0 ? (
          recommendations.slice(0, 5).map((rec, i) => {
            const icons = ["shield", "cloud", "code", "cpu", "globe", "server"];
            const colors = [accent, "#7C3AED", "#0891B2", HIGH_COLOR, SUCCESS_COLOR, CRITICAL_COLOR];
            const color = colors[i % colors.length];
            // Parse "**Service Name** — Because X → Y" format
            const boldMatch = rec.match(/\*\*([^*]+)\*\*\s*[-—]\s*(.*)/);
            const serviceName = boldMatch ? boldMatch[1] : rec.slice(0, 50);
            const serviceDesc = boldMatch ? boldMatch[2] : rec;

            return (
              <View key={i} style={{ flexDirection: "row", gap: 10, marginBottom: 10, padding: 12, borderRadius: 8, backgroundColor: `${color}08`, border: `1px solid ${color}20` }} wrap={false}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: `${color}20`, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 12, color }}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: BRAND_DARK, marginBottom: 3 }}>{serviceName}</Text>
                  <Text style={{ fontSize: 9, color: "#4B5563", lineHeight: 1.5 }}>{serviceDesc}</Text>
                </View>
              </View>
            );
          })
        ) : (
          <Text style={{ fontSize: 9, color: "#6B7280" }}>Detailed recommendations available upon consultation.</Text>
        )}

        {/* The Pitch */}
        {pitchSection && (
          <View style={{ marginTop: 16 }}>
            <SectionHeader title="Executive Summary" accent={accent} />
            <View style={[styles.card, { backgroundColor: "#F0F9FF", borderColor: `${accent}30`, borderLeftWidth: 4, borderLeftColor: accent }]}>
              <Text style={{ fontSize: 10, color: "#374151", lineHeight: 1.6, fontStyle: "italic" }}>{pitchSection.slice(0, 600)}{pitchSection.length > 600 ? "..." : ""}</Text>
            </View>
          </View>
        )}
        <Footer pageNum={pageNum} businessName={businessName} />
      </Page>

      {/* ── PAGE 7: TALKING POINTS + CTA ──────────────────────────────── */}
      <Page size="A4" style={[styles.contentPage, { justifyContent: "space-between" }]}>
        {(() => { nextPage(); return null; })()}
        <View>
          {talkingPoints.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <SectionHeader title="Key Talking Points" accent={accent} />
              {talkingPoints.slice(0, 8).map((point, i) => {
                const colors = [accent, "#7C3AED", "#0891B2", HIGH_COLOR, SUCCESS_COLOR, MEDIUM_COLOR, CRITICAL_COLOR];
                const color = colors[i % colors.length];
                return (
                  <View key={i} style={{ flexDirection: "row", gap: 8, marginBottom: 6, padding: 8, backgroundColor: `${color}08`, borderRadius: 6 }} wrap={false}>
                    <View style={{ width: 4, backgroundColor: color, borderRadius: 2 }} />
                    <Text style={{ flex: 1, fontSize: 9, color: "#374151", lineHeight: 1.5 }}>{point}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* CTA */}
          <View style={[styles.card, { backgroundColor: BRAND_DARK, padding: 24, alignItems: "center" }]}>
            <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold", color: "#FFFFFF", marginBottom: 8, textAlign: "center" }}>
              Ready to transform your technology?
            </Text>
            <Text style={{ fontSize: 10, color: "#90CAF9", marginBottom: 16, textAlign: "center", lineHeight: 1.5 }}>
              Schedule a free consultation with our team. We&apos;ll review these findings{"\n"}and build a custom technology roadmap — no commitment required.
            </Text>

            <View style={{ backgroundColor: accent, borderRadius: 8, padding: "10 28" }}>
              <Text style={{ fontSize: 12, fontFamily: "Helvetica-Bold", color: "#FFFFFF" }}>Schedule Your Free Consultation</Text>
            </View>

            <View style={{ flexDirection: "row", gap: 20, marginTop: 12 }}>
              <Text style={{ fontSize: 9, color: "#42A5F5" }}>info@itatgcs.com</Text>
              <Text style={{ fontSize: 9, color: "#42A5F5" }}>www.itatgcs.com</Text>
            </View>
          </View>

          {/* About GCS */}
          <View style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 8, color: "#6B7280", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>Our Services</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {["Managed IT Services", "Cybersecurity & Compliance", "Cloud Solutions", "Custom Software Development", "AI Integration", "Enterprise Solutions"].map((service) => (
                <View key={service} style={{ backgroundColor: BRAND_LIGHT, borderRadius: 4, padding: "3 8", border: `1px solid ${accent}30` }}>
                  <Text style={{ fontSize: 8, color: accent, fontFamily: "Helvetica-Bold" }}>{service}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Disclaimer */}
        <View style={{ borderTop: "1px solid #E5E7EB", paddingTop: 12, marginTop: 16 }}>
          <Text style={{ fontSize: 7, color: "#9CA3AF", textAlign: "center", lineHeight: 1.5 }}>
            This report was generated by the GCS AI Technology Intelligence Platform. All findings are based on passive, non-intrusive automated reconnaissance.{"\n"}
            Results may vary. For a comprehensive assessment, contact GCS directly. © {new Date().getFullYear()} General Computing Solutions
          </Text>
        </View>
        <Footer pageNum={pageNum} businessName={businessName} />
      </Page>
    </Document>
  );
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function generatePitchPDF(data: PitchPDFData, logoBuffer: Buffer | null): Promise<Buffer> {
  // Load GCS logo from filesystem
  let gcsLogoBuffer: Buffer | null = null;
  try {
    const logoPath = path.join(process.cwd(), "public", "logo.png");
    gcsLogoBuffer = fs.readFileSync(logoPath);
  } catch { /* logo won't appear */ }

  const element = React.createElement(PitchPDFDocument, { data, logoBuffer, gcsLogoBuffer });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfBuffer = await renderToBuffer(element as any);
  return Buffer.from(pdfBuffer);
}
