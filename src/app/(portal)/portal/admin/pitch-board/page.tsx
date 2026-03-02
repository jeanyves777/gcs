import { requireRole } from "@/lib/auth-utils";
import { PitchBoardClient } from "./pitch-board-client";

export const metadata = { title: "AI Pitch Board — GCS Admin" };

export default async function PitchBoardPage() {
  await requireRole(["ADMIN", "STAFF"]);
  return <PitchBoardClient />;
}
