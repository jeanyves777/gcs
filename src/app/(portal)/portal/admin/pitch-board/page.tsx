import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { PitchBoardClient } from "./pitch-board-client";

export const metadata = { title: "AI Pitch Board — GCS Admin" };

export default async function PitchBoardPage() {
  await requireRole(["ADMIN", "STAFF"]);

  const pitches = await db.pitch.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true, email: true } } },
  });

  return <PitchBoardClient pitches={pitches} />;
}
