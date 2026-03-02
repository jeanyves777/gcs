import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";
import { isGCSStaff } from "@/lib/auth-utils";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PITCH_SYSTEM_PROMPT = `You are GCS's elite AI sales intelligence analyst. Global Computing Solutions (GCS) is a premier Managed IT & Software Solutions provider offering:

- **Managed IT Services**: 24/7 monitoring, helpdesk (Tier 1–3), patch management, IT strategy & vCIO
- **Cybersecurity**: Vulnerability assessments, endpoint protection (EDR), SIEM, compliance (SOC2, HIPAA, PCI-DSS, NIST)
- **Cloud Solutions**: Azure/AWS migration & management, cloud backup, disaster recovery (RTO/RPO), hybrid cloud
- **Custom Software Development**: Web platforms, portals, ERP/CRM integrations, workflow automation, APIs
- **AI Integration**: Custom AI tools, intelligent chatbots, document processing, predictive analytics, LLM workflows
- **Enterprise Solutions**: Microsoft 365, infrastructure management, network design, vendor management

You will receive business intelligence about a prospect. Generate a COMPELLING, SPECIFIC, DATA-DRIVEN sales pitch.

Structure your output with EXACTLY these 7 sections using ## headings:

## 🏢 Business Overview
Summarize who this business is — industry, size signals, what they do, their customer base, and their apparent digital maturity level. Reference specific content from their website.

## 🌐 Digital Footprint Analysis
Analyze their web presence: website quality, technology stack hints (CMS, hosting, server), site performance indicators, content freshness, digital channels visible. Identify strengths and weaknesses in their online presence.

## 🔒 Security Assessment
Based on HTTP response headers and HTTPS posture, identify SPECIFIC security gaps. List each missing security header and explain the real risk it creates. Be technical but also explain business impact. Rate their overall security posture (Poor / Fair / Good / Excellent).

## 💡 Pain Points & Opportunities
Identify 4-6 specific pain points this business likely faces based on their industry, size, and digital footprint. Connect each pain point to a real business risk or cost. These should feel eerily accurate to the prospect.

## 🎯 GCS Service Recommendations
List 3-5 specific GCS services with WHY each is the perfect fit for this prospect. Include estimated impact (e.g., "reduce downtime risk by ~70%", "eliminate $X in compliance fines"). Be specific and confident.

## 🚀 The Pitch
Write an executive-ready 3-4 paragraph pitch that could be read verbatim on a sales call or sent as an email. Open with a hook referencing something specific about their business. Show you understand their world. Position GCS as the obvious partner. End with a clear call to action.

## 💬 Deal Talking Points
List 6-8 punchy, specific talking points the GCS sales team can use in conversation. Each should be one line, memorable, and tied to a specific finding about this business. Include at least one about their security gap and one about competitive risk.

RULES:
- Be SPECIFIC — always reference actual findings from their website and headers
- Never be generic — every line should feel written specifically for THIS business
- Quantify wherever possible (downtime costs, breach statistics, efficiency gains)
- Tone: confident expert consultant, not a pushy salesperson
- The prospect should feel like you already understand their business deeply`;

function extractTextFromHtml(html: string): string {
  // Remove script and style blocks entirely
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ");

  // Convert block elements to newlines
  text = text
    .replace(/<\/?(h[1-6]|p|div|li|tr|br|section|article|main)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ") // strip remaining tags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, " ")
    .replace(/\s{3,}/g, "\n\n")
    .trim();

  return text.slice(0, 6000);
}

function analyzeSecurityHeaders(headers: Headers, url: string): string {
  const checks = [
    { name: "Content-Security-Policy", header: "content-security-policy", risk: "XSS attacks and code injection" },
    { name: "Strict-Transport-Security (HSTS)", header: "strict-transport-security", risk: "SSL stripping and man-in-the-middle attacks" },
    { name: "X-Frame-Options", header: "x-frame-options", risk: "clickjacking attacks" },
    { name: "X-Content-Type-Options", header: "x-content-type-options", risk: "MIME sniffing attacks" },
    { name: "Referrer-Policy", header: "referrer-policy", risk: "data leakage via referrer headers" },
    { name: "Permissions-Policy", header: "permissions-policy", risk: "unauthorized access to browser APIs" },
  ];

  const missing: string[] = [];
  const present: string[] = [];

  for (const check of checks) {
    if (headers.get(check.header)) {
      present.push(check.name);
    } else {
      missing.push(`${check.name} — exposes site to ${check.risk}`);
    }
  }

  const server = headers.get("server") || headers.get("x-powered-by") || "hidden";
  const isHttps = url.startsWith("https://");
  const cacheControl = headers.get("cache-control") || "not set";

  return `HTTPS: ${isHttps ? "✅ Yes" : "❌ NO — Critical vulnerability"}
Server/Stack disclosed: ${server}
Cache-Control: ${cacheControl}

Security Headers Present (${present.length}/${checks.length}):
${present.length > 0 ? present.map((h) => `✅ ${h}`).join("\n") : "None"}

Missing Security Headers (${missing.length}):
${missing.map((m) => `❌ ${m}`).join("\n")}`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !isGCSStaff(session.user.role ?? "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { businessName, websiteUrl } = await req.json();
    if (!businessName || !websiteUrl) {
      return NextResponse.json({ error: "businessName and websiteUrl are required" }, { status: 400 });
    }

    // Normalize URL
    let normalizedUrl = websiteUrl.trim();
    if (!normalizedUrl.startsWith("http")) normalizedUrl = "https://" + normalizedUrl;

    // Fetch the website with timeout
    let websiteText = "";
    let securityAnalysis = "";
    let fetchError = "";
    const fetchStart = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(normalizedUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; GCS-SalesBot/1.0; +https://itatgcs.com)",
          "Accept": "text/html,application/xhtml+xml,*/*",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
      clearTimeout(timeout);
      const responseTime = Date.now() - fetchStart;
      const html = await res.text();
      websiteText = extractTextFromHtml(html);
      securityAnalysis = analyzeSecurityHeaders(res.headers, normalizedUrl);
      securityAnalysis += `\nResponse Time: ${responseTime}ms${responseTime > 3000 ? " (SLOW — poor user experience)" : ""}`;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      fetchError = `Could not fetch website (${msg}). Analyze based on business name and domain only.`;
    }

    const userMessage = `
PROSPECT BUSINESS INTELLIGENCE REPORT
======================================
Business Name: ${businessName}
Website URL: ${normalizedUrl}

${fetchError ? `⚠️ Website Fetch Error: ${fetchError}` : ""}

--- WEBSITE CONTENT (extracted text) ---
${websiteText || "Could not extract website content."}

--- SECURITY POSTURE ANALYSIS ---
${securityAnalysis || fetchError}
======================================

Generate the complete sales pitch for this prospect.`.trim();

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          const response = await client.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 3500,
            system: PITCH_SYSTEM_PROMPT,
            messages: [{ role: "user", content: userMessage }],
          });

          for await (const chunk of response) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(chunk.delta.text));
            }
          }
        } catch (err) {
          controller.enqueue(encoder.encode(`\n\nError generating pitch: ${err instanceof Error ? err.message : "Unknown error"}`));
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
