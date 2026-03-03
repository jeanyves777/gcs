import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";
import { isGCSStaff } from "@/lib/auth-utils";
import { runPentest, formatPentestForPrompt } from "@/lib/pentest";
import { runBusinessIntel, formatBusinessIntelForPrompt } from "@/lib/business-intel";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PITCH_SYSTEM_PROMPT = `You are GCS's elite AI sales intelligence analyst AND penetration testing expert. Global Computing Solutions (GCS) is a premier Managed IT & Software Solutions provider offering:

- **Managed IT Services**: 24/7 monitoring, helpdesk (Tier 1–3), patch management, IT strategy & vCIO
- **Cybersecurity**: Vulnerability assessments, endpoint protection (EDR), SIEM, compliance (SOC2, HIPAA, PCI-DSS, NIST), penetration testing
- **Cloud Solutions**: Azure/AWS migration & management, cloud backup, disaster recovery (RTO/RPO), hybrid cloud
- **Custom Software Development**: Web platforms, portals, ERP/CRM integrations, workflow automation, APIs
- **AI Integration**: Custom AI tools, intelligent chatbots, document processing, predictive analytics, LLM workflows
- **Enterprise Solutions**: Microsoft 365, infrastructure management, network design, vendor management

You will receive business intelligence about a prospect INCLUDING their Google Business Profile data, domain/hosting intel, web mentions, social media footprint, AND penetration test results. Generate a COMPELLING, SPECIFIC, DATA-DRIVEN sales pitch.

Structure your output with EXACTLY these 8 sections using ## headings:

## 🏢 Business Overview
Summarize who this business is — industry, size signals, what they do, their customer base, and their apparent digital maturity level. Reference specific content from their website.

## 🌐 Digital Footprint Analysis
Analyze their FULL digital presence:
- Website quality, technology stack hints, performance indicators, content freshness
- **Google Business Profile**: Rating vs industry benchmark, review count and sentiment, business hours accuracy, listing completeness, missing categories or photos
- **Online Reputation**: Yelp listing status, BBB presence, other directory coverage — gaps here represent lost leads
- **Domain & Hosting Intel**: Domain age and expiry, hosting provider quality, registrar, infrastructure signals
- **Social Media**: Which platforms they have active, which key ones are missing, consistency of their social presence, whether their profiles appear active or stale
- **SEO & Marketing Signals**: Open Graph tags, schema markup, meta descriptions, analytics tracking, content strategy
- **Social Proof**: Reviews, testimonials, trust signals visible on site
- **Overall digital maturity rating**: Beginner / Developing / Established / Advanced
Identify specific gaps vs. what competitors in their space typically maintain.

## 🔒 Security Assessment
Based on HTTP response headers and HTTPS posture, identify SPECIFIC security gaps. List each missing security header and explain the real risk it creates. Be technical but also explain business impact. Rate their overall security posture (Poor / Fair / Good / Excellent).

## 🔐 Penetration Test Findings
Based on the automated reconnaissance data provided, deliver a TECHNICAL SECURITY ANALYSIS:
- List each open port found and the SPECIFIC risk it creates for this business
- Assess the SSL/TLS certificate status and what it means for compliance/trust
- Evaluate DNS security (SPF, DMARC) and the email spoofing/phishing risk
- Report any exposed sensitive paths and the data breach implications
- Identify discovered subdomains and what attack surface they represent
- Provide an overall penetration test risk rating (Critical / High / Medium / Low)
- Frame ALL findings as urgent business risks that require immediate action
- Reference specific port numbers, IP addresses, and technical details from the scan data

## 💡 Pain Points & Opportunities
Identify 4-6 specific pain points this business likely faces based on their industry, size, digital footprint, Google Business Profile data, social presence gaps, domain/hosting intel, AND penetration test findings. Connect each pain point to a real business risk or cost. Include at least one pain point from GBP data (rating vs benchmark, specific review complaints, missing listings or hours discrepancies), at least one from social/digital presence gaps, and one from pentest findings. Reference actual review text, actual ratings, and actual technical findings to make these feel eerily accurate to the prospect.

## 🎯 GCS Service Recommendations
CRITICAL RULE: Each recommendation MUST reference a SPECIFIC finding from this prospect's website, pentest results, or social/security analysis. NEVER write generic recommendations.

For each service (list 3-5), use EXACTLY this format:
**[GCS Service Name]** — Because [specific finding/vulnerability/gap discovered] → [specific measurable outcome/ROI for this business]

Example: "**GCS Cybersecurity — Penetration Testing & Hardening** — Because port 3389 (RDP) is open and internet-facing on [businessName]'s server → eliminate the #1 ransomware entry point and achieve compliance in 30 days"

Be so specific that the prospect feels you already have access to their systems.

## 🚀 The Pitch
Write an executive-ready 3-4 paragraph pitch that could be read verbatim on a sales call or sent as an email. Open with a hook referencing something specific about their business or digital presence. Show you understand their world. Position GCS as the obvious partner. End with a clear call to action.

## 💬 Deal Talking Points
List 6-8 punchy, specific talking points the GCS sales team can use in conversation. Each should be one line, memorable, and tied to a specific finding about this business. Include at least one about a pentest finding, one about their security header gaps, one about their Google Business Profile / review rating, one about their social/digital presence, and one about competitive risk.

RULES:
- Be SPECIFIC — always reference actual findings from website, headers, pentest results, and social presence
- Never be generic — every line should feel written specifically for THIS business
- Quantify wherever possible (downtime costs, breach statistics, efficiency gains, compliance fines)
- Tone: confident expert consultant, not a pushy salesperson
- The prospect should feel like you already understand their business deeply and have evidence`;

function extractTextFromHtml(html: string): string {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ");

  text = text
    .replace(/<\/?(h[1-6]|p|div|li|tr|br|section|article|main)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
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

function analyzeSocialPresence(html: string): string {
  const socialPlatforms = [
    { name: "Facebook",        pattern: /href=["'][^"']*facebook\.com\/[^"']{3,}/i },
    { name: "LinkedIn",        pattern: /href=["'][^"']*linkedin\.com\/[^"']{3,}/i },
    { name: "Instagram",       pattern: /href=["'][^"']*instagram\.com\/[^"']{3,}/i },
    { name: "Twitter / X",     pattern: /href=["'][^"']*(?:twitter|x)\.com\/[^"']{3,}/i },
    { name: "YouTube",         pattern: /href=["'][^"']*youtube\.com\/[^"']{3,}/i },
    { name: "TikTok",          pattern: /href=["'][^"']*tiktok\.com\/[^"']{3,}/i },
    { name: "Pinterest",       pattern: /href=["'][^"']*pinterest\.com\/[^"']{3,}/i },
    { name: "Google Business", pattern: /(?:g\.page\/|maps\.google\.|goo\.gl\/maps)/i },
    { name: "Yelp",            pattern: /href=["'][^"']*yelp\.com\/[^"']{3,}/i },
    { name: "Nextdoor",        pattern: /href=["'][^"']*nextdoor\.com\/[^"']{3,}/i },
  ];

  const found  = socialPlatforms.filter(s => s.pattern.test(html)).map(s => s.name);
  const missing = socialPlatforms.filter(s => !s.pattern.test(html)).map(s => s.name);

  const hasOG          = /property=["']og:/i.test(html);
  const hasTwitterCard = /name=["']twitter:/i.test(html);
  const hasSchema      = /"@type"/i.test(html) || /application\/ld\+json/i.test(html);
  const hasMetaDesc    = /<meta[^>]*name=["']description["']/i.test(html);
  const hasGA          = /gtag\(|google-analytics|UA-\d{4,}|G-[A-Z0-9]{5,}/i.test(html);
  const hasGTM         = /googletagmanager/i.test(html);
  const hasPixel       = /connect\.facebook\.net|fbq\(/i.test(html);
  const hasBlog        = /\/blog|\/news|\/articles|\/insights|\/resources/i.test(html);
  const hasReviews     = /testimonial|review|rating|trust|stars|5-star/i.test(html);
  const hasLiveChat    = /tawk\.to|intercom|crisp|zendesk|livechat|drift\./i.test(html);
  const hasCookieBanner = /cookie|gdpr|consent/i.test(html);

  return `--- SOCIAL MEDIA PRESENCE ---
Platforms linked from website (${found.length}):
${found.length > 0 ? found.map(f => `✅ ${f}`).join("\n") : "❌ No social media links found on website"}

Key platforms NOT linked (${missing.length}):
${missing.slice(0, 6).map(m => `❌ ${m} — missing or not linked`).join("\n")}

--- DIGITAL MARKETING SIGNALS ---
SEO & Social Metadata:
${hasOG          ? "✅ Open Graph tags (social sharing looks professional)" : "❌ Missing Open Graph tags — social shares will look broken/unprofessional"}
${hasTwitterCard ? "✅ Twitter/X Card meta tags"                             : "❌ Missing Twitter/X Card — poor Twitter/X sharing appearance"}
${hasSchema      ? "✅ Structured data / Schema.org markup"                  : "❌ No structured data — hurts Google rich snippets and local SEO"}
${hasMetaDesc    ? "✅ Meta description present"                             : "❌ Missing meta description — reduces search click-through rate"}

Analytics & Tracking:
${hasGA    ? "✅ Google Analytics active"      : "❌ No Google Analytics — flying blind on website traffic"}
${hasGTM   ? "✅ Google Tag Manager"           : "❌ No Google Tag Manager"}
${hasPixel ? "✅ Facebook/Meta Pixel tracking" : "❌ No Meta Pixel — cannot run Facebook/Instagram retargeting ads"}

Engagement & Trust:
${hasBlog     ? "✅ Blog / content marketing section exists" : "❌ No blog or content section — missing SEO and thought leadership opportunity"}
${hasReviews  ? "✅ Testimonials or reviews displayed"       : "❌ No social proof visible — trust gap for potential customers"}
${hasLiveChat ? "✅ Live chat / customer support widget"     : "❌ No live chat — potential leads may leave without converting"}
${hasCookieBanner ? "✅ Cookie consent / privacy compliance" : "❌ No cookie consent banner — potential GDPR/privacy compliance risk"}`;
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

    let normalizedUrl = websiteUrl.trim();
    if (!normalizedUrl.startsWith("http")) normalizedUrl = "https://" + normalizedUrl;

    let websiteText = "";
    let securityAnalysis = "";
    let socialAnalysis = "";
    let fetchError = "";
    const fetchStart = Date.now();

    // Run website fetch, pentest, and business intel in PARALLEL
    const [fetchResult, pentestResult, biResult] = await Promise.allSettled([
      // Website fetch
      (async () => {
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
        return { res, html, responseTime };
      })(),
      // Penetration test (runs fully in parallel)
      runPentest(normalizedUrl),
      // Business intelligence (Google, Yelp, BBB, RDAP, IP geo, web search)
      runBusinessIntel(businessName, normalizedUrl),
    ]);

    if (fetchResult.status === "fulfilled") {
      const { res, html, responseTime } = fetchResult.value;
      websiteText = extractTextFromHtml(html);
      securityAnalysis = analyzeSecurityHeaders(res.headers, normalizedUrl);
      securityAnalysis += `\nResponse Time: ${responseTime}ms${responseTime > 3000 ? " (SLOW — poor user experience)" : ""}`;
      socialAnalysis = analyzeSocialPresence(html);
    } else {
      const msg = fetchResult.reason instanceof Error ? fetchResult.reason.message : "Unknown error";
      fetchError = `Could not fetch website (${msg}). Analyze based on business name and domain only.`;
    }

    const pentestResults = pentestResult.status === "fulfilled" ? pentestResult.value : null;
    const pentestSection = pentestResults ? formatPentestForPrompt(pentestResults) : "Penetration test unavailable for this target.";
    const businessIntelResults = biResult.status === "fulfilled" ? biResult.value : null;
    const biSection = businessIntelResults ? formatBusinessIntelForPrompt(businessIntelResults) : "";

    const userMessage = `
PROSPECT BUSINESS INTELLIGENCE REPORT
======================================
Business Name: ${businessName}
Website URL: ${normalizedUrl}

${fetchError ? `⚠️ Website Fetch Error: ${fetchError}` : ""}

--- WEBSITE CONTENT (extracted text) ---
${websiteText || "Could not extract website content."}

--- SECURITY POSTURE ANALYSIS (HTTP Headers) ---
${securityAnalysis || fetchError}

${socialAnalysis ? socialAnalysis : ""}

${biSection ? `--- GOOGLE BUSINESS PROFILE & ONLINE REPUTATION ---\n${biSection}\n` : ""}
--- AUTOMATED PENETRATION TEST ---
${pentestSection}
======================================

Generate the complete sales pitch and security intelligence report for this prospect.`.trim();

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          const response = await client.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 4500,
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

    // Encode pentest + business intel data in response headers for the client to save.
    // Trim heavy text fields so the combined headers stay well under nginx's 64KB buffer.
    const pentestHeader = pentestResults
      ? Buffer.from(JSON.stringify({
          ...pentestResults,
          criticalFindings: pentestResults.criticalFindings.slice(0, 5),
          highFindings: pentestResults.highFindings.slice(0, 5),
        })).toString("base64")
      : "";
    const biHeader = businessIntelResults
      ? Buffer.from(JSON.stringify({
          ...businessIntelResults,
          google: businessIntelResults.google ? {
            ...businessIntelResults.google,
            recentReviews: businessIntelResults.google.recentReviews.slice(0, 3).map(r => ({
              ...r, text: r.text.slice(0, 200),
            })),
          } : null,
          webSearchMentions: businessIntelResults.webSearchMentions.slice(0, 3).map(m => ({
            ...m, snippet: m.snippet.slice(0, 150),
          })),
        })).toString("base64")
      : "";

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
        ...(pentestHeader ? { "X-Pentest-Data": pentestHeader } : {}),
        ...(biHeader ? { "X-Business-Intel-Data": biHeader } : {}),
      },
    });
  } catch (err) {
    console.error("[analyze] Unhandled error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
