import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isGCSStaff } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { probeYelp, probeBBB, probePlatformPresence } from "@/lib/business-intel";
import type { WebMention } from "@/lib/business-intel";

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

    const biData = pitch.businessIntelData ? JSON.parse(pitch.businessIntelData) : null;
    if (!biData) {
      return NextResponse.json({ error: "No business intel data to retry" }, { status: 400 });
    }

    const businessName = pitch.businessName;
    const googleAddress = biData.google?.address || "";
    const location = googleAddress
      ? googleAddress.replace(/^[^,]+,\s*/, "").replace(/,\s*USA?$/i, "").trim()
      : "";
    const phone = biData.google?.phone || undefined;

    const diagnostics: Record<string, string> = {};

    console.log(`[retry-platforms] Retrying ALL probes for "${businessName}" in "${location}"`);

    // Always re-run Yelp (even if previously found — corrects wrong-business matches)
    try {
      const prevYelp = biData.yelp?.found ? biData.yelp.url : null;
      const result = await probeYelp(businessName, location, phone, googleAddress);
      biData.yelp = result;
      if (result.found) {
        diagnostics["Yelp"] = prevYelp && prevYelp !== result.url
          ? `Updated: ${result.url} (was: ${prevYelp})`
          : `Found: ${result.url}`;
      } else {
        diagnostics["Yelp"] = prevYelp
          ? `Cleared: previous match "${prevYelp}" no longer passes verification`
          : "Not found";
      }
    } catch (e) {
      diagnostics["Yelp"] = `Error: ${e instanceof Error ? e.message : "unknown"}`;
    }

    // Always re-run BBB (even if previously found — corrects wrong-business matches)
    try {
      const prevBbb = biData.bbb?.found ? biData.bbb.url : null;
      const result = await probeBBB(businessName, location, phone, googleAddress);
      biData.bbb = result;
      if (result.found) {
        diagnostics["BBB"] = prevBbb && prevBbb !== result.url
          ? `Updated: ${result.url} (was: ${prevBbb})`
          : `Found: ${result.url}`;
      } else {
        diagnostics["BBB"] = prevBbb
          ? `Cleared: previous match "${prevBbb}" no longer passes verification`
          : "Not found";
      }
    } catch (e) {
      diagnostics["BBB"] = `Error: ${e instanceof Error ? e.message : "unknown"}`;
    }

    // Sync dedicated probe results → otherMentions (so pill status matches)
    const yelpIdx = (biData.otherMentions || []).findIndex((m: WebMention) => m.source === "Yelp");
    if (yelpIdx !== -1) {
      biData.otherMentions[yelpIdx] = {
        ...biData.otherMentions[yelpIdx],
        found: biData.yelp?.found || false,
        url: biData.yelp?.url || null,
      };
    }
    const bbbIdx = (biData.otherMentions || []).findIndex((m: WebMention) => m.source === "BBB");
    if (bbbIdx !== -1) {
      biData.otherMentions[bbbIdx] = {
        ...biData.otherMentions[bbbIdx],
        found: biData.bbb?.found || false,
        url: biData.bbb?.url || null,
      };
    }

    // Always re-run broad platform presence for ALL platforms
    try {
      const newMentions = await probePlatformPresence(businessName, undefined, location, phone, googleAddress);

      for (const newM of newMentions) {
        // Skip Yelp/BBB — already handled by dedicated probes above
        if (newM.source === "Yelp" || newM.source === "BBB") continue;

        const idx = (biData.otherMentions || []).findIndex((m: WebMention) => m.source === newM.source);
        if (idx !== -1) {
          const prev = biData.otherMentions[idx];
          // Always update with fresh results
          biData.otherMentions[idx] = newM;
          if (newM.found) {
            diagnostics[newM.source] = prev.found && prev.url !== newM.url
              ? `Updated: ${newM.url || "detected"} (was: ${prev.url})`
              : `Found: ${newM.url || "detected via search"}`;
          } else {
            diagnostics[newM.source] = prev.found
              ? `Cleared: previous match no longer passes verification`
              : "Not found";
          }
        }
      }

      // Sync: if Yelp/BBB found via platform presence but missed by dedicated probes
      const yelpFromMentions = newMentions.find(m => m.source === "Yelp");
      if (yelpFromMentions?.found && !biData.yelp?.found) {
        biData.yelp = yelpFromMentions;
        diagnostics["Yelp"] = `Found via broad search: ${yelpFromMentions.url || "detected"}`;
        if (yelpIdx !== -1) {
          biData.otherMentions[yelpIdx] = { ...biData.otherMentions[yelpIdx], found: true, url: yelpFromMentions.url };
        }
      }
      const bbbFromMentions = newMentions.find(m => m.source === "BBB");
      if (bbbFromMentions?.found && !biData.bbb?.found) {
        biData.bbb = bbbFromMentions;
        diagnostics["BBB"] = `Found via broad search: ${bbbFromMentions.url || "detected"}`;
        if (bbbIdx !== -1) {
          biData.otherMentions[bbbIdx] = { ...biData.otherMentions[bbbIdx], found: true, url: bbbFromMentions.url };
        }
      }
    } catch (e) {
      diagnostics["_platformScan"] = `Error: ${e instanceof Error ? e.message : "unknown"}`;
    }

    // Auto-populate Google Maps from Google Places data (we already know the business is on Google)
    if (biData.google?.found) {
      const gmIdx = (biData.otherMentions || []).findIndex((m: WebMention) => m.source === "Google Maps");
      if (gmIdx !== -1 && !biData.otherMentions[gmIdx].found) {
        biData.otherMentions[gmIdx] = {
          ...biData.otherMentions[gmIdx],
          found: true,
          url: biData.google.googleMapsUrl || null,
        };
        diagnostics["Google Maps"] = `Found: Google Places confirmed (${biData.google.googleMapsUrl || "linked"})`;
      }
    }

    // Fill diagnostics for platforms not yet covered
    for (const m of biData.otherMentions || []) {
      if (!diagnostics[m.source]) {
        diagnostics[m.source] = m.found
          ? `Found: ${m.url || "linked"}`
          : "Not found";
      }
    }

    // Save updated BI data
    await db.pitch.update({
      where: { id },
      data: { businessIntelData: JSON.stringify(biData) },
    });

    console.log(`[retry-platforms] Done. Results:`, JSON.stringify(diagnostics, null, 2));

    return NextResponse.json({
      businessIntelData: biData,
      diagnostics,
    });
  } catch (err) {
    console.error("[retry-platforms] Error:", err);
    return NextResponse.json({ error: "Failed to retry platform detection" }, { status: 500 });
  }
}
