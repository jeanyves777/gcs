import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { ProjectChatClient } from "./chat-client";

export const metadata: Metadata = { title: "Project Chat" };

export default async function ProjectChatPage({ params }: { params: { id: string } }) {
  const user = await requireAuth();
  const project = await db.project.findFirst({
    where: { id: params.id, organization: { users: { some: { id: user.id } } }, deletedAt: null },
  });
  if (!project) notFound();

  const messages = await db.message.findMany({
    where: { projectId: params.id, deletedAt: null, parentId: null },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { id: true, name: true, role: true } } },
    take: 50,
  });

  return (
    <ProjectChatClient
      projectId={params.id}
      projectName={project.name}
      currentUserId={user.id}
      initialMessages={messages}
    />
  );
}
