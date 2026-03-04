import { NextResponse } from "next/server";

const PLACES_BASE = "https://maps.googleapis.com/maps/api/place";
const BUSINESS_NAME = "General Computing Solutions";
const WEBSITE_DOMAIN = "itatgcs.com";

export async function GET() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  try {
    // Step 1: Find Place
    const findParams = new URLSearchParams({
      input: `${BUSINESS_NAME} ${WEBSITE_DOMAIN}`,
      inputtype: "textquery",
      fields: "place_id",
      key: apiKey,
    });

    const findRes = await fetch(`${PLACES_BASE}/findplacefromtext/json?${findParams}`, {
      next: { revalidate: 3600 },
    });
    const findData = (await findRes.json()) as {
      status: string;
      candidates?: { place_id: string }[];
    };

    if (findData.status !== "OK" || !findData.candidates?.length) {
      return NextResponse.json({ reviews: [], rating: null, reviewCount: null });
    }

    const placeId = findData.candidates[0].place_id;

    // Step 2: Place Details with reviews
    const detailParams = new URLSearchParams({
      place_id: placeId,
      fields: "name,rating,user_ratings_total,reviews,url",
      reviews_sort: "newest",
      key: apiKey,
    });

    const detailRes = await fetch(`${PLACES_BASE}/details/json?${detailParams}`, {
      next: { revalidate: 3600 },
    });
    const detailData = (await detailRes.json()) as {
      status: string;
      result?: {
        name?: string;
        rating?: number;
        user_ratings_total?: number;
        url?: string;
        reviews?: {
          author_name: string;
          rating: number;
          text: string;
          relative_time_description: string;
          profile_photo_url?: string;
          time: number;
        }[];
      };
    };

    if (detailData.status !== "OK" || !detailData.result) {
      return NextResponse.json({ reviews: [], rating: null, reviewCount: null });
    }

    const r = detailData.result;

    const reviews = (r.reviews ?? []).map((rev) => ({
      authorName: rev.author_name,
      rating: rev.rating,
      text: rev.text,
      relativeTime: rev.relative_time_description,
      profilePhoto: rev.profile_photo_url ?? null,
      timestamp: rev.time,
    }));

    return NextResponse.json(
      {
        rating: r.rating ?? null,
        reviewCount: r.user_ratings_total ?? null,
        googleMapsUrl: r.url ?? null,
        reviews,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
        },
      }
    );
  } catch {
    return NextResponse.json({ reviews: [], rating: null, reviewCount: null }, { status: 500 });
  }
}
