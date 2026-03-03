import { NextRequest, NextResponse } from "next/server";
import { sendMail } from "@/lib/email";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string().min(5),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }
    const { name, email, phone, message } = parsed.data;

    // Fetch pitch info for context
    const pitch = await db.pitch.findUnique({
      where: { id },
      select: { businessName: true, websiteUrl: true },
    });

    const businessName = pitch?.businessName ?? "Unknown Business";
    const pitchUrl = `https://www.itatgcs.com/consulting/${id}`;

    // Notify GCS team
    await sendMail({
      to: "info@itatgcs.com",
      subject: `Consultation Request — ${businessName}`,
      replyTo: email,
      html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#1565C0,#5e35b1);padding:28px 36px;">
      <p style="margin:0 0 4px;color:rgba(255,255,255,0.7);font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">GCS Technology Consulting</p>
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:800;">New Consultation Request</h1>
    </div>
    <div style="padding:28px 36px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:10px 0;color:#6B7280;font-size:13px;width:110px;">From</td><td style="padding:10px 0;color:#111827;font-weight:600;font-size:14px;">${name}</td></tr>
        <tr><td style="padding:10px 0;color:#6B7280;font-size:13px;">Email</td><td style="padding:10px 0;"><a href="mailto:${email}" style="color:#1565C0;font-size:14px;">${email}</a></td></tr>
        ${phone ? `<tr><td style="padding:10px 0;color:#6B7280;font-size:13px;">Phone</td><td style="padding:10px 0;color:#111827;font-size:14px;">${phone}</td></tr>` : ""}
        <tr><td style="padding:10px 0;color:#6B7280;font-size:13px;">Business</td><td style="padding:10px 0;color:#111827;font-size:14px;font-weight:600;">${businessName}</td></tr>
        <tr><td style="padding:10px 0;color:#6B7280;font-size:13px;vertical-align:top;">Message</td><td style="padding:10px 0;color:#374151;font-size:14px;line-height:1.6;">${message}</td></tr>
      </table>
      <div style="margin-top:20px;padding-top:20px;border-top:1px solid #E5E7EB;">
        <a href="${pitchUrl}" style="display:inline-block;background:#1565C0;color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:10px 20px;border-radius:8px;">View Pitch Analysis →</a>
      </div>
    </div>
  </div>
</body>
</html>`,
    });

    // Confirmation to prospect
    await sendMail({
      to: email,
      subject: `We received your request — GCS Technology Consulting`,
      html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#1565C0,#5e35b1);padding:28px 36px;">
      <img src="https://www.itatgcs.com/logo.png" alt="GCS" style="height:32px;filter:brightness(0) invert(1);display:block;margin-bottom:16px;"/>
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:800;">We'll be in touch shortly</h1>
    </div>
    <div style="padding:28px 36px;">
      <p style="margin:0 0 16px;color:#374151;line-height:1.75;font-size:15px;">Hi ${name},</p>
      <p style="margin:0 0 16px;color:#374151;line-height:1.75;font-size:15px;">
        Thank you for reaching out to <strong>GCS Technology Consulting</strong>. We received your request regarding <strong>${businessName}</strong> and our team will contact you within 1 business day.
      </p>
      <p style="margin:0;color:#374151;line-height:1.75;font-size:15px;">
        In the meantime, feel free to reply to this email with any questions.
      </p>
    </div>
    <div style="background:#F8FAFC;padding:20px 36px;border-top:1px solid #E5E7EB;text-align:center;">
      <p style="margin:0 0 4px;font-weight:700;font-size:13px;color:#111827;">The GCS Technology Consulting Team</p>
      <p style="margin:0;font-size:12px;color:#9CA3AF;">
        <a href="https://www.itatgcs.com" style="color:#1565C0;text-decoration:none;">www.itatgcs.com</a>
        &nbsp;·&nbsp;
        <a href="mailto:info@itatgcs.com" style="color:#1565C0;text-decoration:none;">info@itatgcs.com</a>
      </p>
    </div>
  </div>
</body>
</html>`,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
