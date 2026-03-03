import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isGCSStaff } from "@/lib/auth-utils";
import { db } from "@/lib/db";

const PLACES_BASE = "https://maps.googleapis.com/maps/api/place";

// Category types to exclude from display
const EXCLUDE_TYPES = new Set([
  "point_of_interest", "establishment", "food", "store", "geocode",
  "premise", "political", "locality", "sublocality", "route",
]);

export type LeadResult = {
  placeId: string;
  name: string;
  rating: number | null;
  reviewCount: number | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  mapsUrl: string;
  categories: string[];
  dealPotential: number; // 0–100, higher = better pitch opportunity
};

function formatCategories(types: string[]): string[] {
  return types
    .filter((t) => !EXCLUDE_TYPES.has(t))
    .slice(0, 4)
    .map((t) => t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
}

function computeDealPotential(
  rating: number | null,
  reviewCount: number | null,
  hasWebsite: boolean
): number {
  let score = 25; // base
  // No website = biggest GCS service opportunity
  if (!hasWebsite) score += 35;
  // Low rating = reputation management opportunity
  if (rating !== null) {
    if (rating < 3.5) score += 25;
    else if (rating < 4.0) score += 15;
    else if (rating < 4.3) score += 8;
  }
  // Few reviews = local SEO + GBP management opportunity
  if (reviewCount !== null) {
    if (reviewCount < 10) score += 20;
    else if (reviewCount < 30) score += 12;
    else if (reviewCount < 100) score += 5;
  }
  return Math.min(score, 100);
}

async function getPlaceDetails(placeId: string, apiKey: string): Promise<{ phone: string | null; website: string | null }> {
  try {
    const params = new URLSearchParams({
      place_id: placeId,
      fields: "formatted_phone_number,website",
      key: apiKey,
    });
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${PLACES_BASE}/details/json?${params}`, { signal: controller.signal });
    const data = await res.json() as {
      status: string;
      result?: { formatted_phone_number?: string; website?: string };
    };
    if (data.status !== "OK" || !data.result) return { phone: null, website: null };
    return {
      phone: data.result.formatted_phone_number ?? null,
      website: data.result.website ?? null,
    };
  } catch {
    return { phone: null, website: null };
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !isGCSStaff(session.user.role ?? "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { query, location } = await req.json() as { query: string; location: string };
    if (!query?.trim() || !location?.trim()) {
      return NextResponse.json({ error: "query and location are required" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Google Places API key not configured" }, { status: 500 });
    }

    // Step 1: Text Search
    const textParams = new URLSearchParams({
      query: `${query.trim()} in ${location.trim()}`,
      key: apiKey,
    });
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 10000);
    const textRes = await fetch(`${PLACES_BASE}/textsearch/json?${textParams}`, { signal: controller.signal });
    const textData = await textRes.json() as {
      status: string;
      results?: {
        place_id: string;
        name: string;
        rating?: number;
        user_ratings_total?: number;
        formatted_address?: string;
        types?: string[];
      }[];
    };

    if (textData.status !== "OK" && textData.status !== "ZERO_RESULTS") {
      return NextResponse.json({ error: `Places API error: ${textData.status}` }, { status: 502 });
    }

    const places = (textData.results ?? []).slice(0, 20);

    // Step 2: Parallel Place Details for phone + website
    const detailResults = await Promise.allSettled(
      places.map((p) => getPlaceDetails(p.place_id, apiKey))
    );

    const results: LeadResult[] = places.map((place, i) => {
      const detail = detailResults[i].status === "fulfilled" ? detailResults[i].value : { phone: null, website: null };
      return {
        placeId: place.place_id,
        name: place.name,
        rating: place.rating ?? null,
        reviewCount: place.user_ratings_total ?? null,
        address: place.formatted_address ?? null,
        phone: detail.phone,
        website: detail.website,
        mapsUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
        categories: formatCategories(place.types ?? []),
        dealPotential: computeDealPotential(place.rating ?? null, place.user_ratings_total ?? null, !!detail.website),
      };
    });

    // Save search to DB
    await db.leadSearch.create({
      data: {
        query: query.trim(),
        location: location.trim(),
        resultsCount: results.length,
        results: JSON.stringify(results),
        searchedById: session.user.id,
      },
    });

    return NextResponse.json({ results, total: results.length });
  } catch (err) {
    console.error("[lead-finder]", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

// GET — fetch past searches
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !isGCSStaff(session.user.role ?? "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const searches = await db.leadSearch.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true, query: true, location: true, resultsCount: true, createdAt: true,
      },
    });

    return NextResponse.json(searches);
  } catch {
    return NextResponse.json({ error: "Failed to fetch searches" }, { status: 500 });
  }
}
