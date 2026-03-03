import { analyzeSsl, checkDns } from "./pentest";
import type { SslInfo, DnsInfo } from "./pentest";

// ─── Types ──────────────────────────────────────────────────────────────────

export type ScamFinding = {
  type: "positive" | "warning" | "danger";
  title: string;
  detail: string;
};

export type ScamDetail = {
  label: string;
  value: string;
  status: "good" | "warning" | "bad";
};

export type ScamCheckResult = {
  input: string;
  type: "url" | "email";
  riskScore: number;
  trustLevel: "safe" | "suspicious" | "dangerous";
  findings: ScamFinding[];
  details: ScamDetail[];
  checkedAt: string;
};

// ─── Constants ──────────────────────────────────────────────────────────────

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "tempmail.com", "throwaway.email",
  "yopmail.com", "sharklasers.com", "guerrillamailblock.com", "grr.la",
  "dispostable.com", "trashmail.com", "maildrop.cc", "10minutemail.com",
  "temp-mail.org", "fakeinbox.com", "mailnesia.com", "tempail.com",
  "getnada.com", "mohmal.com", "mailcatch.com", "binkmail.com",
  "mintemail.com", "mailexpire.com", "jetable.org", "guerrillamail.info",
  "guerrillamail.net", "guerrillamail.de", "spam4.me", "trashmail.net",
  "trashmail.me", "harakirimail.com", "mailmoat.com", "mytemp.email",
  "tmail.ws", "tmpmail.net", "tmpmail.org", "tempr.email", "discard.email",
  "discardmail.com", "tempmailaddress.com", "emailondeck.com", "33mail.com",
  "maildrop.cc", "inboxkitten.com", "mailsac.com", "burnermail.io",
  "crazymailing.com", "mailnull.com", "spamgourmet.com", "mytrashmail.com",
  "dumpmail.de", "wegwerfmail.de", "einrot.com", "sharklasers.com",
  "guerrillamail.com", "guerrillamailblock.com", "pokemail.net",
  "spam.la", "uggsrock.com", "discardmail.de", "mailtemp.org",
  "tempinbox.com", "mailhazard.com", "mailnesia.com", "bobmail.info",
  "chammy.info", "trashymail.com", "mail-temporaire.fr", "filzmail.com",
  "rcpt.at", "tempsky.com", "onewaymail.com", "tempmail.ninja",
]);

const SUSPICIOUS_TLDS = [
  ".tk", ".ml", ".ga", ".cf", ".gq",   // Free TLDs (high abuse)
  ".xyz", ".top", ".work", ".click", ".link",
  ".buzz", ".club", ".icu", ".cam", ".rest",
  ".surf", ".monster", ".beauty", ".hair", ".quest",
];

const COMMON_BRANDS = [
  "google", "facebook", "apple", "microsoft", "amazon", "paypal",
  "netflix", "instagram", "twitter", "linkedin", "whatsapp", "chase",
  "wellsfargo", "bankofamerica", "citi", "usps", "fedex", "ups",
  "walmart", "target", "costco", "ebay", "spotify", "dropbox",
  "adobe", "zoom", "slack", "github", "yahoo", "outlook",
];

const FREE_HOSTING_PATTERNS = [
  /\.blogspot\./i, /\.wordpress\.com$/i, /\.wix\.com$/i,
  /\.weebly\.com$/i, /sites\.google\.com/i, /\.000webhostapp\.com$/i,
  /\.freehosting\./i, /\.infinityfree\./i,
];

const SUSPICIOUS_CONTENT_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /your account (has been|will be) (suspended|locked|disabled)/i, reason: "Contains account suspension threats — a classic phishing tactic" },
  { pattern: /verify your (account|identity|payment)/i, reason: "Asks to verify identity/account — common in phishing emails" },
  { pattern: /unusual (activity|sign-in|login)/i, reason: "Claims unusual activity to create urgency" },
  { pattern: /click here (immediately|now|within \d+)/i, reason: "Uses urgency language to pressure quick action" },
  { pattern: /(urgent|immediate) action required/i, reason: "High-pressure urgency language detected" },
  { pattern: /won a (prize|gift|reward|lottery)/i, reason: "Fake prize/lottery claim — extremely common scam" },
  { pattern: /claim your (reward|prize|winnings)/i, reason: "Attempts to lure with fake rewards" },
  { pattern: /limited time offer.*act now/i, reason: "Pressure tactic combining scarcity and urgency" },
  { pattern: /wire transfer|western union|bitcoin.*payment/i, reason: "Requests untraceable payment methods" },
];

const FREE_EMAIL_PROVIDERS = new Set([
  "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "aol.com",
  "icloud.com", "mail.com", "protonmail.com", "zoho.com", "live.com",
  "msn.com", "yandex.com", "gmx.com", "gmx.net", "tutanota.com",
]);

// ─── Input Detection ────────────────────────────────────────────────────────

export function detectInputType(input: string): "url" | "email" | null {
  const trimmed = input.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "email";
  if (/^[^\s]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed.replace(/^https?:\/\//, ""))) return "url";
  return null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractDomain(input: string): string {
  const withProto = input.startsWith("http") ? input : `https://${input}`;
  try {
    return new URL(withProto).hostname;
  } catch {
    return input.replace(/^https?:\/\//, "").split("/")[0];
  }
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

function domainAgeMonths(registrationDate: string): number {
  const reg = new Date(registrationDate);
  const now = new Date();
  return (now.getFullYear() - reg.getFullYear()) * 12 + (now.getMonth() - reg.getMonth());
}

async function fetchDomainAge(domain: string): Promise<{ registered: string | null; ageMonths: number | null }> {
  // Extract base domain (e.g. "sub.example.com" → "example.com")
  const parts = domain.split(".");
  const baseDomain = parts.length > 2 ? parts.slice(-2).join(".") : domain;
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`https://rdap.org/domain/${baseDomain}`, {
      signal: controller.signal,
      headers: { Accept: "application/rdap+json" },
    });
    if (!res.ok) return { registered: null, ageMonths: null };
    const data = await res.json();
    const regEvent = data.events?.find((e: { eventAction: string }) => e.eventAction === "registration");
    if (!regEvent?.eventDate) return { registered: null, ageMonths: null };
    const dateStr = regEvent.eventDate;
    return { registered: dateStr, ageMonths: domainAgeMonths(dateStr) };
  } catch {
    return { registered: null, ageMonths: null };
  }
}

// ─── URL Scam Check ─────────────────────────────────────────────────────────

export async function checkUrlScam(url: string): Promise<ScamCheckResult> {
  const domain = extractDomain(url);
  const normalizedUrl = `https://${domain}`;
  const findings: ScamFinding[] = [];
  const details: ScamDetail[] = [];

  // Run checks in parallel
  const [sslResult, dnsResult, ageResult, fetchResult] = await Promise.allSettled([
    analyzeSsl(domain),
    checkDns(domain),
    fetchDomainAge(domain),
    fetchPageContent(normalizedUrl),
  ]);

  const ssl = sslResult.status === "fulfilled" ? sslResult.value : null;
  const dns = dnsResult.status === "fulfilled" ? dnsResult.value : null;
  const age = ageResult.status === "fulfilled" ? ageResult.value : { registered: null, ageMonths: null };
  const pageHtml = fetchResult.status === "fulfilled" ? fetchResult.value : null;

  // ── SSL Analysis ──
  if (ssl) {
    if (ssl.valid && !ssl.selfSigned) {
      findings.push({
        type: "positive",
        title: "Valid SSL Certificate",
        detail: `The site has a valid SSL certificate issued by ${ssl.issuer ?? "a trusted authority"}, expiring in ${ssl.daysUntilExpiry} days. This means data transmitted to this site is encrypted.`,
      });
      details.push({ label: "SSL Certificate", value: `Valid (Grade ${ssl.grade})`, status: "good" });
    } else if (ssl.selfSigned) {
      findings.push({
        type: "danger",
        title: "Self-Signed SSL Certificate",
        detail: "This site uses a self-signed certificate, which means its identity is not verified by any trusted authority. Legitimate businesses almost never use self-signed certificates — this is a strong indicator of a phishing or scam site.",
      });
      details.push({ label: "SSL Certificate", value: "Self-signed (untrusted)", status: "bad" });
    } else {
      findings.push({
        type: "danger",
        title: "Invalid SSL Certificate",
        detail: "The SSL certificate on this site is invalid or expired. This means your connection is not secure and your data could be intercepted. Most legitimate websites maintain valid certificates.",
      });
      details.push({ label: "SSL Certificate", value: "Invalid / Expired", status: "bad" });
    }
  } else {
    findings.push({
      type: "danger",
      title: "No SSL Certificate Found",
      detail: "This site does not have an SSL certificate at all, meaning all data is transmitted in plain text. Any passwords, credit card numbers, or personal info you enter could be stolen. Legitimate sites use HTTPS.",
    });
    details.push({ label: "SSL Certificate", value: "None", status: "bad" });
  }

  // ── DNS Analysis ──
  if (dns) {
    if (dns.hasSpf && dns.hasDmarc) {
      findings.push({
        type: "positive",
        title: "Email Authentication Configured",
        detail: "This domain has SPF and DMARC records configured, which help prevent email spoofing. This is a sign the domain owner takes security seriously.",
      });
    } else if (!dns.hasSpf && !dns.hasDmarc) {
      findings.push({
        type: "warning",
        title: "No Email Authentication",
        detail: "This domain has no SPF or DMARC records. Without these, anyone can send emails pretending to be from this domain. Established businesses typically configure these to protect their brand.",
      });
    }

    if (dns.mxRecords.length === 0) {
      findings.push({
        type: "warning",
        title: "No Email Server (MX Records)",
        detail: "This domain has no mail exchange records, meaning it cannot receive email. If this site claims to be a business that you can contact via email, that is contradictory and suspicious.",
      });
      details.push({ label: "Email (MX)", value: "No mail server", status: "warning" });
    } else {
      details.push({ label: "Email (MX)", value: `${dns.mxRecords.length} mail server(s)`, status: "good" });
    }

    details.push({ label: "SPF Record", value: dns.hasSpf ? "Present" : "Missing", status: dns.hasSpf ? "good" : "warning" });
    details.push({ label: "DMARC Record", value: dns.hasDmarc ? "Present" : "Missing", status: dns.hasDmarc ? "good" : "warning" });
  }

  // ── Domain Age ──
  if (age.ageMonths !== null) {
    if (age.ageMonths < 1) {
      findings.push({
        type: "danger",
        title: "Brand New Domain (< 1 month old)",
        detail: `This domain was registered very recently (${age.registered?.split("T")[0]}). Scam sites are frequently created and abandoned within weeks. Legitimate businesses typically have domains registered for years.`,
      });
      details.push({ label: "Domain Age", value: "< 1 month", status: "bad" });
    } else if (age.ageMonths < 6) {
      findings.push({
        type: "warning",
        title: "Young Domain (< 6 months old)",
        detail: `This domain was registered ${age.ageMonths} month(s) ago (${age.registered?.split("T")[0]}). While not conclusive on its own, newly registered domains are statistically more likely to be associated with scams.`,
      });
      details.push({ label: "Domain Age", value: `${age.ageMonths} month(s)`, status: "warning" });
    } else {
      const years = Math.floor(age.ageMonths / 12);
      findings.push({
        type: "positive",
        title: `Established Domain (${years > 0 ? years + "+ year(s)" : age.ageMonths + " months"})`,
        detail: `This domain has been registered since ${age.registered?.split("T")[0]}. Older domains are generally more trustworthy because scammers tend to use freshly registered ones.`,
      });
      details.push({ label: "Domain Age", value: years > 0 ? `${years}+ year(s)` : `${age.ageMonths} months`, status: "good" });
    }
  } else {
    details.push({ label: "Domain Age", value: "Unknown", status: "warning" });
  }

  // ── Suspicious TLD ──
  const tld = "." + domain.split(".").pop()!.toLowerCase();
  if (SUSPICIOUS_TLDS.includes(tld)) {
    findings.push({
      type: "warning",
      title: `Suspicious TLD (${tld})`,
      detail: `This domain uses the "${tld}" top-level domain, which is known for high abuse rates. Many free or cheap TLDs like ${tld} are disproportionately used by scam and phishing sites because they cost little to register.`,
    });
  }

  // ── Typosquatting ──
  const label = domain.split(".").slice(0, -1).join(".").toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const brand of COMMON_BRANDS) {
    const dist = levenshtein(label, brand);
    if (dist > 0 && dist <= 2 && label !== brand) {
      findings.push({
        type: "danger",
        title: `Possible Typosquatting of "${brand}"`,
        detail: `The domain "${domain}" closely resembles the well-known brand "${brand}" (${dist} character difference). Scammers register domains that look similar to popular brands to trick users into entering their credentials on fake sites.`,
      });
      break;
    }
  }

  // ── Free Hosting ──
  for (const pattern of FREE_HOSTING_PATTERNS) {
    if (pattern.test(domain)) {
      findings.push({
        type: "warning",
        title: "Hosted on Free Platform",
        detail: `This site appears to be hosted on a free hosting platform. While legitimate sites can use free hosting, scammers prefer these because they can be set up instantly at no cost and abandoned without consequence.`,
      });
      break;
    }
  }

  // ── Excessive Subdomains ──
  const subdomainCount = domain.split(".").length - 2;
  if (subdomainCount >= 3) {
    findings.push({
      type: "warning",
      title: "Excessive Subdomains",
      detail: `The URL has ${subdomainCount} subdomain levels (e.g., "login.secure.account.example.com"). Scammers use deep subdomain structures to hide the real domain and make URLs appear more legitimate than they are.`,
    });
  }

  // ── Page Content Analysis ──
  if (pageHtml) {
    for (const { pattern, reason } of SUSPICIOUS_CONTENT_PATTERNS) {
      if (pattern.test(pageHtml)) {
        findings.push({
          type: "danger",
          title: "Suspicious Page Content",
          detail: reason,
        });
        break; // Only report first content match to avoid spam
      }
    }

    // Check for password fields on non-login domains
    if (/<input[^>]*type=["']password["']/i.test(pageHtml)) {
      const isKnownLogin = COMMON_BRANDS.some((b) => domain.includes(b));
      if (!isKnownLogin) {
        findings.push({
          type: "warning",
          title: "Password Field on Unknown Site",
          detail: "This site contains a password input field. If you were directed here by an unexpected email or message, be cautious — this could be a phishing page designed to capture your credentials.",
        });
      }
    }
  }

  details.push({ label: "Domain", value: domain, status: "good" });

  return buildResult(url, "url", findings, details);
}

// ─── Email Scam Check ───────────────────────────────────────────────────────

export async function checkEmailScam(email: string): Promise<ScamCheckResult> {
  const findings: ScamFinding[] = [];
  const details: ScamDetail[] = [];

  const domainPart = email.split("@")[1]?.toLowerCase();
  if (!domainPart) {
    findings.push({
      type: "danger",
      title: "Invalid Email Format",
      detail: "This doesn't appear to be a valid email address. It's missing the domain part after the @ symbol.",
    });
    return buildResult(email, "email", findings, details);
  }

  details.push({ label: "Email", value: email, status: "good" });
  details.push({ label: "Domain", value: domainPart, status: "good" });

  // Run checks in parallel
  const [dnsResult, ageResult] = await Promise.allSettled([
    checkDns(domainPart),
    fetchDomainAge(domainPart),
  ]);

  const dns = dnsResult.status === "fulfilled" ? dnsResult.value : null;
  const age = ageResult.status === "fulfilled" ? ageResult.value : { registered: null, ageMonths: null };

  // ── Disposable Email ──
  if (DISPOSABLE_DOMAINS.has(domainPart)) {
    findings.push({
      type: "danger",
      title: "Disposable/Temporary Email",
      detail: `"${domainPart}" is a known disposable email service. These addresses are temporary and self-destruct after minutes or hours. Legitimate people and businesses don't use throwaway emails for real communication — this is a major red flag.`,
    });
    details.push({ label: "Email Type", value: "Disposable (temporary)", status: "bad" });
  } else if (FREE_EMAIL_PROVIDERS.has(domainPart)) {
    findings.push({
      type: "warning",
      title: "Free Email Provider",
      detail: `This email uses "${domainPart}", a free email provider. While millions of legitimate people use free email, businesses that contact you about financial matters typically use their own company domain (e.g., support@company.com), not free email.`,
    });
    details.push({ label: "Email Type", value: "Free provider", status: "warning" });
  } else {
    findings.push({
      type: "positive",
      title: "Custom Domain Email",
      detail: `This email uses a custom domain ("${domainPart}"), which suggests it belongs to an organization. Businesses and professionals typically use their own domain for email communication.`,
    });
    details.push({ label: "Email Type", value: "Custom domain", status: "good" });
  }

  // ── DNS / MX Records ──
  if (dns) {
    if (dns.mxRecords.length === 0) {
      findings.push({
        type: "danger",
        title: "Domain Cannot Receive Email",
        detail: `The domain "${domainPart}" has no MX (mail exchange) records, meaning it is not configured to send or receive email. An email from this domain is either forged or the domain was set up incorrectly — either way, it's not trustworthy.`,
      });
      details.push({ label: "Mail Server", value: "None found", status: "bad" });
    } else {
      details.push({ label: "Mail Server", value: `${dns.mxRecords.length} server(s) found`, status: "good" });
    }

    if (dns.hasSpf) {
      findings.push({
        type: "positive",
        title: "SPF Record Present",
        detail: "The email domain has an SPF record, which authorizes specific servers to send email on its behalf. This helps verify the sender's identity.",
      });
    } else {
      findings.push({
        type: "warning",
        title: "No SPF Record",
        detail: `The domain "${domainPart}" has no SPF record. Without SPF, anyone can send emails that appear to come from this domain. Established organizations typically set up SPF to prevent email spoofing.`,
      });
    }

    if (dns.hasDmarc) {
      details.push({ label: "DMARC", value: "Configured", status: "good" });
    } else {
      findings.push({
        type: "warning",
        title: "No DMARC Policy",
        detail: `The domain lacks a DMARC policy, which means there's no enforcement mechanism to prevent email spoofing. Combined with missing SPF, this makes it easy for scammers to impersonate senders from this domain.`,
      });
      details.push({ label: "DMARC", value: "Not configured", status: "warning" });
    }
  }

  // ── Domain Age ──
  if (age.ageMonths !== null) {
    if (age.ageMonths < 1) {
      findings.push({
        type: "danger",
        title: "Email Domain Registered < 1 Month Ago",
        detail: `The domain "${domainPart}" was registered very recently (${age.registered?.split("T")[0]}). Scammers frequently register new domains, send a batch of phishing emails, then abandon the domain. This is a strong red flag.`,
      });
      details.push({ label: "Domain Age", value: "< 1 month", status: "bad" });
    } else if (age.ageMonths < 6) {
      findings.push({
        type: "warning",
        title: "Email Domain is < 6 Months Old",
        detail: `The domain was registered ${age.ageMonths} month(s) ago. Young domains are more commonly associated with phishing campaigns.`,
      });
      details.push({ label: "Domain Age", value: `${age.ageMonths} month(s)`, status: "warning" });
    } else {
      const years = Math.floor(age.ageMonths / 12);
      details.push({ label: "Domain Age", value: years > 0 ? `${years}+ year(s)` : `${age.ageMonths} months`, status: "good" });
    }
  }

  // ── Suspicious TLD ──
  const tld = "." + domainPart.split(".").pop()!;
  if (SUSPICIOUS_TLDS.includes(tld.toLowerCase())) {
    findings.push({
      type: "warning",
      title: `Suspicious TLD (${tld})`,
      detail: `The email domain uses "${tld}", a top-level domain known for high abuse rates. Free or very cheap TLDs are disproportionately used by spammers and scammers.`,
    });
  }

  return buildResult(email, "email", findings, details);
}

// ─── Shared ─────────────────────────────────────────────────────────────────

async function fetchPageContent(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 7000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GCS-ScamChecker/1.0)" },
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.slice(0, 50000); // Cap at 50KB to avoid memory issues
  } catch {
    return null;
  }
}

function buildResult(
  input: string,
  type: "url" | "email",
  findings: ScamFinding[],
  details: ScamDetail[],
): ScamCheckResult {
  let score = 0;
  for (const f of findings) {
    if (f.type === "danger") score += 25;
    else if (f.type === "warning") score += 10;
  }
  score = Math.min(100, score);
  const trustLevel: ScamCheckResult["trustLevel"] =
    score >= 60 ? "dangerous" : score >= 30 ? "suspicious" : "safe";

  // Sort: dangers first, then warnings, then positives
  findings.sort((a, b) => {
    const order = { danger: 0, warning: 1, positive: 2 };
    return order[a.type] - order[b.type];
  });

  return {
    input,
    type,
    riskScore: score,
    trustLevel,
    findings,
    details,
    checkedAt: new Date().toISOString(),
  };
}
