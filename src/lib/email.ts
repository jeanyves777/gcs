import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "smtp.hostinger.com",
  port: Number(process.env.SMTP_PORT ?? 465),
  secure: process.env.SMTP_SECURE !== "false", // true for SSL on port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = `"${process.env.SMTP_FROM_NAME ?? "GCS"}" <${process.env.SMTP_FROM_EMAIL ?? "info@itatgcs.com"}>`;

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

export async function sendMail({ to, subject, html, replyTo, attachments }: SendMailOptions) {
  return transporter.sendMail({
    from: FROM,
    to,
    subject,
    html,
    replyTo,
    attachments,
  });
}

// ─── Email Templates ────────────────────────────────────────────────────────

function baseLayout(content: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GCS Email</title>
  <style>
    body { margin: 0; padding: 0; background: #F5F7FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrapper { max-width: 600px; margin: 40px auto; background: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07); }
    .header { background: #1565C0; padding: 32px 40px; text-align: center; }
    .header img { height: 40px; }
    .body { padding: 40px; color: #455A64; font-size: 15px; line-height: 1.6; }
    .body h2 { color: #0A1929; font-size: 20px; margin-top: 0; }
    .btn { display: inline-block; background: #1565C0; color: #FFFFFF !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .divider { border: none; border-top: 1px solid #E8EDF2; margin: 28px 0; }
    .footer { background: #F5F7FA; padding: 24px 40px; text-align: center; font-size: 12px; color: #90A4AE; }
    .footer a { color: #1565C0; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <img src="https://www.itatgcs.com/logo.png" alt="GCS" />
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} General Computing Solutions &nbsp;|&nbsp;
         <a href="https://www.itatgcs.com">www.itatgcs.com</a> &nbsp;|&nbsp;
         <a href="mailto:info@itatgcs.com">info@itatgcs.com</a>
      </p>
      <p style="margin-top:4px;">You're receiving this because you contacted GCS or use our client portal.</p>
    </div>
  </div>
</body>
</html>`;
}

export function contactConfirmationEmail(name: string, subject: string) {
  return baseLayout(`
    <h2>Thanks for reaching out, ${name}!</h2>
    <p>We received your message about <strong>${subject}</strong> and will get back to you within <strong>1 business day</strong>.</p>
    <p>In the meantime, feel free to explore our services or check out our portfolio:</p>
    <a href="https://www.itatgcs.com/services" class="btn">Our Services</a>
    <hr class="divider" />
    <p style="font-size:13px; color:#90A4AE;">If you didn't send this message, please disregard this email.</p>
  `);
}

export function contactNotificationEmail(name: string, email: string, company: string, subject: string, message: string) {
  return baseLayout(`
    <h2>New Contact Form Submission</h2>
    <table style="width:100%; border-collapse:collapse; font-size:14px;">
      <tr><td style="padding:8px 0; color:#90A4AE; width:110px;">Name</td><td style="padding:8px 0; color:#0A1929; font-weight:600;">${name}</td></tr>
      <tr><td style="padding:8px 0; color:#90A4AE;">Email</td><td style="padding:8px 0;"><a href="mailto:${email}" style="color:#1565C0;">${email}</a></td></tr>
      <tr><td style="padding:8px 0; color:#90A4AE;">Company</td><td style="padding:8px 0; color:#0A1929;">${company || "—"}</td></tr>
      <tr><td style="padding:8px 0; color:#90A4AE;">Subject</td><td style="padding:8px 0; color:#0A1929;">${subject}</td></tr>
    </table>
    <hr class="divider" />
    <p style="font-size:13px; color:#455A64; white-space:pre-wrap;">${message}</p>
    <a href="mailto:${email}?subject=Re: ${encodeURIComponent(subject)}" class="btn">Reply to ${name}</a>
  `);
}

export function quoteRequestEmail(name: string, email: string, service: string, details: string) {
  return baseLayout(`
    <h2>New Quote Request</h2>
    <table style="width:100%; border-collapse:collapse; font-size:14px;">
      <tr><td style="padding:8px 0; color:#90A4AE; width:110px;">Name</td><td style="padding:8px 0; color:#0A1929; font-weight:600;">${name}</td></tr>
      <tr><td style="padding:8px 0; color:#90A4AE;">Email</td><td style="padding:8px 0;"><a href="mailto:${email}" style="color:#1565C0;">${email}</a></td></tr>
      <tr><td style="padding:8px 0; color:#90A4AE;">Service</td><td style="padding:8px 0; color:#0A1929;">${service}</td></tr>
    </table>
    <hr class="divider" />
    <p style="font-size:13px; color:#455A64; white-space:pre-wrap;">${details}</p>
    <a href="mailto:${email}" class="btn">Reply to ${name}</a>
  `);
}

export function passwordResetEmail(name: string, resetUrl: string) {
  return baseLayout(`
    <h2>Reset your password</h2>
    <p>Hi ${name}, we received a request to reset your GCS client portal password.</p>
    <p>Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
    <a href="${resetUrl}" class="btn">Reset Password</a>
    <hr class="divider" />
    <p style="font-size:13px; color:#90A4AE;">If you didn't request a password reset, you can safely ignore this email. Your password won't change.</p>
  `);
}

export function welcomeEmail(name: string, portalUrl: string) {
  return baseLayout(`
    <h2>Welcome to the GCS Client Portal!</h2>
    <p>Hi ${name}, your account has been created. You can now access your projects, support tickets, and invoices all in one place.</p>
    <a href="${portalUrl}" class="btn">Access Your Portal</a>
    <hr class="divider" />
    <p style="font-size:13px; color:#90A4AE;">Questions? Reply to this email or contact us at <a href="mailto:info@itatgcs.com">info@itatgcs.com</a>.</p>
  `);
}

// ─── GcsGuard Alert Email ──────────────────────────────────────────────────

const severityStyles: Record<string, { bg: string; text: string; label: string }> = {
  CRITICAL: { bg: "#D32F2F", text: "#FFFFFF", label: "CRITICAL" },
  HIGH: { bg: "#F57C00", text: "#FFFFFF", label: "HIGH" },
  MEDIUM: { bg: "#FBC02D", text: "#0A1929", label: "MEDIUM" },
  LOW: { bg: "#1976D2", text: "#FFFFFF", label: "LOW" },
};

export function guardAlertEmail(alert: {
  severity: string;
  title: string;
  type: string;
  description: string;
  agentName: string;
  hostname: string;
  ipAddress: string;
  organization: string;
  alertUrl: string;
}) {
  const style = severityStyles[alert.severity] || severityStyles.MEDIUM;
  return baseLayout(`
    <div style="text-align:center; margin-bottom:24px;">
      <span style="display:inline-block; background:${style.bg}; color:${style.text}; padding:6px 20px; border-radius:20px; font-weight:700; font-size:13px; letter-spacing:1px;">
        ${style.label} SECURITY ALERT
      </span>
    </div>
    <h2 style="text-align:center;">${alert.title}</h2>
    <table style="width:100%; border-collapse:collapse; font-size:14px; margin:20px 0;">
      <tr><td style="padding:8px 0; color:#90A4AE; width:120px;">Alert Type</td><td style="padding:8px 0; color:#0A1929; font-weight:600;">${alert.type.replace(/_/g, " ")}</td></tr>
      <tr><td style="padding:8px 0; color:#90A4AE;">Agent</td><td style="padding:8px 0; color:#0A1929;">${alert.agentName}</td></tr>
      <tr><td style="padding:8px 0; color:#90A4AE;">Server</td><td style="padding:8px 0; color:#0A1929;">${alert.hostname} (${alert.ipAddress})</td></tr>
      <tr><td style="padding:8px 0; color:#90A4AE;">Organization</td><td style="padding:8px 0; color:#0A1929;">${alert.organization}</td></tr>
      <tr><td style="padding:8px 0; color:#90A4AE;">Time</td><td style="padding:8px 0; color:#0A1929;">${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} ET</td></tr>
    </table>
    <hr class="divider" />
    <p style="font-size:14px; color:#455A64;">${alert.description}</p>
    <div style="text-align:center;">
      <a href="${alert.alertUrl}" class="btn">View Alert in GcsGuard</a>
    </div>
    <hr class="divider" />
    <p style="font-size:12px; color:#90A4AE; text-align:center;">
      This alert was generated by GcsGuard, GCS's AI-powered security monitoring platform.
      <br/>Log in to the <a href="https://www.itatgcs.com/portal/admin/guard" style="color:#1565C0;">GcsGuard Dashboard</a> to investigate and respond.
    </p>
  `);
}

// ─── Patch Notification Email ────────────────────────────────────────────────

export function patchNotificationEmail(data: {
  agentName: string;
  hostname: string;
  organization: string;
  pendingCount: number;
  securityCount: number;
}) {
  return baseLayout(`
    <div style="text-align:center; margin-bottom:24px;">
      <span style="display:inline-block; background:#F57C00; color:#FFFFFF; padding:6px 20px; border-radius:20px; font-weight:700; font-size:13px; letter-spacing:1px;">
        SECURITY UPDATES AVAILABLE
      </span>
    </div>
    <h2 style="text-align:center;">Patches Required: ${data.agentName}</h2>
    <table style="width:100%; border-collapse:collapse; font-size:14px; margin:20px 0;">
      <tr><td style="padding:8px 0; color:#90A4AE; width:140px;">Agent</td><td style="padding:8px 0; color:#0A1929; font-weight:600;">${data.agentName}</td></tr>
      <tr><td style="padding:8px 0; color:#90A4AE;">Server</td><td style="padding:8px 0; color:#0A1929;">${data.hostname}</td></tr>
      <tr><td style="padding:8px 0; color:#90A4AE;">Organization</td><td style="padding:8px 0; color:#0A1929;">${data.organization}</td></tr>
      <tr><td style="padding:8px 0; color:#90A4AE;">Security Updates</td><td style="padding:8px 0; color:#D32F2F; font-weight:700;">${data.securityCount}</td></tr>
      <tr><td style="padding:8px 0; color:#90A4AE;">Total Pending</td><td style="padding:8px 0; color:#0A1929;">${data.pendingCount}</td></tr>
    </table>
    <div style="text-align:center;">
      <a href="https://www.itatgcs.com/portal/admin/guard/patches" class="btn">Review Patches</a>
    </div>
    <hr class="divider" />
    <p style="font-size:12px; color:#90A4AE; text-align:center;">
      This notification was generated by GcsGuard Patch Management.
    </p>
  `);
}

export async function sendPatchNotification(data: {
  agentName: string;
  hostname: string;
  organization: string;
  pendingCount: number;
  securityCount: number;
}) {
  if (data.securityCount === 0) return;
  const html = patchNotificationEmail(data);
  try {
    await sendMail({
      to: process.env.GUARD_ALERT_EMAIL || "info@itatgcs.com",
      subject: `[GcsGuard] ${data.securityCount} Security Updates — ${data.agentName} (${data.hostname})`,
      html,
    });
  } catch (err) {
    console.error("Failed to send patch notification email:", err);
  }
}

// ─── URL Down Notification Email ────────────────────────────────────────────

export function urlDownEmail(data: {
  monitorName: string;
  url: string;
  agentName: string;
  hostname: string;
  statusCode: number;
  error: string;
}) {
  return baseLayout(`
    <div style="text-align:center; margin-bottom:24px;">
      <span style="display:inline-block; background:#D32F2F; color:#FFFFFF; padding:6px 20px; border-radius:20px; font-weight:700; font-size:13px; letter-spacing:1px;">
        URL DOWN ALERT
      </span>
    </div>
    <h2 style="text-align:center;">${data.monitorName} is Down</h2>
    <table style="width:100%; border-collapse:collapse; font-size:14px; margin:20px 0;">
      <tr><td style="padding:8px 0; color:#90A4AE; width:140px;">URL</td><td style="padding:8px 0; color:#0A1929; font-weight:600;">${data.url}</td></tr>
      <tr><td style="padding:8px 0; color:#90A4AE;">Status Code</td><td style="padding:8px 0; color:#D32F2F; font-weight:700;">${data.statusCode}</td></tr>
      <tr><td style="padding:8px 0; color:#90A4AE;">Error</td><td style="padding:8px 0; color:#0A1929;">${data.error || "N/A"}</td></tr>
      <tr><td style="padding:8px 0; color:#90A4AE;">Agent</td><td style="padding:8px 0; color:#0A1929;">${data.agentName} (${data.hostname})</td></tr>
      <tr><td style="padding:8px 0; color:#90A4AE;">Time</td><td style="padding:8px 0; color:#0A1929;">${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} ET</td></tr>
    </table>
    <div style="text-align:center;">
      <a href="https://www.itatgcs.com/portal/admin/guard/monitoring" class="btn">View Monitoring Dashboard</a>
    </div>
  `);
}

export async function sendUrlDownNotification(data: {
  monitorName: string;
  url: string;
  agentName: string;
  hostname: string;
  statusCode: number;
  error: string;
}) {
  const html = urlDownEmail(data);
  try {
    await sendMail({
      to: process.env.GUARD_ALERT_EMAIL || "info@itatgcs.com",
      subject: `[GcsGuard] URL DOWN: ${data.monitorName} (${data.url})`,
      html,
    });
  } catch (err) {
    console.error("Failed to send URL down notification:", err);
  }
}

export async function sendGuardAlertNotification(alert: {
  id: string;
  severity: string;
  title: string;
  type: string;
  description: string;
  agentName: string;
  hostname: string;
  ipAddress: string;
  organization: string;
}) {
  // Only email for CRITICAL and HIGH severity
  if (alert.severity !== "CRITICAL" && alert.severity !== "HIGH") return;

  const alertUrl = `https://www.itatgcs.com/portal/admin/guard/alerts/${alert.id}`;
  const html = guardAlertEmail({ ...alert, alertUrl });

  const severityEmoji = alert.severity === "CRITICAL" ? "🔴" : "🟠";

  try {
    await sendMail({
      to: "info@itatgcs.com",
      subject: `${severityEmoji} GcsGuard [${alert.severity}]: ${alert.title} — ${alert.agentName}`,
      html,
    });
  } catch (err) {
    console.error("Failed to send GcsGuard alert email:", err);
  }
}
