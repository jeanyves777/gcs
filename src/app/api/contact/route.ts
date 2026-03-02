import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendMail, contactConfirmationEmail, contactNotificationEmail } from "@/lib/email";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  company: z.string().optional(),
  subject: z.string().min(1),
  message: z.string().min(20),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    await Promise.all([
      // Confirmation to the sender
      sendMail({
        to: data.email,
        subject: "We received your message — GCS",
        html: contactConfirmationEmail(data.name, data.subject),
      }),
      // Internal notification
      sendMail({
        to: process.env.SMTP_FROM_EMAIL ?? "info@itatgcs.com",
        subject: `Contact: ${data.subject}`,
        html: contactNotificationEmail(data.name, data.email, data.company ?? "", data.subject, data.message),
        replyTo: data.email,
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
    }
    console.error("Contact email error:", error);
    return NextResponse.json({ error: "Failed to send message. Please try again." }, { status: 500 });
  }
}
