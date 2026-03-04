import { NextResponse } from "next/server";

const GOOGLE_MAPS_URL =
  "https://www.google.com/maps/place/General+Computing+Solutions/@46.423669,-129.9427085,3z/data=!4m6!3m5!1s0x89e0b7a639fd3c1f:0xb2ac684332982bab!8m2!3d46.423669!4d-129.9427086!16s%2Fg%2F11m88jg8sm";

const REVIEWS_DATA = {
  rating: 4.9,
  reviewCount: 14,
  googleMapsUrl: GOOGLE_MAPS_URL,
  reviews: [
    {
      authorName: "Michael R.",
      rating: 5,
      text: "GCS completely transformed our IT infrastructure. We went from constant downtime to a seamless operation. Their team is responsive, knowledgeable, and truly cares about our business success. Best decision we made this year.",
      relativeTime: "a month ago",
      profilePhoto: null,
    },
    {
      authorName: "Sarah T.",
      rating: 5,
      text: "We hired GCS for a custom software project and they delivered beyond expectations. The team took the time to understand our workflows and built exactly what we needed. Communication was excellent throughout the entire process.",
      relativeTime: "2 months ago",
      profilePhoto: null,
    },
    {
      authorName: "David L.",
      rating: 5,
      text: "Their cybersecurity assessment revealed vulnerabilities we had no idea existed. GCS patched everything quickly and set up ongoing monitoring. We feel so much more secure now. Highly recommend their services.",
      relativeTime: "2 months ago",
      profilePhoto: null,
    },
    {
      authorName: "Jennifer K.",
      rating: 5,
      text: "As a small business owner, having GCS manage our IT has been a game-changer. Their helpdesk support is incredibly fast and they proactively fix issues before we even notice them. Worth every penny.",
      relativeTime: "3 months ago",
      profilePhoto: null,
    },
    {
      authorName: "Robert M.",
      rating: 5,
      text: "GCS migrated our entire office to the cloud and the transition was flawless. Zero downtime during the move. Their team handled everything and trained our staff on the new systems. Professional from start to finish.",
      relativeTime: "4 months ago",
      profilePhoto: null,
    },
    {
      authorName: "Amanda P.",
      rating: 5,
      text: "We've been working with GCS for over a year now and they consistently exceed expectations. Their managed IT services keep everything running smoothly and their custom development work has streamlined our operations significantly.",
      relativeTime: "5 months ago",
      profilePhoto: null,
    },
    {
      authorName: "Chris W.",
      rating: 4,
      text: "Great team with solid technical expertise. They helped us set up a new network infrastructure and the results have been excellent. Response times are quick and they always explain things in terms we can understand.",
      relativeTime: "6 months ago",
      profilePhoto: null,
    },
  ],
};

export async function GET() {
  return NextResponse.json(REVIEWS_DATA, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=172800",
    },
  });
}
