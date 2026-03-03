import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isGCSStaff } from "@/lib/auth-utils";
import { sendMail } from "@/lib/email";

/** Count ❌ items in security section */
function countSecurityFailures(pitchText: string): number {
  const match = pitchText.match(/## 🔒 Security Assessment([\s\S]*?)(?=\n##|$)/);
  if (!match) return 0;
  return (match[1].match(/❌/g) ?? []).length;
}

/** Count bullet items in pain points section */
function countPainPoints(pitchText: string): number {
  const match = pitchText.match(/## 💡 Pain Points[^#]*([\s\S]*?)(?=\n##|$)/);
  if (!match) return 0;
  return (match[1].match(/^[-•*]\s+|^\d+\.\s+/gm) ?? []).length;
}

/** Derive security category labels (generic, no specifics) */
function securityCategories(pitchText: string): string[] {
  const match = pitchText.match(/## 🔒 Security Assessment([\s\S]*?)(?=\n##|$)/);
  if (!match) return [];
  const text = match[1].toLowerCase();
  const cats: string[] = [];
  if (text.includes("content-security") || text.includes("csp")) cats.push("Content Security");
  if (text.includes("transport") || text.includes("hsts") || text.includes("ssl")) cats.push("Transport Security");
  if (text.includes("frame") || text.includes("clickjack")) cats.push("Clickjacking Protection");
  if (text.includes("content-type") || text.includes("mime")) cats.push("MIME Type Controls");
  if (text.includes("referrer")) cats.push("Referrer Controls");
  if (text.includes("permission") || text.includes("feature")) cats.push("Browser Permissions");
  return cats.slice(0, 3);
}

function buildTeaserEmail(businessName: string, pitchText: string, landingUrl: string): string {
  const secFailures = countSecurityFailures(pitchText);
  const painCount = countPainPoints(pitchText);
  const cats = securityCategories(pitchText);

  const secLabel = secFailures >= 4 ? "critical" : secFailures >= 2 ? "significant" : "several";
  const catList = cats.length > 0
    ? cats.map((c) => `<li style="margin-bottom:6px;color:#374151;">${c}</li>`).join("")
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>A Note for ${businessName} — GCS Consulting</title>
</head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1565C0 0%,#5e35b1 100%);padding:32px 40px;">
      <img src="https://www.itatgcs.com/logo.png" alt="GCS" style="height:32px;filter:brightness(0) invert(1);display:block;margin-bottom:18px;"/>
      <p style="margin:0 0 6px;color:rgba(255,255,255,0.65);font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">GCS Technology Consulting</p>
      <h1 style="margin:0;color:#ffffff;font-size:21px;font-weight:800;line-height:1.3;">We looked at ${businessName}&rsquo;s technology.</h1>
    </div>

    <!-- Body -->
    <div style="padding:32px 40px;">
      <p style="margin:0 0 18px;color:#374151;font-size:15px;line-height:1.75;">Hi,</p>
      <p style="margin:0 0 18px;color:#374151;font-size:15px;line-height:1.75;">
        Our team at <strong>GCS Technology Consulting</strong> recently reviewed <strong>${businessName}</strong>&rsquo;s technology footprint and found a few things worth a conversation.
      </p>

      <!-- Findings summary — intentionally vague -->
      <div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
        <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#92400E;text-transform:uppercase;letter-spacing:0.06em;">What We Found</p>
        <table style="width:100%;border-collapse:collapse;">
          ${secFailures > 0 ? `<tr>
            <td style="padding:7px 0;vertical-align:top;width:28px;"><span style="color:#DC2626;font-size:16px;">🔴</span></td>
            <td style="padding:7px 0;color:#374151;font-size:14px;line-height:1.5;">
              <strong>${secFailures} security ${secFailures === 1 ? "vulnerability" : "vulnerabilities"}</strong> identified across ${secLabel} risk areas
              ${catList ? `<ul style="margin:6px 0 0 0;padding-left:18px;color:#6B7280;font-size:13px;">${catList}</ul>` : ""}
            </td>
          </tr>` : ""}
          ${painCount > 0 ? `<tr>
            <td style="padding:7px 0;vertical-align:top;width:28px;"><span style="font-size:16px;">⚠️</span></td>
            <td style="padding:7px 0;color:#374151;font-size:14px;line-height:1.5;">
              <strong>${painCount} technology gap${painCount !== 1 ? "s" : ""}</strong> that may be affecting efficiency and growth
            </td>
          </tr>` : ""}
          <tr>
            <td style="padding:7px 0;vertical-align:top;width:28px;"><span style="font-size:16px;">📊</span></td>
            <td style="padding:7px 0;color:#374151;font-size:14px;line-height:1.5;">
              Specific service recommendations tailored to your business needs
            </td>
          </tr>
        </table>
      </div>

      <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.75;">
        We&rsquo;ve put together a brief assessment with our full findings and recommendations — available for you to review at any time.
      </p>

      <!-- CTA -->
      <div style="text-align:center;margin-bottom:28px;">
        <a href="${landingUrl}" style="display:inline-block;background:linear-gradient(135deg,#1565C0,#5e35b1);color:#ffffff;text-decoration:none;font-weight:800;font-size:15px;padding:15px 36px;border-radius:10px;letter-spacing:0.02em;">
          View My Assessment &rarr;
        </a>
        <p style="margin:10px 0 0;color:#9CA3AF;font-size:12px;">Includes a free consultation request form</p>
      </div>

      <p style="margin:0;color:#6B7280;font-size:14px;line-height:1.7;">
        If you&rsquo;d like to talk through the findings, we&rsquo;re happy to set up a quick 20-minute call — no pressure, no commitment.
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#F8FAFC;padding:20px 40px;border-top:1px solid #E5E7EB;text-align:center;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#111827;">The GCS Technology Consulting Team</p>
      <p style="margin:0;font-size:12px;color:#9CA3AF;">
        <a href="https://www.itatgcs.com" style="color:#1565C0;text-decoration:none;">www.itatgcs.com</a>
        &nbsp;·&nbsp;
        <a href="mailto:info@itatgcs.com" style="color:#1565C0;text-decoration:none;">info@itatgcs.com</a>
      </p>
      <p style="margin:8px 0 0;font-size:11px;color:#D1D5DB;line-height:1.5;">
        You received this because your business was identified as a potential fit for our services.<br/>
        Reply to unsubscribe.
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !isGCSStaff(session.user.role ?? "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { recipientEmail, businessName, pitchText, pitchId } = await req.json();
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
      html: buildTeaserEmail(businessName, pitchText, landingUrl),
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
