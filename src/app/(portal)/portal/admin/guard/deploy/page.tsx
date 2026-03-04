import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { DeployClient } from "./deploy-client";

export const metadata = { title: "Deploy Agent — GcsGuard" };

export default async function DeployPage() {
  await requireRole(["ADMIN", "STAFF"]);

  const organizations = await db.organization.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return <DeployClient organizations={organizations} />;
}
