import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isGCSStaff } from "@/lib/auth-utils";
import { runBusinessIntel } from "@/lib/business-intel";

export const maxDuration = 120;

/**
 * AI lookup for organization details.
 * Uses the business intelligence system to discover business info
 * from Google Places, Yelp, BBB, and web searches.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !isGCSStaff(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { businessName, website } = await req.json();
    if (!businessName || typeof businessName !== "string") {
      return NextResponse.json({ error: "businessName is required" }, { status: 400 });
    }

    const normalizedWebsite = website || `${businessName.toLowerCase().replace(/\s+/g, "")}.com`;

    const results = await runBusinessIntel(businessName, normalizedWebsite);

    // Map business intel results to organization fields
    const orgData: Record<string, unknown> = {};

    // Google Places data
    if (results.google?.found) {
      const g = results.google;
      if (g.phone) orgData.phone = g.phone;
      if (g.website) orgData.website = g.website;
      if (g.rating) orgData.googleRating = g.rating;
      if (g.categories?.length) orgData.industry = g.categories[0];

      // Parse address into components
      if (g.address) {
        orgData.address = g.address;
        const parts = g.address.split(",").map((s: string) => s.trim());
        if (parts.length >= 3) {
          // Typical: "123 Main St, City, State ZIP, Country"
          orgData.city = parts[parts.length - 3] || undefined;
          const stateZip = parts[parts.length - 2] || "";
          const stateZipMatch = stateZip.match(/^([A-Z]{2})\s+(\d{5}(-\d{4})?)$/);
          if (stateZipMatch) {
            orgData.state = stateZipMatch[1];
            orgData.zipCode = stateZipMatch[2];
          } else {
            orgData.state = stateZip;
          }
        }
      }
    }

    // Domain from website
    if (orgData.website && typeof orgData.website === "string") {
      try {
        const url = new URL(
          (orgData.website as string).startsWith("http")
            ? (orgData.website as string)
            : `https://${orgData.website}`
        );
        orgData.domain = url.hostname.replace(/^www\./, "");
      } catch { /* ignore */ }
    }

    // Yelp
    if (results.yelp?.found && results.yelp.url) {
      orgData.yelpUrl = results.yelp.url;
    }

    // BBB
    if (results.bbb?.found && results.bbb.url) {
      orgData.bbbUrl = results.bbb.url;
    }

    // Social links from platform mentions
    const socialLinks: Record<string, string> = {};
    const socialPlatforms = ["Facebook", "Instagram", "LinkedIn", "Twitter", "YouTube", "TikTok", "Pinterest"];
    for (const mention of results.otherMentions || []) {
      if (mention.found && mention.url) {
        const platform = socialPlatforms.find(
          (p) => mention.source.toLowerCase().includes(p.toLowerCase())
        );
        if (platform) {
          socialLinks[platform.toLowerCase()] = mention.url;
        }
      }
    }
    if (Object.keys(socialLinks).length > 0) {
      orgData.socialLinks = JSON.stringify(socialLinks);
    }

    // Generate a short description from available data
    const descParts: string[] = [];
    if (orgData.industry) descParts.push(`${orgData.industry}`);
    if (orgData.city && orgData.state) descParts.push(`located in ${orgData.city}, ${orgData.state}`);
    if (results.google?.rating) descParts.push(`${results.google.rating}★ on Google (${results.google.reviewCount || 0} reviews)`);
    if (descParts.length > 0) {
      orgData.description = `${businessName} is a ${descParts.join(", ")}.`;
    }

    return NextResponse.json({
      success: true,
      data: orgData,
      raw: {
        google: results.google?.found ? {
          rating: results.google.rating,
          reviewCount: results.google.reviewCount,
          categories: results.google.categories,
          hours: results.google.weekdayHours,
        } : null,
        yelp: results.yelp?.found ? { rating: results.yelp.rating, reviewCount: results.yelp.reviewCount } : null,
        bbb: results.bbb?.found ? { rating: results.bbb.rating } : null,
        domain: results.domainRegistry ? {
          registrar: results.domainRegistry.registrar,
          ageYears: results.domainRegistry.domainAgeYears,
          expiry: results.domainRegistry.expiryDate,
        } : null,
      },
    });
  } catch (err) {
    console.error("AI lookup error:", err);
    return NextResponse.json({ error: "AI lookup failed. Please try again." }, { status: 500 });
  }
}
