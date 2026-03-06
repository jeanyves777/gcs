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

  const stats = {
    total: projects.length,
    active: projects.filter((p) => p.status === "ACTIVE").length,
    planning: projects.filter((p) => p.status === "PLANNING").length,
    onHold: projects.filter((p) => p.status === "ON_HOLD").length,
    completed: projects.filter((p) => p.status === "COMPLETED").length,
    totalTasks: projects.reduce((s, p) => s + p._count.tasks, 0),
  };

  return <AdminProjectsClient projects={projects} stats={stats} />;
}
