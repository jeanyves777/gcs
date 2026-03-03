import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { isGCSStaff } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import {
  Document, Page, Text, View, StyleSheet, renderToBuffer, Svg, Path, Rect, G, Line, Polygon,
} from "@react-pdf/renderer";
import React from "react";
import type { SecurityReport, CategoryScore, SecurityFinding, RemediationItem } from "@/lib/pentest";

// react-pdf SVG Text has incomplete TS typings for SVG attributes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SvgText = Text as any;

// ─── PDF Styles ───────────────────────────────────────────────────────────────

const BRAND_BLUE = "#1565C0";
const BRAND_DARK = "#0A1929";
const BRAND_LIGHT = "#E3F2FD";
const CRITICAL_COLOR = "#DC2626";
const HIGH_COLOR = "#F97316";
const MEDIUM_COLOR = "#D97706";
const LOW_COLOR = "#16A34A";
const INFO_COLOR = "#6B7280";
const SUCCESS_COLOR = "#16A34A";

const severityColor = (s: string) =>
  s === "critical" ? CRITICAL_COLOR : s === "high" ? HIGH_COLOR : s === "medium" ? MEDIUM_COLOR : s === "low" ? LOW_COLOR : INFO_COLOR;

const gradeColor = (g: string) =>
  g === "A" ? SUCCESS_COLOR : g === "B" ? "#0891B2" : g === "C" ? MEDIUM_COLOR : g === "D" ? HIGH_COLOR : CRITICAL_COLOR;

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, color: "#374151", paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0 },
  // Cover
  coverPage: { backgroundColor: BRAND_DARK, flexDirection: "column", justifyContent: "space-between", padding: 0 },
  coverTop: { padding: 48, paddingBottom: 0 },
  coverBrand: { fontSize: 11, color: "#90CAF9", letterSpacing: 3, marginBottom: 40, textTransform: "uppercase" },
  coverTitle: { fontSize: 28, color: "#FFFFFF", fontFamily: "Helvetica-Bold", lineHeight: 1.3, marginBottom: 8 },
  coverSub: { fontSize: 14, color: "#90CAF9", marginBottom: 40 },
  coverBusiness: { fontSize: 18, color: "#42A5F5", fontFamily: "Helvetica-Bold", marginBottom: 6 },
  coverUrl: { fontSize: 10, color: "#90CAF9", marginBottom: 48 },
  coverBottom: { padding: 48, paddingTop: 32, borderTop: "1px solid #1E3A5F", flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  coverDate: { fontSize: 9, color: "#64B5F6" },
  coverConfidential: { fontSize: 9, color: "#EF4444", backgroundColor: "#7F1D1D", padding: "4 8", borderRadius: 4 },
  // Sections
  contentPage: { padding: "40 48", backgroundColor: "#FFFFFF", flexDirection: "column" },
  sectionHeader: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontFamily: "Helvetica-Bold", color: BRAND_DARK, marginBottom: 4 },
  sectionLine: { height: 3, backgroundColor: BRAND_BLUE, width: 48, borderRadius: 2 },
  // Cards
  card: { borderRadius: 8, padding: 14, marginBottom: 10, border: "1px solid #E5E7EB" },
  cardRow: { flexDirection: "row", gap: 10 },
  // Text
  label: { fontSize: 8, color: "#6B7280", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 3 },
  value: { fontSize: 13, fontFamily: "Helvetica-Bold", color: BRAND_DARK },
  bodyText: { fontSize: 10, color: "#4B5563", lineHeight: 1.6 },
  // Finding card
  findingCard: { borderRadius: 6, padding: 12, marginBottom: 8, borderLeft: "4 solid transparent" },
  findingTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: BRAND_DARK, marginBottom: 4 },
  findingLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 2 },
  findingBody: { fontSize: 9, color: "#4B5563", lineHeight: 1.5 },
  evidenceBox: { backgroundColor: "#F3F4F6", borderRadius: 4, padding: 6, marginTop: 4, marginBottom: 4 },
  // Badges
  badge: { borderRadius: 4, padding: "2 6", fontSize: 8, fontFamily: "Helvetica-Bold", letterSpacing: 0.3 },
  // Table
  table: { border: "1px solid #E5E7EB", borderRadius: 6, overflow: "hidden", marginTop: 8 },
  tableHeader: { flexDirection: "row", backgroundColor: BRAND_DARK, padding: "6 10" },
  tableRow: { flexDirection: "row", padding: "6 10", borderTop: "1px solid #F3F4F6" },
  tableRowAlt: { flexDirection: "row", padding: "6 10", borderTop: "1px solid #F3F4F6", backgroundColor: "#F9FAFB" },
  tableCell: { fontSize: 9, color: "#374151" },
  tableCellBold: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#FFFFFF" },
  // Category grid
  catCard: { borderRadius: 6, padding: 12, margin: 4, border: "1px solid #E5E7EB", flex: 1 },
  catLabel: { fontSize: 8, color: "#6B7280", marginBottom: 4 },
  catScore: { fontSize: 20, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  catGrade: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  // Footer
  footer: { position: "absolute", bottom: 24, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 8, color: "#9CA3AF" },
});

// ─── Radar Chart SVG ─────────────────────────────────────────────────────────

function RadarSvg({ scores, size = 200 }: { scores: CategoryScore[]; size?: number }) {
  const cx = size / 2, cy = size / 2, r = size * 0.38;
  const n = scores.length;
  const angleOf = (i: number) => (i * 2 * Math.PI) / n - Math.PI / 2;
  const pt = (frac: number, i: number) => ({
    x: cx + frac * r * Math.cos(angleOf(i)),
    y: cy + frac * r * Math.sin(angleOf(i)),
  });

  // Background rings
  const rings = [0.25, 0.5, 0.75, 1.0];
  const ringPaths = rings.map((frac) => {
    const pts = scores.map((_, i) => pt(frac, i));
    return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";
  });

  // Score polygon
  const scorePts = scores.map((c, i) => pt(c.score / 100, i));
  const scorePath = scorePts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";

  // Axis lines
  const axes = scores.map((_, i) => ({ from: { x: cx, y: cy }, to: pt(1.0, i) }));

  // Labels
  const labelPts = scores.map((c, i) => {
    const p = pt(1.15, i);
    return { ...p, label: c.label.replace(" Security", "").replace(" / ", "/"), grade: c.grade };
  });

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Rings */}
      {ringPaths.map((d, i) => (
        <Path key={i} d={d} fill="none" stroke="#E5E7EB" strokeWidth={0.5} />
      ))}
      {/* Axes */}
      {axes.map((a, i) => (
        <Line key={i} x1={a.from.x} y1={a.from.y} x2={a.to.x} y2={a.to.y} stroke="#E5E7EB" strokeWidth={0.5} />
      ))}
      {/* Score polygon */}
      <Path d={scorePath} fill={`${BRAND_BLUE}30`} stroke={BRAND_BLUE} strokeWidth={1.5} />
      {/* Score dots */}
      {scorePts.map((p, i) => (
        <Path key={i} d={`M ${p.x} ${p.y} m -3 0 a 3 3 0 1 0 6 0 a 3 3 0 1 0 -6 0`} fill={BRAND_BLUE} />
      ))}
      {/* Labels */}
      {labelPts.map((p, i) => (
        <G key={i}>
          <SvgText x={p.x} y={p.y} fontSize={5.5} fill="#374151" textAnchor="middle" dominantBaseline="central">
            {p.label}
          </SvgText>
          <SvgText x={p.x} y={p.y + 7} fontSize={6} fill={gradeColor(p.grade)} textAnchor="middle" fontFamily="Helvetica-Bold" dominantBaseline="central">
            {p.grade}
          </SvgText>
        </G>
      ))}
    </Svg>
  );
}

// ─── Risk Gauge SVG ───────────────────────────────────────────────────────────

function RiskGaugeSvg({ score }: { score: number }) {
  const color = score >= 70 ? CRITICAL_COLOR : score >= 50 ? HIGH_COLOR : score >= 30 ? MEDIUM_COLOR : SUCCESS_COLOR;
  const angle = (score / 100) * 270 - 135; // -135 to +135 degrees
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const cx = 60, cy = 60, r = 42;
  const arcStart = { x: cx + r * Math.cos(toRad(-135)), y: cy + r * Math.sin(toRad(-135)) };
  const arcEnd   = { x: cx + r * Math.cos(toRad(135)),  y: cy + r * Math.sin(toRad(135)) };
  const scoreX = cx + r * Math.cos(toRad(angle));
  const scoreY = cy + r * Math.sin(toRad(angle));

  return (
    <Svg width={120} height={80} viewBox="0 0 120 80">
      {/* Background arc */}
      <Path d={`M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 1 1 ${arcEnd.x} ${arcEnd.y}`} fill="none" stroke="#E5E7EB" strokeWidth={6} strokeLinecap="round" />
      {/* Score arc */}
      <Path d={`M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 ${score > 50 ? 1 : 0} 1 ${scoreX} ${scoreY}`} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" />
      {/* Center */}
      <SvgText x={cx} y={cy + 2} fontSize={16} fontFamily="Helvetica-Bold" fill={color} textAnchor="middle">{score}</SvgText>
      <SvgText x={cx} y={cy + 14} fontSize={7} fill="#6B7280" textAnchor="middle">/100</SvgText>
    </Svg>
  );
}

// ─── Score Bar ────────────────────────────────────────────────────────────────

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <View style={{ height: 6, backgroundColor: "#E5E7EB", borderRadius: 3, overflow: "hidden" }}>
      <View style={{ height: 6, width: `${score}%`, backgroundColor: color, borderRadius: 3 }} />
    </View>
  );
}

// ─── Page Footer ─────────────────────────────────────────────────────────────

function Footer({ pageNum, businessName }: { pageNum: number; businessName: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>Confidential — {businessName} — GCS Security Assessment</Text>
      <Text style={styles.footerText}>Page {pageNum} | General Computing Solutions | info@itatgcs.com</Text>
    </View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
}

// ─── Finding Card ─────────────────────────────────────────────────────────────

function FindingCardPDF({ finding }: { finding: SecurityFinding }) {
  const color = severityColor(finding.severity);
  return (
    <View style={[styles.findingCard, { backgroundColor: `${color}08`, borderLeftColor: color }]} wrap={false}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
          <View style={[styles.badge, { backgroundColor: color, color: "#FFFFFF" }]}>
            <Text style={{ color: "#FFFFFF", fontSize: 8 }}>{finding.severity.toUpperCase()}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: "#E5E7EB" }]}>
            <Text style={{ color: "#374151", fontSize: 8 }}>{finding.category.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={{ fontSize: 9, color: "#6B7280" }}>CVSS {finding.cvss.toFixed(1)}</Text>
      </View>
      <Text style={styles.findingTitle}>{finding.title}</Text>
      <Text style={styles.findingBody}>{finding.description}</Text>
      <View style={styles.evidenceBox}>
        <Text style={[styles.findingLabel, { color: "#6B7280" }]}>EVIDENCE</Text>
        <Text style={[styles.findingBody, { color: "#374151" }]}>{finding.evidence}</Text>
      </View>
      <Text style={[styles.findingLabel, { color: color, marginTop: 4 }]}>BUSINESS IMPACT</Text>
      <Text style={styles.findingBody}>{finding.businessImpact}</Text>
      <Text style={[styles.findingLabel, { color: SUCCESS_COLOR, marginTop: 4 }]}>RECOMMENDATION</Text>
      <Text style={styles.findingBody}>{finding.recommendation}</Text>
      <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
        <View style={[styles.badge, { backgroundColor: finding.effort === "quick-win" ? "#DCFCE7" : finding.effort === "short-term" ? "#FEF3C7" : "#EDE9FE" }]}>
          <Text style={{ fontSize: 7, color: finding.effort === "quick-win" ? "#15803D" : finding.effort === "short-term" ? "#92400E" : "#5B21B6" }}>
            {finding.effort === "quick-win" ? "⚡ Quick Win" : finding.effort === "short-term" ? "📅 Short-term" : "🗓️ Long-term"}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: "#E5E7EB" }]}>
          <Text style={{ fontSize: 7, color: "#374151" }}>Priority: {finding.priority}/10</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Main PDF Document ────────────────────────────────────────────────────────

interface SecurityPDFProps {
  businessName: string;
  websiteUrl: string;
  createdAt: Date;
  report: SecurityReport;
}

function SecurityPDF({ businessName, websiteUrl, createdAt, report }: SecurityPDFProps) {
  const criticalFindings = report.findings.filter((f) => f.severity === "critical");
  const highFindings = report.findings.filter((f) => f.severity === "high");
  const mediumFindings = report.findings.filter((f) => f.severity === "medium");
  const lowFindings = report.findings.filter((f) => f.severity === "low");
  const riskColor = severityColor(
    report.totalFindings.critical > 0 ? "critical" : report.totalFindings.high > 0 ? "high" : report.totalFindings.medium > 0 ? "medium" : "low"
  );

  const remediation = report.remediationRoadmap ?? [];
  const quickWins = remediation.filter((r: RemediationItem) => r.effort === "quick-win");
  const shortTerm = remediation.filter((r: RemediationItem) => r.effort === "short-term");
  const longTerm = remediation.filter((r: RemediationItem) => r.effort === "long-term");

  return (
    <Document title={`Security Assessment — ${businessName}`} author="General Computing Solutions" subject="Cybersecurity Assessment Report">

      {/* ── Page 1: Cover ──────────────────────────────────────────────────── */}
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.coverTop}>
          <Text style={styles.coverBrand}>General Computing Solutions</Text>
          <Text style={styles.coverTitle}>Security Assessment{"\n"}Report</Text>
          <Text style={styles.coverSub}>Confidential — Internal Use Only</Text>

          {/* Risk gauge */}
          <View style={{ alignItems: "flex-start", marginBottom: 32 }}>
            <RiskGaugeSvg score={report.riskScore} />
            <Text style={{ color: riskColor, fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 4 }}>
              Overall Risk Score: {report.riskScore}/100 — Grade {report.overallGrade}
            </Text>
          </View>

          {/* Stat row */}
          <View style={{ flexDirection: "row", gap: 16, marginBottom: 32 }}>
            {[
              { label: "Critical", count: report.totalFindings?.critical ?? 0, color: CRITICAL_COLOR },
              { label: "High", count: report.totalFindings?.high ?? 0, color: HIGH_COLOR },
              { label: "Medium", count: report.totalFindings?.medium ?? 0, color: MEDIUM_COLOR },
              { label: "Low", count: report.totalFindings?.low ?? 0, color: LOW_COLOR },
            ].map((s) => (
              <View key={s.label} style={{ alignItems: "center" }}>
                <Text style={{ fontSize: 22, fontFamily: "Helvetica-Bold", color: s.count > 0 ? s.color : "#4B5563" }}>{s.count}</Text>
                <Text style={{ fontSize: 8, color: "#90CAF9", letterSpacing: 0.5 }}>{s.label.toUpperCase()}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.coverBusiness}>{businessName}</Text>
          <Text style={styles.coverUrl}>{websiteUrl}</Text>
        </View>
        <View style={styles.coverBottom}>
          <View>
            <Text style={styles.coverDate}>Prepared by: General Computing Solutions</Text>
            <Text style={styles.coverDate}>Date: {new Date(createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</Text>
            <Text style={styles.coverDate}>Contact: info@itatgcs.com | www.itatgcs.com</Text>
          </View>
          <View style={styles.coverConfidential}>
            <Text style={{ color: "#FCA5A5", fontSize: 8, fontFamily: "Helvetica-Bold" }}>CONFIDENTIAL</Text>
          </View>
        </View>
      </Page>

      {/* ── Page 2: Executive Summary ───────────────────────────────────────── */}
      <Page size="A4" style={styles.contentPage}>
        <SectionHeader title="Executive Summary" />
        <View style={[styles.card, { backgroundColor: "#F0F9FF", borderColor: BRAND_BLUE, borderLeftWidth: 4 }]}>
          <Text style={styles.bodyText}>{report.executiveSummary}</Text>
        </View>

        {/* Stats grid */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Critical Findings", count: report.totalFindings?.critical ?? 0, color: CRITICAL_COLOR, bg: "#FEF2F2" },
            { label: "High Findings", count: report.totalFindings?.high ?? 0, color: HIGH_COLOR, bg: "#FFF7ED" },
            { label: "Medium Findings", count: report.totalFindings?.medium ?? 0, color: MEDIUM_COLOR, bg: "#FFFBEB" },
            { label: "Low Findings", count: report.totalFindings?.low ?? 0, color: LOW_COLOR, bg: "#F0FDF4" },
          ].map((s) => (
            <View key={s.label} style={{ flex: 1, borderRadius: 8, padding: 12, backgroundColor: s.bg, border: `1px solid ${s.color}30`, alignItems: "center" }}>
              <Text style={{ fontSize: 28, fontFamily: "Helvetica-Bold", color: s.color }}>{s.count}</Text>
              <Text style={{ fontSize: 8, color: "#6B7280", textAlign: "center", marginTop: 2 }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Top 3 critical */}
        {criticalFindings.length > 0 && (
          <View>
            <Text style={[styles.sectionTitle, { fontSize: 13, marginBottom: 8, color: CRITICAL_COLOR }]}>Top Critical Findings</Text>
            {criticalFindings.slice(0, 3).map((f) => (
              <View key={f.id} style={{ flexDirection: "row", gap: 8, marginBottom: 8, padding: 10, backgroundColor: "#FEF2F2", borderRadius: 6, borderLeft: `4 solid ${CRITICAL_COLOR}` }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: BRAND_DARK, marginBottom: 2 }}>{f.title}</Text>
                  <Text style={{ fontSize: 9, color: "#6B7280" }}>{f.businessImpact.slice(0, 120)}...</Text>
                </View>
                <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: CRITICAL_COLOR }}>CVSS {f.cvss}</Text>
              </View>
            ))}
          </View>
        )}
        <Footer pageNum={2} businessName={businessName} />
      </Page>

      {/* ── Page 3: Category Dashboard ──────────────────────────────────────── */}
      <Page size="A4" style={styles.contentPage}>
        <SectionHeader title="Security Category Assessment" />
        <View style={{ flexDirection: "row", gap: 24, marginBottom: 20 }}>
          <View style={{ flex: 1 }}>
            {report.categoryScores && <RadarSvg scores={report.categoryScores} size={210} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { marginBottom: 8 }]}>Category Breakdown</Text>
            {report.categoryScores?.map((cat) => (
              <View key={cat.category} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                  <Text style={{ fontSize: 9, color: BRAND_DARK, fontFamily: "Helvetica-Bold" }}>{cat.label}</Text>
                  <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
                    <Text style={{ fontSize: 9, color: gradeColor(cat.grade), fontFamily: "Helvetica-Bold" }}>Grade {cat.grade}</Text>
                    <Text style={{ fontSize: 9, color: "#6B7280" }}>{cat.score}/100</Text>
                  </View>
                </View>
                <ScoreBar score={cat.score} color={gradeColor(cat.grade)} />
                {(cat.criticalCount > 0 || cat.highCount > 0) && (
                  <Text style={{ fontSize: 8, color: "#6B7280", marginTop: 2 }}>
                    {cat.criticalCount > 0 ? `${cat.criticalCount} critical, ` : ""}{cat.highCount > 0 ? `${cat.highCount} high` : ""} findings
                  </Text>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Tech stack */}
        {report.techStack && (
          <View style={[styles.card, { backgroundColor: "#F9FAFB" }]}>
            <Text style={[styles.label, { marginBottom: 8 }]}>Technology Stack</Text>
            <View style={{ flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
              {[
                { label: "Server", value: report.techStack.server },
                { label: "CDN", value: report.techStack.cdn },
                { label: "WAF", value: report.techStack.waf },
                { label: "CMS", value: report.techStack.cms },
              ].map((item) => (
                <View key={item.label}>
                  <Text style={styles.label}>{item.label}</Text>
                  <Text style={{ fontSize: 10, color: item.value ? BRAND_DARK : CRITICAL_COLOR, fontFamily: "Helvetica-Bold" }}>
                    {item.value ?? "None detected ⚠"}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
        <Footer pageNum={3} businessName={businessName} />
      </Page>

      {/* ── Pages 4+: Findings by Severity ─────────────────────────────────── */}
      {criticalFindings.length > 0 && (
        <Page size="A4" style={styles.contentPage}>
          <SectionHeader title="Critical Findings" />
          {criticalFindings.map((f) => <FindingCardPDF key={f.id} finding={f} />)}
          <Footer pageNum={4} businessName={businessName} />
        </Page>
      )}

      {highFindings.length > 0 && (
        <Page size="A4" style={styles.contentPage}>
          <SectionHeader title="High Severity Findings" />
          {highFindings.map((f) => <FindingCardPDF key={f.id} finding={f} />)}
          <Footer pageNum={5} businessName={businessName} />
        </Page>
      )}

      {(mediumFindings.length > 0 || lowFindings.length > 0) && (
        <Page size="A4" style={styles.contentPage}>
          {mediumFindings.length > 0 && (
            <View>
              <SectionHeader title="Medium Severity Findings" />
              {mediumFindings.map((f) => <FindingCardPDF key={f.id} finding={f} />)}
            </View>
          )}
          {lowFindings.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <SectionHeader title="Low Severity Findings" />
              {lowFindings.map((f) => <FindingCardPDF key={f.id} finding={f} />)}
            </View>
          )}
          <Footer pageNum={6} businessName={businessName} />
        </Page>
      )}

      {/* ── Remediation Roadmap ─────────────────────────────────────────────── */}
      {remediation.length > 0 && (
        <Page size="A4" style={styles.contentPage}>
          <SectionHeader title="Remediation Roadmap" />

          {/* 3-column effort overview */}
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            {[
              { label: "⚡ Quick Wins", sub: "1–3 days", items: quickWins, bg: "#F0FDF4", border: SUCCESS_COLOR, col: SUCCESS_COLOR },
              { label: "📅 Short-term", sub: "1–4 weeks", items: shortTerm, bg: "#FFFBEB", border: MEDIUM_COLOR, col: MEDIUM_COLOR },
              { label: "🗓️ Long-term", sub: "1–3 months", items: longTerm, bg: "#EDE9FE", border: "#7C3AED", col: "#7C3AED" },
            ].map((col) => (
              <View key={col.label} style={{ flex: 1, borderRadius: 8, padding: 10, backgroundColor: col.bg, border: `1px solid ${col.border}40` }}>
                <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: col.col, marginBottom: 2 }}>{col.label}</Text>
                <Text style={{ fontSize: 8, color: "#6B7280", marginBottom: 8 }}>{col.sub} — {col.items.length} action{col.items.length !== 1 ? "s" : ""}</Text>
                {col.items.slice(0, 4).map((item: RemediationItem) => (
                  <Text key={item.title} style={{ fontSize: 8, color: "#374151", marginBottom: 3 }}>• {item.title.slice(0, 45)}</Text>
                ))}
              </View>
            ))}
          </View>

          {/* Priority table */}
          <Text style={[styles.label, { marginBottom: 6 }]}>Prioritized Action Table</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              {["#", "Finding", "Effort", "Est. Days", "GCS Service"].map((h, i) => (
                <Text key={h} style={[styles.tableCellBold, { flex: [0.3, 3, 1.2, 0.8, 2.2][i] }]}>{h}</Text>
              ))}
            </View>
            {remediation.slice(0, 10).map((item: RemediationItem, idx) => (
              <View key={item.title} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={[styles.tableCell, { flex: 0.3, fontFamily: "Helvetica-Bold" }]}>{item.priority}</Text>
                <Text style={[styles.tableCell, { flex: 3 }]}>{item.title.slice(0, 50)}</Text>
                <Text style={[styles.tableCell, { flex: 1.2, color: item.effort === "quick-win" ? SUCCESS_COLOR : item.effort === "short-term" ? MEDIUM_COLOR : "#7C3AED" }]}>
                  {item.effort.replace("-", " ")}
                </Text>
                <Text style={[styles.tableCell, { flex: 0.8 }]}>{item.estimatedDays}</Text>
                <Text style={[styles.tableCell, { flex: 2.2, color: BRAND_BLUE }]}>{item.gcsSolution.replace("GCS ", "")}</Text>
              </View>
            ))}
          </View>
          <Footer pageNum={7} businessName={businessName} />
        </Page>
      )}

      {/* ── About GCS ──────────────────────────────────────────────────────── */}
      <Page size="A4" style={[styles.contentPage, { justifyContent: "space-between" }]}>
        <View>
          <SectionHeader title="About General Computing Solutions" />
          <Text style={[styles.bodyText, { marginBottom: 16 }]}>
            General Computing Solutions (GCS) is a premier Managed IT & Software Solutions provider dedicated to securing, modernizing, and accelerating business technology infrastructure. Our team of certified security professionals, cloud architects, and software engineers deliver enterprise-grade solutions to businesses of all sizes.
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
            {[
              "Managed IT Services", "Cybersecurity & Compliance", "Cloud Solutions",
              "Custom Software Development", "AI Integration", "Enterprise Solutions",
            ].map((service) => (
              <View key={service} style={{ backgroundColor: BRAND_LIGHT, borderRadius: 4, padding: "4 8", border: `1px solid ${BRAND_BLUE}30` }}>
                <Text style={{ fontSize: 9, color: BRAND_BLUE, fontFamily: "Helvetica-Bold" }}>{service}</Text>
              </View>
            ))}
          </View>
          <View style={[styles.card, { backgroundColor: BRAND_DARK }]}>
            <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold", color: "#FFFFFF", marginBottom: 8 }}>
              Ready to secure your business?
            </Text>
            <Text style={{ fontSize: 10, color: "#90CAF9", marginBottom: 12 }}>
              Schedule a free security consultation with our team. We&apos;ll review these findings and build a custom remediation plan at no cost.
            </Text>
            <Text style={{ fontSize: 10, color: "#42A5F5", fontFamily: "Helvetica-Bold" }}>info@itatgcs.com</Text>
            <Text style={{ fontSize: 10, color: "#42A5F5" }}>www.itatgcs.com</Text>
          </View>
        </View>
        <View style={{ borderTop: "1px solid #E5E7EB", paddingTop: 12 }}>
          <Text style={{ fontSize: 8, color: "#9CA3AF", textAlign: "center" }}>
            This report was generated by GCS AI Security Intelligence Platform. All findings are based on passive, non-intrusive automated reconnaissance.
            {"\n"}Results may vary. For a full manual penetration test, contact GCS directly.
          </Text>
        </View>
        <Footer pageNum={8} businessName={businessName} />
      </Page>
    </Document>
  );
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !isGCSStaff(session.user.role ?? "")) {
      return new Response("Unauthorized", { status: 403 });
    }

    const { id } = await params;
    const pitch = await db.pitch.findUnique({ where: { id }, include: { createdBy: { select: { name: true } } } });
    if (!pitch) return new Response("Not found", { status: 404 });

    // Parse security report — prefer full reportData, fall back to pentestData
    let report: SecurityReport | null = null;
    if (pitch.reportData) {
      try { report = JSON.parse(pitch.reportData) as SecurityReport; } catch { /* ignore */ }
    }
    if (!report && pitch.pentestData) {
      try { report = JSON.parse(pitch.pentestData) as SecurityReport; } catch { /* ignore */ }
    }

    if (!report) {
      return new Response("No security report data available for this pitch", { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(
      React.createElement(SecurityPDF, {
        businessName: pitch.businessName,
        websiteUrl: pitch.websiteUrl,
        createdAt: pitch.createdAt,
        report,
      }) as any
    );

    const safeName = pitch.businessName.replace(/[^a-z0-9]/gi, "_").slice(0, 40);
    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="security-report-${safeName}.pdf"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("[pdf] Error generating PDF:", err);
    return new Response(`Failed to generate PDF: ${err instanceof Error ? err.message : "Unknown error"}`, { status: 500 });
  }
}
