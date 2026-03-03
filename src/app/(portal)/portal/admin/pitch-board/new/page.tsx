import { Suspense } from "react";
import { requireRole } from "@/lib/auth-utils";
import { NewPitchClient } from "./new-pitch-client";

export const metadata = { title: "Build New Pitch — GCS Admin" };

export default async function NewPitchPage() {
  await requireRole(["ADMIN", "STAFF"]);
  return (
    <Suspense fallback={null}>
      <NewPitchClient />
    </Suspense>
  );
}
