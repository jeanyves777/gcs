import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { EditProjectClient } from "./edit-project-client";

export const metadata: Metadata = { title: "Admin — Edit Project" };

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["ADMIN", "STAFF"]);

  const { id } = await params;

  const [project, orgs, users] = await Promise.all([
    db.project.findFirst({
      where: { id, deletedAt: null },
      include: {
        tasks: {
          where: { deletedAt: null },
          include: { assignee: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" },
        },
        organization: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
      },
    }),
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

  if (!project) notFound();

  return <EditProjectClient project={project} orgs={orgs} users={users} />;
}
