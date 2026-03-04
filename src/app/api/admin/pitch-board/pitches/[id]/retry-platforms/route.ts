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

    // Identify which platforms are currently missing
    const currentYelpFound = biData.yelp?.found === true;
    const currentBbbFound = biData.bbb?.found === true;
    const missingPlatforms = (biData.otherMentions || [])
      .filter((m: WebMention) => !m.found)
      .map((m: WebMention) => m.source);

    const diagnostics: Record<string, string> = {};

    console.log(`[retry-platforms] Retrying for "${businessName}" in "${location}"`);
    console.log(`[retry-platforms] Missing: Yelp=${!currentYelpFound}, BBB=${!currentBbbFound}, others=${missingPlatforms.join(", ")}`);

    // Re-run Yelp if missing
    if (!currentYelpFound) {
      try {
        const result = await probeYelp(businessName, location, phone);
        biData.yelp = result;
        diagnostics["Yelp"] = result.found
          ? `Found: ${result.url}`
          : "Not found — no Yelp listing matched via web search or direct URL probing";
      } catch (e) {
        diagnostics["Yelp"] = `Error: ${e instanceof Error ? e.message : "unknown"}`;
      }
    } else {
      diagnostics["Yelp"] = `Already found: ${biData.yelp.url || "linked"}`;
    }

    // Re-run BBB if missing
    if (!currentBbbFound) {
      try {
        const result = await probeBBB(businessName, location);
        biData.bbb = result;
        diagnostics["BBB"] = result.found
          ? `Found: ${result.url}`
          : "Not found — BBB API returned no matching business name";
      } catch (e) {
        diagnostics["BBB"] = `Error: ${e instanceof Error ? e.message : "unknown"}`;
      }
    } else {
      diagnostics["BBB"] = `Already found: ${biData.bbb.url || "linked"}`;
    }

    // Re-run broad platform presence for ALL missing platforms
    if (missingPlatforms.length > 0) {
      try {
        const newMentions = await probePlatformPresence(businessName, undefined, location);

        // Merge: only update platforms that were missing and are now found
        for (const newM of newMentions) {
          const idx = (biData.otherMentions || []).findIndex((m: WebMention) => m.source === newM.source);
          if (idx !== -1) {
            const current = biData.otherMentions[idx];
            if (!current.found && newM.found) {
              biData.otherMentions[idx] = newM;
              diagnostics[newM.source] = `Found: ${newM.url || "detected via search"}`;
            } else if (!current.found && !newM.found) {
              diagnostics[newM.source] = "Not found — no listing detected via web search";
            }
            // If already found, don't overwrite
            if (current.found && !diagnostics[newM.source]) {
              diagnostics[newM.source] = `Already found: ${current.url || "linked"}`;
            }
          }
        }

        // Sync: if Yelp/BBB found via platform presence but missed by dedicated probes
        const yelpFromMentions = newMentions.find(m => m.source === "Yelp");
        if (yelpFromMentions?.found && !biData.yelp?.found) {
          biData.yelp = yelpFromMentions;
          diagnostics["Yelp"] = `Found via broad search: ${yelpFromMentions.url || "detected"}`;
        }
        const bbbFromMentions = newMentions.find(m => m.source === "BBB");
        if (bbbFromMentions?.found && !biData.bbb?.found) {
          biData.bbb = bbbFromMentions;
          diagnostics["BBB"] = `Found via broad search: ${bbbFromMentions.url || "detected"}`;
        }
      } catch (e) {
        diagnostics["_platformScan"] = `Error: ${e instanceof Error ? e.message : "unknown"}`;
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
