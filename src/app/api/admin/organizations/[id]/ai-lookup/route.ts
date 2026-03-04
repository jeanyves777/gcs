import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isGCSStaff } from "@/lib/auth-utils";

// Reuse the standalone ai-lookup logic
export const maxDuration = 120;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user || !isGCSStaff(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const org = await db.organization.findUnique({ where: { id } });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Forward to the standalone ai-lookup route logic
  const body = await req.json().catch(() => ({}));
  const businessName = body.businessName || org.name;
  const website = body.website || org.website;

  // Dynamically import to avoid circular deps
  const { runBusinessIntel } = await import("@/lib/business-intel");

  const normalizedWebsite = website || `${businessName.toLowerCase().replace(/\s+/g, "")}.com`;
  const results = await runBusinessIntel(businessName, normalizedWebsite);

  const orgData: Record<string, unknown> = {};

  if (results.google?.found) {
    const g = results.google;
    if (g.phone) orgData.phone = g.phone;
    if (g.website) orgData.website = g.website;
    if (g.rating) orgData.googleRating = g.rating;
    if (g.categories?.length) orgData.industry = g.categories[0];
    if (g.address) {
      orgData.address = g.address;
      const parts = g.address.split(",").map((s: string) => s.trim());
      if (parts.length >= 3) {
        orgData.city = parts[parts.length - 3] || undefined;
        const stateZip = parts[parts.length - 2] || "";
        const m = stateZip.match(/^([A-Z]{2})\s+(\d{5}(-\d{4})?)$/);
        if (m) { orgData.state = m[1]; orgData.zipCode = m[2]; }
        else orgData.state = stateZip;
      }
    }
  }

  if (orgData.website && typeof orgData.website === "string") {
    try {
      const url = new URL(
        (orgData.website as string).startsWith("http") ? (orgData.website as string) : `https://${orgData.website}`
      );
      orgData.domain = url.hostname.replace(/^www\./, "");
    } catch { /* ignore */ }
  }

  if (results.yelp?.found && results.yelp.url) orgData.yelpUrl = results.yelp.url;
  if (results.bbb?.found && results.bbb.url) orgData.bbbUrl = results.bbb.url;

  const socialLinks: Record<string, string> = {};
  const platforms = ["Facebook", "Instagram", "LinkedIn", "Twitter", "YouTube", "TikTok", "Pinterest"];
  for (const mention of results.otherMentions || []) {
    if (mention.found && mention.url) {
      const p = platforms.find((pl) => mention.source.toLowerCase().includes(pl.toLowerCase()));
      if (p) socialLinks[p.toLowerCase()] = mention.url;
    }
  }
  if (Object.keys(socialLinks).length > 0) orgData.socialLinks = JSON.stringify(socialLinks);

  const descParts: string[] = [];
  if (orgData.industry) descParts.push(`${orgData.industry}`);
  if (orgData.city && orgData.state) descParts.push(`located in ${orgData.city}, ${orgData.state}`);
  if (results.google?.rating) descParts.push(`${results.google.rating}★ on Google (${results.google.reviewCount || 0} reviews)`);
  if (descParts.length > 0) orgData.description = `${businessName} is a ${descParts.join(", ")}.`;

  return NextResponse.json({
    success: true,
    data: orgData,
    raw: {
      google: results.google?.found ? { rating: results.google.rating, reviewCount: results.google.reviewCount, categories: results.google.categories } : null,
      yelp: results.yelp?.found ? { rating: results.yelp.rating, reviewCount: results.yelp.reviewCount } : null,
      bbb: results.bbb?.found ? { rating: results.bbb.rating } : null,
    },
  });
}
