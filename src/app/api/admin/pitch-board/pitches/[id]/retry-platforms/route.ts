import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isGCSStaff } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { probeYelp, probeBBB } from "@/lib/business-intel";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !isGCSStaff(session.user.role ?? "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const pitch = await db.pitch.findUnique({ where: { id } });
    if (!pitch) {
      return NextResponse.json({ error: "Pitch not found" }, { status: 404 });
    }

    // Parse existing BI data
    let biData = pitch.businessIntelData ? JSON.parse(pitch.businessIntelData) : null;
    if (!biData) {
      return NextResponse.json({ error: "No business intel data to retry" }, { status: 400 });
    }

    const businessName = pitch.businessName;
    // Extract location from Google Places address or domain
    const googleAddress = biData.google?.address || "";
    const location = googleAddress
      ? googleAddress.replace(/^[^,]+,\s*/, "").replace(/,\s*USA?$/i, "").trim()
      : "";
    const phone = biData.google?.phone || undefined;

    console.log(`[retry-platforms] Retrying Yelp/BBB for "${businessName}" in "${location}"`);

    // Run both probes in parallel
    const [yelpResult, bbbResult] = await Promise.allSettled([
      probeYelp(businessName, location, phone),
      probeBBB(businessName, location),
    ]);

    const newYelp = yelpResult.status === "fulfilled" ? yelpResult.value : null;
    const newBbb = bbbResult.status === "fulfilled" ? bbbResult.value : null;

    // Update BI data with new results
    if (newYelp) biData.yelp = newYelp;
    if (newBbb) biData.bbb = newBbb;

    // Also update otherMentions array if Yelp/BBB are in there
    if (biData.otherMentions) {
      for (const mention of biData.otherMentions) {
        if (mention.source === "Yelp" && newYelp) {
          mention.found = newYelp.found;
          mention.url = newYelp.url;
          mention.rating = newYelp.rating;
          mention.snippet = newYelp.snippet;
        }
        if (mention.source === "BBB" && newBbb) {
          mention.found = newBbb.found;
          mention.url = newBbb.url;
          mention.snippet = newBbb.snippet;
        }
      }
    }

    // Save updated BI data
    await db.pitch.update({
      where: { id },
      data: { businessIntelData: JSON.stringify(biData) },
    });

    console.log(`[retry-platforms] Done. Yelp: ${newYelp?.found ? "FOUND" : "not found"}, BBB: ${newBbb?.found ? "FOUND" : "not found"}`);

    return NextResponse.json({
      yelp: newYelp,
      bbb: newBbb,
      businessIntelData: biData,
    });
  } catch (err) {
    console.error("[retry-platforms] Error:", err);
    return NextResponse.json({ error: "Failed to retry platform detection" }, { status: 500 });
  }
}
