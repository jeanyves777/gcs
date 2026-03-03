import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { PitchBoardTabs } from "./pitch-board-tabs";

export const metadata = { title: "AI Pitch Board — GCS Admin" };

export default async function PitchBoardPage() {
  await requireRole(["ADMIN", "STAFF"]);

  const [pitches, leadSearches] = await Promise.all([
    db.pitch.findMany({
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { name: true, email: true } } },
    }),
    db.leadSearch.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, query: true, location: true, resultsCount: true, createdAt: true },
    }),
  ]);

  const pitchedUrls = pitches.map((p) => p.websiteUrl.toLowerCase());

  return (
    <PitchBoardTabs
      pitches={pitches}
      leadSearches={leadSearches}
      pitchedUrls={pitchedUrls}
    />
  );
}
