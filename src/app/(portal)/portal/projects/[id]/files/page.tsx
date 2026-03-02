import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { FilesClient } from "./files-client";

export const metadata: Metadata = { title: "Files" };

export default async function FilesPage({ params }: { params: { id: string } }) {
  const user = await requireAuth();
  const project = await db.project.findFirst({
    where: { id: params.id, organization: { users: { some: { id: user.id } } }, deletedAt: null },
  });
  if (!project) notFound();

  const files = await db.file.findMany({
    where: { projectId: params.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: { uploader: { select: { name: true } } },
  });

  return <FilesClient projectId={params.id} projectName={project.name} initialFiles={files} />;
}
