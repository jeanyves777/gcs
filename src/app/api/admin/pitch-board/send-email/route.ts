import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isGCSStaff } from "@/lib/auth-utils";
import { sendMail } from "@/lib/email";

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
// Arc from 9-o'clock (left) over 12-o'clock (top) to 3-o'clock (right)
// SVG: M 15,60 A 45,45 0 0,0 105,60   sweep-flag=0 → counter-clockwise = top arc

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
  const empty = maxWidth - filled;
  return `<tr>
  <td style="padding:4px 0 6px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="font-size:12px;color:#374151;font-weight:500;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding-bottom:3px;">${label}</td>
        <td align="right" style="font-size:11px;font-weight:700;color:${color};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding-bottom:3px;">${value}%</td>
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

// ─── Full email builder ───────────────────────────────────────────────────────

function buildEmail(
  businessName: string,
  pitchText: string,
  landingUrl: string,
  securityScore: number,
  presenceScore: number,
  dealScore: number
): string {
  const secRisk  = Math.max(0, 100 - securityScore);
  const riskColor = secRisk > 60 ? "#ef4444" : secRisk > 30 ? "#f97316" : "#22c55e";
  const riskLabel = secRisk > 60 ? "Critical Risk" : secRisk > 30 ? "At Risk" : "Low Risk";
  const presLabel = presenceScore > 65 ? "Strong Presence" : presenceScore > 40 ? "Growing Presence" : "Critical Digital Presence";
  const presColor = presenceScore > 65 ? "#22c55e" : presenceScore > 40 ? "#f97316" : "#ef4444";
  const dealColor = dealScore > 70 ? "#22c55e" : dealScore > 45 ? "#0891b2" : "#a78bfa";
  const dealLabel = dealScore > 70 ? "High Opportunity" : dealScore > 45 ? "Strong Potential" : "Solid Opportunity";

  const industry = extractIndustry(pitchText);
  const secFailures = countSecurityFailures(pitchText);
  const painCount = countPainPoints(pitchText);
  const secCats = securityCategories(pitchText);
  const gapCats = gapCategories(pitchText);

  // Sub-metric scores for presence card mini-bars
  const webScore  = Math.min(95, presenceScore + 8);
  const seoScore  = Math.round(presenceScore * 0.85);
  const brandScore = Math.round(presenceScore * 0.78);
  const contentScore = Math.round(presenceScore * 0.70);

  // Sub-metric scores for security mini-bars
  const headersScore = securityScore;
  const sslScore = securityScore > 60 ? Math.min(95, securityScore + 12) : Math.round(securityScore * 1.1);
  const configScore = Math.round(securityScore * 0.85);

  const secCatChips = secCats
    .map((c) => `<span style="display:inline-block;background:#fef2f2;border:1px solid #fecaca;border-radius:99px;padding:4px 12px;font-size:12px;color:#991b1b;font-weight:600;margin:3px 3px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">🛡️ ${c}</span>`)
    .join("");

  const gapChips = gapCats
    .map((c) => `<span style="display:inline-block;background:#fff7ed;border:1px solid #fed7aa;border-radius:99px;padding:4px 12px;font-size:12px;color:#92400E;font-weight:600;margin:3px 3px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">⚠️ ${c}</span>`)
    .join("");

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
    </td>
  </tr>

  <!-- ── SCORE RINGS ROW ─────────────────────────────────────────── -->
  <tr>
    <td bgcolor="#0A1929" style="background:#0A1929;padding:28px 20px 20px;">
      <p style="margin:0 0 18px;text-align:center;color:rgba(255,255,255,0.4);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;font-family:inherit;">Technology Health Snapshot</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <!-- Security Risk -->
          <td align="center" width="33%" style="padding:0 8px;">
            <table cellpadding="0" cellspacing="0" border="0" style="background:rgba(255,255,255,0.06);border-radius:12px;overflow:hidden;" width="100%">
              <tr><td align="center" style="padding:16px 8px 8px;">
                ${halfGaugeSvg(secRisk, riskColor)}
                <p style="margin:4px 0 2px;font-size:12px;font-weight:800;color:#ffffff;font-family:inherit;">Security Risk</p>
                <p style="margin:0 0 12px;font-size:10px;font-weight:700;color:${riskColor};text-transform:uppercase;letter-spacing:0.08em;font-family:inherit;">${riskLabel}</p>
              </td></tr>
            </table>
          </td>
          <!-- Presence -->
          <td align="center" width="33%" style="padding:0 8px;">
            <table cellpadding="0" cellspacing="0" border="0" style="background:rgba(255,255,255,0.06);border-radius:12px;overflow:hidden;" width="100%">
              <tr><td align="center" style="padding:16px 8px 8px;">
                ${halfGaugeSvg(presenceScore, "#38bdf8")}
                <p style="margin:4px 0 2px;font-size:12px;font-weight:800;color:#ffffff;font-family:inherit;">Online Presence</p>
                <p style="margin:0 0 12px;font-size:10px;font-weight:700;color:#38bdf8;text-transform:uppercase;letter-spacing:0.08em;font-family:inherit;">${presLabel.replace(" Presence", "")}</p>
              </td></tr>
            </table>
          </td>
          <!-- Opportunity -->
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

  <!-- ── DIGITAL PRESENCE ANALYSIS CARD ─────────────────────────── -->
  <tr>
    <td style="padding:24px 28px 0;background:#F8FAFC;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid #E5E7EB;border-radius:14px;overflow:hidden;">
        <tr>
          <td style="padding:16px 20px 4px;">
            <p style="margin:0;font-size:10px;font-weight:700;color:#1565C0;text-transform:uppercase;letter-spacing:0.12em;font-family:inherit;">Digital Presence Score</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 20px 16px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr valign="middle">
                <!-- Left: gauge -->
                <td width="120" align="center" style="padding-right:16px;">
                  ${halfGaugeSvg(presenceScore, presColor)}
                </td>
                <!-- Right: label + bars -->
                <td style="padding-left:4px;">
                  <p style="margin:0 0 3px;font-size:15px;font-weight:800;color:#111827;font-family:inherit;">${presLabel}</p>
                  <p style="margin:0 0 12px;font-size:12px;color:#6B7280;font-family:inherit;">vs. 78 for top performers in ${industry}</p>
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td width="48%" style="padding-right:12px;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          ${miniBar("Website", webScore, "#38bdf8", 80)}
                          ${miniBar("Visibility", seoScore, "#22c55e", 80)}
                        </table>
                      </td>
                      <td width="52%">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          ${miniBar("Branding", brandScore, "#a78bfa", 80)}
                          ${miniBar("Content", contentScore, "#f97316", 80)}
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
        Request a free 20-minute consultation — no commitment.
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

    const { recipientEmail, businessName, pitchText, pitchId, securityScore, presenceScore, dealScore } =
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
        dealScore ?? 50
      ),
      replyTo: "info@itatgcs.com",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send email" },
      { status: 500 }
    );
  }
}
