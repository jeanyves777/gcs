import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { AdminProjectsClient } from "./admin-projects-client";

export const metadata: Metadata = { title: "Admin — Projects" };

export default async function AdminProjectsPage() {
  await requireRole(["ADMIN", "STAFF"]);

  const projects = await db.project.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      organization: { select: { name: true } },
      owner: { select: { name: true } },
      _count: { select: { tasks: true } },
    },
  });

  return <AdminProjectsClient projects={projects} />;
}
