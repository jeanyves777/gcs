import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { NewProjectForm } from "./project-form";

export const metadata: Metadata = { title: "Admin — New Project" };

export default async function NewProjectPage() {
  await requireRole(["ADMIN", "STAFF"]);

  const [orgs, users] = await Promise.all([
    db.organization.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return <NewProjectForm orgs={orgs} users={users} />;
}
