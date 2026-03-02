import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { AdminProjectViewClient } from "./admin-project-view-client";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await db.project.findUnique({ where: { id }, select: { name: true } });
  return { title: project?.name ?? "Project" };
}

export default async function AdminProjectViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRole(["ADMIN", "STAFF"]);

  const project = await db.project.findFirst({
    where: { id, deletedAt: null },
    include: {
      organization: { select: { name: true } },
      owner: { select: { name: true } },
      tasks: {
        orderBy: { order: "asc" },
        include: { assignee: { select: { name: true } } },
      },
      milestones: { orderBy: { order: "asc" } },
    },
  });

  if (!project) notFound();

  return (
    <AdminProjectViewClient
      project={{
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        progress: project.progress,
        startDate: project.startDate,
        targetDate: project.targetDate,
        createdAt: project.createdAt,
        organization: project.organization,
        owner: project.owner,
        tasks: project.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          assignee: t.assignee,
        })),
        milestones: project.milestones.map((m) => ({
          id: m.id,
          title: m.title,
          status: m.status,
          dueDate: m.dueDate,
          completedAt: m.completedAt,
        })),
      }}
    />
  );
}
