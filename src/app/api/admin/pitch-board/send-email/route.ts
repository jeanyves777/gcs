import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isGCSStaff } from "@/lib/auth-utils";
import { sendMail } from "@/lib/email";
import { db } from "@/lib/db";

// ─── Parsers ──────────────────────────────────────────────────────────────────

function countSecurityFailures(pitchText: string): number {
  const match = pitchText.match(/## 🔒 Security Assessment([\s\S]*?)(?=\n##|$)/);
  return match ? (match[1].match(/❌/g) ?? []).length : 0;
}

function countPainPoints(pitchText: string): number {
  const match = pitchText.match(/## 💡 Pain Points[^#]*([\s\S]*?)(?=\n##|$)/);
  return match ? (match[1].match(/^[-•*]\s+|^\d+\.\s+/gm) ?? []).length : 0;
}

function extractIndustry(pitchText: string): string {
  const match = pitchText.match(/## 🏢 Business Overview([\s\S]*?)(?=\n##|$)/);
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
  const match = pitchText.match(/## 🔒 Security Assessment([\s\S]*?)(?=\n##|$)/);
  if (!match) return [];
  const t = match[1].toLowerCase();
  const cats: string[] = [];
  if (t.includes("content-security") || t.includes("csp")) cats.push("Content Security");
  if (t.includes("transport") || t.includes("hsts") || t.includes("ssl")) cats.push("Transport Security");
  if (t.includes("frame") || t.includes("clickjack")) cats.push("Clickjacking Protection");
  if (t.includes("content-type") || t.includes("mime")) cats.push("MIME Type Controls");
  if (t.includes("referrer")) cats.push("Data Leakage Controls");
  if (t.includes("permission") || t.includes("feature")) cats.push("Browser Permissions");
  return cats.slice(0, 3);
}

function gapCategories(pitchText: string): string[] {
  const match = pitchText.match(/## 💡 Pain Points[^#]*([\s\S]*?)(?=\n##|$)/);
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
  return cats.slice(0, 3);
}

// ─── SVG half-circle gauge (speedometer style) ───────────────────────────────

function halfGaugeSvg(score: number, color: string): string {
  const s = Math.min(Math.max(score, 0), 99.5);
  const θ = ((-180 + s * 1.8) * Math.PI) / 180;
  const ex = (60 + 45 * Math.cos(θ)).toFixed(2);
  const ey = (60 + 45 * Math.sin(θ)).toFixed(2);
  const fillPath =
    s < 0.5
      ? ""
      : `<path d="M 15,60 A 45,45 0 0,0 ${ex},${ey}" fill="none" stroke="${color}" stroke-width="9" stroke-linecap="round"/>`;
  return `<svg width="110" height="75" viewBox="0 0 120 75" xmlns="http://www.w3.org/2000/svg">
  <path d="M 15,60 A 45,45 0 0,0 105,60" fill="none" stroke="#e5e7eb" stroke-width="9" stroke-linecap="round"/>
  ${fillPath}
  <text x="60" y="56" text-anchor="middle" font-size="22" font-weight="800" fill="${color}" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">${score}</text>
  <text x="60" y="70" text-anchor="middle" font-size="10" fill="#9ca3af" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">/100</text>
</svg>`;
}

// ─── Table-based progress bar (email-safe) ────────────────────────────────────

function miniBar(label: string, value: number, color: string, maxWidth = 120): string {
  const filled = Math.round((value / 100) * maxWidth);
  return `<tr>
  <td style="padding:4px 0 6px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="font-size:12px;color:#374151;font-weight:500;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding-bottom:3px;">${label}</td>
        <td align="right" style="font-size:11px;font-weight:700;color:${color};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding-bottom:3px;">${value}</td>
      </tr>
      <tr><td colspan="2">
        <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-radius:99px;overflow:hidden;background:#f3f4f6;">
          <tr>
            <td style="width:${filled}px;height:7px;background:${color};border-radius:99px;font-size:0;" width="${filled}">&nbsp;</td>
            <td style="height:7px;background:#f3f4f6;font-size:0;">&nbsp;</td>
          </tr>
        </table>
      </td></tr>
    </table>
  </td>
</tr>`;
}

// ─── Presence score sub-metric cell ──────────────────────────────────────────

function presCell(label: string, value: number): string {
  const color = value >= 70 ? "#22c55e" : value >= 35 ? "#f97316" : "#ef4444";
  const filled = Math.round(value * 1.3); // ~130px max
  return `<td width="50%" style="padding:4px 10px 8px 0;vertical-align:top;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="font-size:12px;color:#374151;font-weight:500;padding-bottom:3px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${label}</td>
      <td align="right" style="font-size:12px;font-weight:800;color:${color};padding-bottom:3px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${value}</td>
    </tr>
    <tr><td colspan="2">
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-radius:99px;overflow:hidden;background:#f3f4f6;">
        <tr>
          <td style="width:${filled}px;height:6px;background:${color};border-radius:99px;font-size:0;" width="${filled}">&nbsp;</td>
          <td style="height:6px;background:#f3f4f6;font-size:0;">&nbsp;</td>
        </tr>
      </table>
    </td></tr>
  </table>
</td>`;
}

// ─── Star HTML ────────────────────────────────────────────────────────────────

function starHtml(rating: number): string {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let stars = "";
  for (let i = 1; i <= 5; i++) {
    if (i <= full) stars += `<span style="color:#f59e0b;">&#9733;</span>`;
    else if (i === full + 1 && half) stars += `<span style="color:#f59e0b;">&#11088;</span>`;
    else stars += `<span style="color:#d1d5db;">&#9733;</span>`;
  }
  return stars;
}

// ─── Review card HTML ─────────────────────────────────────────────────────────

function reviewCardHtml(review: { rating: number; text: string; relativeTime: string; authorName: string }): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:8px;">
  <tr><td style="padding:12px 14px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="font-size:14px;">${starHtml(review.rating)}</td>
        <td align="right" style="font-size:11px;color:#9ca3af;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${review.relativeTime}</td>
      </tr>
    </table>
    <p style="margin:4px 0 5px;font-size:12px;font-weight:700;color:#374151;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${review.authorName}</p>
    <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.55;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">&ldquo;${review.text.replace(/"/g, "&quot;").slice(0, 260)}${review.text.length > 260 ? "&hellip;" : ""}&rdquo;</p>
  </td></tr>
</table>`;
}

// ─── Full email builder ───────────────────────────────────────────────────────

function buildEmail(
  businessName: string,
  pitchText: string,
  landingUrl: string,
  securityScore: number,
  presenceScore: number,
  dealScore: number,
  businessIntelData?: string | null
): string {
  const secRisk  = Math.max(0, 100 - securityScore);
  const riskColor = secRisk > 60 ? "#ef4444" : secRisk > 30 ? "#f97316" : "#22c55e";
  const riskLabel = secRisk > 60 ? "Critical Risk" : secRisk > 30 ? "At Risk" : "Low Risk";
  const presColor = presenceScore > 65 ? "#22c55e" : presenceScore > 40 ? "#f97316" : "#ef4444";
  const presLabel = presenceScore > 65 ? "Strong Digital Presence" : presenceScore > 40 ? "Growing Digital Presence" : "Weak Digital Presence";
  const dealColor = dealScore > 70 ? "#22c55e" : dealScore > 45 ? "#0891b2" : "#a78bfa";
  const dealLabel = dealScore > 70 ? "High Opportunity" : dealScore > 45 ? "Strong Potential" : "Solid Opportunity";

  const industry = extractIndustry(pitchText);
  const secFailures = countSecurityFailures(pitchText);
  const painCount = countPainPoints(pitchText);
  const secCats = securityCategories(pitchText);
  const gapCats = gapCategories(pitchText);

  // Digital Health Score
  const techHealth = Math.max(0, 100 - painCount * 12);
  const healthScore = Math.max(5, Math.min(95, Math.round(0.40 * securityScore + 0.40 * presenceScore + 0.20 * techHealth)));
  const healthLabel = healthScore >= 76 ? "Strong" : healthScore >= 61 ? "Good" : healthScore >= 46 ? "Fair" : healthScore >= 26 ? "Poor" : "Critical";
  const healthColor = healthScore >= 76 ? "#16a34a" : healthScore >= 61 ? "#0891b2" : healthScore >= 46 ? "#d97706" : healthScore >= 26 ? "#f97316" : "#ef4444";
  const healthBg    = healthScore >= 76 ? "#f0fdf4" : healthScore >= 61 ? "#ecfeff" : healthScore >= 46 ? "#fffbeb" : healthScore >= 26 ? "#fff7ed" : "#fef2f2";
  const healthBorder= healthScore >= 76 ? "#bbf7d0" : healthScore >= 61 ? "#a5f3fc" : healthScore >= 46 ? "#fde68a" : healthScore >= 26 ? "#fed7aa" : "#fecaca";

  // Circular ring SVG
  const ringStroke = 11;
  const ringR = (110 - ringStroke) / 2;
  const ringCirc = 2 * Math.PI * ringR;
  const ringOffset = ringCirc * (1 - healthScore / 100);
  const healthRingSvg = `<svg width="110" height="110" viewBox="0 0 110 110" xmlns="http://www.w3.org/2000/svg">
  <circle cx="55" cy="55" r="${ringR}" fill="none" stroke="#e5e7eb" stroke-width="${ringStroke}"/>
  <circle cx="55" cy="55" r="${ringR}" fill="none" stroke="${healthColor}" stroke-width="${ringStroke}" stroke-dasharray="${ringCirc.toFixed(2)}" stroke-dashoffset="${ringOffset.toFixed(2)}" transform="rotate(-90 55 55)" stroke-linecap="round"/>
  <text x="55" y="51" text-anchor="middle" font-size="22" font-weight="800" fill="${healthColor}" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">${healthScore}</text>
  <text x="55" y="67" text-anchor="middle" font-size="10" fill="#9ca3af" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">/100</text>
</svg>`;

  // Parse Google Business Profile data
  let googleRating: number | null = null;
  let googleReviewCount: number | null = null;
  let googleRatingBenchmark = 4.4;
  let recentReviews: Array<{ rating: number; text: string; relativeTime: string; authorName: string }> = [];
  let domainAge: number | null = null;
  let hostingProvider: string | null = null;

  if (businessIntelData) {
    try {
      const bi = JSON.parse(businessIntelData);
      if (bi?.google?.found) {
        googleRating = bi.google.rating;
        googleReviewCount = bi.google.reviewCount;
        googleRatingBenchmark = bi.google.ratingBenchmark ?? 4.4;
        recentReviews = (bi.google.recentReviews ?? []).slice(0, 3);
      }
      if (bi?.domainRegistry?.domainAgeYears != null) domainAge = bi.domainRegistry.domainAgeYears;
      if (bi?.ipGeo?.hosting) hostingProvider = bi.ipGeo.hosting;
    } catch { /* ignore */ }
  }

  // Digital Presence sub-metrics (screenshot-matching)
  const websiteHealthScore = Math.min(100, Math.max(20, securityScore));
  const analyticsScore = presenceScore > 70 ? 80 : presenceScore > 50 ? 42 : 8;
  const leadGenScore = presenceScore > 65 ? 68 : presenceScore > 45 ? 32 : 6;
  const onlineRepScore = googleRating ? Math.round(googleRating / 5 * 100) : Math.max(20, Math.round(presenceScore * 0.9));
  const socialScore = Math.round(presenceScore * 0.85);
  const industryAvg = Math.round(presenceScore * 0.85 + 8);

  // Google rating bar (0-100 scale from 0-5 stars, displayed as 220px max)
  const googleRatingPct = googleRating ? Math.round(googleRating / 5 * 220) : 0;
  const googleRatingColor = googleRating
    ? (googleRating >= googleRatingBenchmark ? "#22c55e" : googleRating >= googleRatingBenchmark - 0.3 ? "#f97316" : "#ef4444")
    : "#d1d5db";

  const googleRatingRowHtml = googleRating ? `<tr>
  <td colspan="2" style="padding-top:10px;border-top:1px solid #f3f4f6;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="font-size:13px;color:#d97706;font-weight:700;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">&#11088; Google Rating</td>
        <td align="right" style="font-size:13px;font-weight:800;color:#f97316;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${googleRating.toFixed(1)}/5.0 <span style="font-weight:500;color:#9ca3af;">(${(googleReviewCount ?? 0).toLocaleString()} reviews)</span></td>
      </tr>
      <tr><td colspan="2" style="padding-top:5px;">
        <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-radius:99px;overflow:hidden;background:#f3f4f6;">
          <tr>
            <td style="width:${googleRatingPct}px;height:8px;background:${googleRatingColor};border-radius:99px;font-size:0;" width="${googleRatingPct}">&nbsp;</td>
            <td style="height:8px;background:#f3f4f6;font-size:0;">&nbsp;</td>
          </tr>
        </table>
      </td></tr>
    </table>
  </td>
</tr>` : "";

  const secCatChips = secCats
    .map((c) => `<span style="display:inline-block;background:#fef2f2;border:1px solid #fecaca;border-radius:99px;padding:4px 12px;font-size:12px;color:#991b1b;font-weight:600;margin:3px 3px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">🛡️ ${c}</span>`)
    .join("");

  const gapChips = gapCats
    .map((c) => `<span style="display:inline-block;background:#fff7ed;border:1px solid #fed7aa;border-radius:99px;padding:4px 12px;font-size:12px;color:#92400E;font-weight:600;margin:3px 3px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">⚠️ ${c}</span>`)
    .join("");

  // Sub-metrics for security mini-bars
  const headersScore = securityScore;
  const sslScore = securityScore > 60 ? Math.min(95, securityScore + 12) : Math.round(securityScore * 1.1);
  const configScore = Math.round(securityScore * 0.85);

  // Reviews section
  const reviewsHtml = recentReviews.length > 0 ? `
  <!-- ── GOOGLE REVIEWS ─────────────────────────────────────────── -->
  <tr>
    <td style="padding:16px 28px 0;background:#F8FAFC;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid #E5E7EB;border-radius:14px;overflow:hidden;">
        <tr>
          <td style="padding:16px 20px 4px;">
            <p style="margin:0;font-size:10px;font-weight:700;color:#f59e0b;text-transform:uppercase;letter-spacing:0.12em;font-family:inherit;">&#11088; Google Reviews</p>
          </td>
        </tr>
        <tr>
          <td style="padding:4px 20px 16px;">
            <p style="margin:0 0 12px;font-size:13px;color:#374151;font-family:inherit;">
              What customers are saying about <strong>${businessName}</strong>:
            </p>
            ${recentReviews.map(reviewCardHtml).join("")}
          </td>
        </tr>
      </table>
    </td>
  </tr>` : "";

  // Domain/hosting chip
  const infraChips = [
    domainAge != null ? `<span style="display:inline-block;background:#eff6ff;border:1px solid #bfdbfe;border-radius:99px;padding:3px 10px;font-size:11px;color:#1d4ed8;font-weight:600;margin:2px;font-family:inherit;">🌐 ${domainAge}yr domain</span>` : "",
    hostingProvider ? `<span style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:99px;padding:3px 10px;font-size:11px;color:#15803d;font-weight:600;margin:2px;font-family:inherit;">🖥️ ${hostingProvider}</span>` : "",
  ].filter(Boolean).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Technology Brief — ${businessName}</title>
</head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F1F5F9" style="padding:40px 16px;">
<tr><td align="center">
<table width="620" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.09);">

  <!-- ── HEADER ──────────────────────────────────────────────────── -->
  <tr>
    <td bgcolor="#1565C0" style="background:linear-gradient(135deg,#1565C0 0%,#5e35b1 100%);padding:30px 40px 26px;">
      <img src="https://www.itatgcs.com/logo.png" alt="GCS" height="30" style="filter:brightness(0) invert(1);display:block;margin-bottom:16px;" border="0"/>
      <p style="margin:0 0 4px;color:rgba(255,255,255,0.6);font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;font-family:inherit;">GCS Technology Consulting</p>
      <h1 style="margin:0 0 6px;color:#ffffff;font-size:21px;font-weight:800;line-height:1.3;font-family:inherit;">We reviewed ${businessName}&rsquo;s technology.</h1>
      <p style="margin:0;color:rgba(255,255,255,0.7);font-size:14px;line-height:1.55;font-family:inherit;">Here&rsquo;s a snapshot of what our team found.</p>
      ${infraChips ? `<p style="margin:12px 0 0;font-family:inherit;">${infraChips}</p>` : ""}
    </td>
  </tr>

  <!-- ── SCORE RINGS ROW ─────────────────────────────────────────── -->
  <tr>
    <td bgcolor="#0A1929" style="background:#0A1929;padding:28px 20px 20px;">
      <p style="margin:0 0 18px;text-align:center;color:rgba(255,255,255,0.4);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;font-family:inherit;">Technology Health Snapshot</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" width="33%" style="padding:0 8px;">
            <table cellpadding="0" cellspacing="0" border="0" style="background:rgba(255,255,255,0.06);border-radius:12px;overflow:hidden;" width="100%">
              <tr><td align="center" style="padding:16px 8px 8px;">
                ${halfGaugeSvg(secRisk, riskColor)}
                <p style="margin:4px 0 2px;font-size:12px;font-weight:800;color:#ffffff;font-family:inherit;">Security Risk</p>
                <p style="margin:0 0 12px;font-size:10px;font-weight:700;color:${riskColor};text-transform:uppercase;letter-spacing:0.08em;font-family:inherit;">${riskLabel}</p>
              </td></tr>
            </table>
          </td>
          <td align="center" width="33%" style="padding:0 8px;">
            <table cellpadding="0" cellspacing="0" border="0" style="background:rgba(255,255,255,0.06);border-radius:12px;overflow:hidden;" width="100%">
              <tr><td align="center" style="padding:16px 8px 8px;">
                ${halfGaugeSvg(presenceScore, "#38bdf8")}
                <p style="margin:4px 0 2px;font-size:12px;font-weight:800;color:#ffffff;font-family:inherit;">Online Presence</p>
                <p style="margin:0 0 12px;font-size:10px;font-weight:700;color:#38bdf8;text-transform:uppercase;letter-spacing:0.08em;font-family:inherit;">${presenceScore > 65 ? "Strong" : presenceScore > 40 ? "Growing" : "Weak"}</p>
              </td></tr>
            </table>
          </td>
          <td align="center" width="33%" style="padding:0 8px;">
            <table cellpadding="0" cellspacing="0" border="0" style="background:rgba(255,255,255,0.06);border-radius:12px;overflow:hidden;" width="100%">
              <tr><td align="center" style="padding:16px 8px 8px;">
                ${halfGaugeSvg(dealScore, "#a78bfa")}
                <p style="margin:4px 0 2px;font-size:12px;font-weight:800;color:#ffffff;font-family:inherit;">Opportunity Score</p>
                <p style="margin:0 0 12px;font-size:10px;font-weight:700;color:#a78bfa;text-transform:uppercase;letter-spacing:0.08em;font-family:inherit;">${dealLabel.replace(" Opportunity", "").replace(" Potential", "")}</p>
              </td></tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ── DIGITAL HEALTH SCORE CARD ──────────────────────────────── -->
  <tr>
    <td style="padding:24px 28px 0;background:#F8FAFC;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid #E5E7EB;border-radius:14px;overflow:hidden;">
        <tr>
          <td style="padding:16px 20px 4px;">
            <p style="margin:0;font-size:10px;font-weight:700;color:${healthColor};text-transform:uppercase;letter-spacing:0.12em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Digital Health Score</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 20px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr valign="middle">
                <td width="120" align="center" style="padding-right:16px;">
                  ${healthRingSvg}
                  <p style="margin:4px 0 0;text-align:center;">
                    <span style="display:inline-block;background:${healthBg};border:1.5px solid ${healthBorder};border-radius:99px;padding:3px 12px;font-size:11px;font-weight:800;color:${healthColor};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${healthLabel}</span>
                  </p>
                </td>
                <td style="padding-left:4px;">
                  <p style="margin:0 0 4px;font-size:15px;font-weight:800;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${businessName} Digital Health</p>
                  <p style="margin:0 0 12px;font-size:12px;color:#6B7280;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Composite score across security, presence &amp; technology efficiency</p>
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td width="48%" style="padding-right:12px;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          ${miniBar("Security Health", securityScore, secRisk > 60 ? "#ef4444" : secRisk > 30 ? "#f97316" : "#22c55e", 80)}
                          ${miniBar("Online Presence", presenceScore, presenceScore > 65 ? "#22c55e" : presenceScore > 40 ? "#f97316" : "#ef4444", 80)}
                        </table>
                      </td>
                      <td width="52%">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          ${miniBar("Tech Efficiency", Math.max(5, Math.min(95, techHealth)), techHealth > 60 ? "#22c55e" : techHealth > 30 ? "#f97316" : "#ef4444", 80)}
                          ${miniBar("Overall Health", healthScore, healthColor, 80)}
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ── DIGITAL PRESENCE SCORE CARD (screenshot design) ────────── -->
  <tr>
    <td style="padding:16px 28px 0;background:#F8FAFC;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid #E5E7EB;border-radius:14px;overflow:hidden;">
        <tr>
          <td style="padding:16px 20px 4px;">
            <p style="margin:0;font-size:10px;font-weight:700;color:#1565C0;text-transform:uppercase;letter-spacing:0.12em;font-family:inherit;">Digital Presence Score</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 20px 16px;">
            <!-- Top row: score box + title + bar -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;">
              <tr valign="middle">
                <!-- Score Box -->
                <td width="76" style="padding-right:14px;">
                  <table cellpadding="0" cellspacing="0" border="0" style="border:2.5px solid ${presColor};border-radius:10px;width:74px;height:74px;">
                    <tr><td align="center" style="padding:8px;">
                      <p style="margin:0;font-size:30px;font-weight:900;color:${presColor};line-height:1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${presenceScore}</p>
                      <p style="margin:2px 0 0;font-size:11px;color:#9ca3af;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">/100</p>
                    </td></tr>
                  </table>
                </td>
                <!-- Title + progress bar -->
                <td>
                  <p style="margin:0 0 2px;font-size:16px;font-weight:800;color:${presColor};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${presLabel}</p>
                  <p style="margin:0 0 8px;font-size:12px;color:#6B7280;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Industry avg: ${industryAvg} &middot; Top performers: 85</p>
                  <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-radius:99px;overflow:hidden;background:#f3f4f6;">
                    <tr>
                      <td style="width:${presenceScore}%;height:9px;background:${presColor};border-radius:99px;font-size:0;" width="${Math.round(presenceScore * 4.4)}">&nbsp;</td>
                      <td style="height:9px;background:#f3f4f6;font-size:0;">&nbsp;</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <!-- Sub-metrics grid -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                ${presCell("Website Health", websiteHealthScore)}
                ${presCell("Analytics", analyticsScore)}
              </tr>
              <tr>
                ${presCell("Lead Generation", leadGenScore)}
                ${presCell("Online Reputation", onlineRepScore)}
              </tr>
              <tr>
                ${presCell("Social Presence", socialScore)}
                <td width="50%"></td>
              </tr>
              ${googleRatingRowHtml}
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ── SECURITY CARD ───────────────────────────────────────────── -->
  ${secFailures > 0 ? `<tr>
    <td style="padding:16px 28px 0;background:#F8FAFC;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid #E5E7EB;border-radius:14px;overflow:hidden;">
        <tr>
          <td style="padding:16px 20px 4px;">
            <p style="margin:0;font-size:10px;font-weight:700;color:#ef4444;text-transform:uppercase;letter-spacing:0.12em;font-family:inherit;">Security Assessment</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 20px 16px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr valign="middle">
                <td width="120" align="center" style="padding-right:16px;">
                  ${halfGaugeSvg(secRisk, riskColor)}
                </td>
                <td style="padding-left:4px;">
                  <p style="margin:0 0 3px;font-size:15px;font-weight:800;color:#111827;font-family:inherit;">${riskLabel}</p>
                  <p style="margin:0 0 12px;font-size:12px;color:#6B7280;font-family:inherit;">${secFailures} vulnerabilit${secFailures === 1 ? "y" : "ies"} detected — vs. &lt;2 for secure sites</p>
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td width="48%" style="padding-right:12px;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          ${miniBar("HTTP Headers", headersScore, riskColor, 80)}
                          ${miniBar("SSL / TLS", sslScore, riskColor, 80)}
                        </table>
                      </td>
                      <td width="52%">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          ${miniBar("Configuration", configScore, riskColor, 80)}
                          ${miniBar("Overall Risk", 100 - secRisk, "#22c55e", 80)}
                        </table>
                      </td>
                    </tr>
                  </table>
                  ${secCatChips ? `<p style="margin:10px 0 0;font-family:inherit;">${secCatChips}</p>` : ""}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>` : ""}

  ${reviewsHtml}

  <!-- ── WHAT WE DISCOVERED ─────────────────────────────────────── -->
  <tr>
    <td style="padding:16px 28px 0;background:#F8FAFC;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid #E5E7EB;border-radius:14px;">
        <tr>
          <td style="padding:16px 20px 4px;">
            <p style="margin:0;font-size:10px;font-weight:700;color:#f97316;text-transform:uppercase;letter-spacing:0.12em;font-family:inherit;">What We Discovered</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 20px 16px;">
            <p style="margin:0 0 10px;font-size:14px;color:#374151;line-height:1.6;font-family:inherit;">
              While reviewing <strong>${businessName}</strong>&rsquo;s technology, we identified
              ${painCount > 0 ? `<strong>${painCount} technology gap${painCount !== 1 ? "s" : ""}</strong>` : "several gaps"}
              that may be limiting growth and efficiency:
            </p>
            ${gapChips ? `<p style="margin:0;font-family:inherit;">${gapChips}</p>` : ""}
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ── CTA ────────────────────────────────────────────────────── -->
  <tr>
    <td style="padding:28px 40px 24px;background:#F8FAFC;">
      <p style="margin:0 0 6px;text-align:center;font-size:15px;color:#374151;line-height:1.7;font-family:inherit;">
        We&rsquo;ve put together a personalized assessment with full findings and recommendations.
      </p>
      <p style="margin:0 0 20px;text-align:center;font-size:14px;color:#9CA3AF;font-family:inherit;">
        Request a free 20-minute consultation &mdash; no commitment.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center">
            <a href="${landingUrl}" style="display:inline-block;background:linear-gradient(135deg,#1565C0,#5e35b1);color:#ffffff;text-decoration:none;font-weight:800;font-size:15px;padding:15px 44px;border-radius:10px;letter-spacing:0.02em;font-family:inherit;">
              View My Assessment &rarr;
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ── FOOTER ─────────────────────────────────────────────────── -->
  <tr>
    <td bgcolor="#F8FAFC" style="background:#F8FAFC;padding:20px 40px;border-top:1px solid #E5E7EB;text-align:center;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#111827;font-family:inherit;">The GCS Technology Consulting Team</p>
      <p style="margin:0 0 8px;font-size:12px;color:#9CA3AF;font-family:inherit;">
        <a href="https://www.itatgcs.com" style="color:#1565C0;text-decoration:none;">www.itatgcs.com</a>
        &nbsp;&middot;&nbsp;
        <a href="mailto:info@itatgcs.com" style="color:#1565C0;text-decoration:none;">info@itatgcs.com</a>
      </p>
      <p style="margin:0;font-size:11px;color:#D1D5DB;line-height:1.6;font-family:inherit;">
        You received this because your business was identified as a potential technology consulting fit.<br/>
        Reply to unsubscribe at any time.
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !isGCSStaff(session.user.role ?? "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { recipientEmail, businessName, pitchText, pitchId, securityScore, presenceScore, dealScore, businessIntelData } =
      await req.json();
    if (!recipientEmail || !businessName || !pitchText) {
      return NextResponse.json(
        { error: "recipientEmail, businessName, and pitchText are required" },
        { status: 400 }
      );
    }

    const landingUrl = pitchId
      ? `https://www.itatgcs.com/consulting/${pitchId}`
      : "https://www.itatgcs.com/contact";

    await sendMail({
      to: recipientEmail,
      subject: `We reviewed ${businessName}'s technology — GCS Consulting`,
      html: buildEmail(
        businessName,
        pitchText,
        landingUrl,
        securityScore ?? 50,
        presenceScore ?? 50,
        dealScore ?? 50,
        businessIntelData
      ),
      replyTo: "info@itatgcs.com",
    });

    // Log this email send to the pitch record
    if (pitchId) {
      try {
        const pitch = await db.pitch.findUnique({ where: { id: pitchId }, select: { emailsSent: true } });
        const existing: Array<{ email: string; sentAt: string }> = [];
        if (pitch?.emailsSent) {
          try { existing.push(...JSON.parse(pitch.emailsSent)); } catch { /* ignore */ }
        }
        existing.push({ email: recipientEmail, sentAt: new Date().toISOString() });
        await db.pitch.update({
          where: { id: pitchId },
          data: { emailsSent: JSON.stringify(existing) },
        });
      } catch { /* non-fatal */ }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send email" },
      { status: 500 }
    );
  }
}
