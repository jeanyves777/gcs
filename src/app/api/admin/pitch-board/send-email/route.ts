import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isGCSStaff } from "@/lib/auth-utils";
import { sendMail } from "@/lib/email";

/** Extract only the "The Pitch" section from the full pitch markdown */
function extractPitchSection(pitchText: string): string {
  const match = pitchText.match(/##\s*🚀\s*The Pitch([\s\S]*?)(?=\n##\s|$)/);
  return match ? match[1].trim() : pitchText.trim();
}

/** Convert pitch markdown text to clean HTML paragraphs */
function pitchToHtml(pitchContent: string): string {
  return pitchContent
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^[-•*]\s+(.+)/gm, "<li>$1</li>")
    .replace(/^\d+\.\s+(.+)/gm, "<li>$1</li>")
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      if (p.includes("<li>")) {
        return `<ul style="margin:10px 0 10px 22px; padding:0; color:#374151; line-height:1.7;">${p}</ul>`;
      }
      return `<p style="margin:0 0 16px 0; color:#374151; line-height:1.75; font-size:15px;">${p.replace(/\n/g, "<br/>")}</p>`;
    })
    .join("\n");
}

function buildEmailHtml(businessName: string, pitchText: string): string {
  const pitchSection = extractPitchSection(pitchText);
  const pitchHtml = pitchToHtml(pitchSection);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>A Technology Brief for ${businessName}</title>
</head>
<body style="margin:0; padding:0; background:#F1F5F9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:640px; margin:40px auto; background:#FFFFFF; border-radius:16px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg, #1565C0 0%, #5e35b1 100%); padding:36px 48px 32px;">
      <img src="https://www.itatgcs.com/logo.png" alt="GCS" style="height:36px; width:auto; filter:brightness(0) invert(1); display:block; margin-bottom:20px;" />
      <p style="margin:0 0 6px 0; color:rgba(255,255,255,0.75); font-size:12px; font-weight:600; letter-spacing:0.1em; text-transform:uppercase;">GCS Technology Consulting</p>
      <h1 style="margin:0 0 8px 0; color:#ffffff; font-size:24px; font-weight:800; line-height:1.3;">
        A Technology Brief for ${businessName}
      </h1>
      <p style="margin:0; color:rgba(255,255,255,0.8); font-size:14px; line-height:1.5;">
        Our consulting team put together some observations and ideas specifically for your business.
      </p>
    </div>

    <!-- Opening note -->
    <div style="padding:28px 48px 0;">
      <p style="margin:0; font-size:15px; color:#374151; line-height:1.75;">
        Hi there,
      </p>
      <p style="margin:12px 0 0 0; font-size:15px; color:#374151; line-height:1.75;">
        Our team at <strong>GCS Technology Consulting</strong> recently had the chance to review <strong>${businessName}</strong>'s technology footprint. Based on what we found, we wanted to share a few thoughts on how we might be able to support your growth and strengthen your operations.
      </p>
    </div>

    <!-- Divider -->
    <div style="margin:24px 48px; border-top:1px solid #E5E7EB;"></div>

    <!-- Pitch Content -->
    <div style="padding:0 48px;">
      ${pitchHtml}
    </div>

    <!-- CTA -->
    <div style="padding:28px 48px 36px; text-align:center;">
      <p style="margin:0 0 20px 0; font-size:14px; color:#6B7280; line-height:1.6;">
        We'd love to walk you through our full findings and explore how we can help — no pressure, just a conversation.
      </p>
      <a
        href="https://www.itatgcs.com/contact"
        style="display:inline-block; background:linear-gradient(135deg, #1565C0, #5e35b1); color:#ffffff; text-decoration:none; font-weight:700; font-size:15px; padding:14px 36px; border-radius:10px; letter-spacing:0.02em;"
      >
        Book a Free Consultation →
      </a>
    </div>

    <!-- Footer -->
    <div style="background:#F8FAFC; padding:24px 48px; border-top:1px solid #E5E7EB; text-align:center;">
      <p style="margin:0 0 4px 0; font-size:13px; font-weight:700; color:#111827;">The GCS Technology Consulting Team</p>
      <p style="margin:0 0 8px 0; font-size:12px; color:#9CA3AF;">
        <a href="https://www.itatgcs.com" style="color:#1565C0; text-decoration:none;">www.itatgcs.com</a>
        &nbsp;·&nbsp;
        <a href="mailto:info@itatgcs.com" style="color:#1565C0; text-decoration:none;">info@itatgcs.com</a>
      </p>
      <p style="margin:0; font-size:11px; color:#D1D5DB; line-height:1.5;">
        This message was sent to you because your business was identified as a potential fit for our services.<br/>
        If you'd prefer not to hear from us, simply reply to let us know.
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

    const { recipientEmail, businessName, pitchText } = await req.json();
    if (!recipientEmail || !businessName || !pitchText) {
      return NextResponse.json(
        { error: "recipientEmail, businessName, and pitchText are required" },
        { status: 400 }
      );
    }

    await sendMail({
      to: recipientEmail,
      subject: `A Technology Brief for ${businessName} — GCS Consulting`,
      html: buildEmailHtml(businessName, pitchText),
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
