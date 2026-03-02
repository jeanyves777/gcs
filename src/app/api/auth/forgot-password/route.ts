import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });

    // Always return success to prevent email enumeration
    if (!user || !user.isActive) {
      return NextResponse.json({ success: true });
    }

    // Invalidate previous tokens for this email
    await db.passwordResetToken.updateMany({
      where: { email: email.toLowerCase(), used: false },
      data: { used: true },
    });

    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await db.passwordResetToken.create({
      data: { email: email.toLowerCase(), token, expires },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;

    await sendMail({
      to: email,
      subject: "Reset your GCS password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
          <h2 style="color: #1565C0;">Reset your password</h2>
          <p>Hi ${user.name ?? "there"},</p>
          <p>We received a request to reset your GCS Client Portal password. Click the button below to set a new password.</p>
          <p style="margin: 32px 0;">
            <a href="${resetUrl}" style="background: #1565C0; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
              Reset Password
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
          <p style="color: #666; font-size: 12px;">Or copy this URL: ${resetUrl}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">GCS — General Computing Solutions · info@itatgcs.com</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
