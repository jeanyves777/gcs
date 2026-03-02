import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { PitchViewClient } from "./pitch-view-client";

export const metadata = { title: "Pitch Intelligence — GCS Admin" };

export default async function PitchViewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["ADMIN", "STAFF"]);
  const { id } = await params;

  const pitch = await db.pitch.findUnique({
    where: { id },
    include: { createdBy: { select: { name: true, email: true } } },
  });

  if (!pitch) notFound();

  return <PitchViewClient pitch={pitch} />;
}
