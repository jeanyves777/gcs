import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Paperclip } from "lucide-react";

export const metadata: Metadata = { title: "Files" };

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default async function FilesPage({ params }: { params: { id: string } }) {
  const user = await requireAuth();
  const project = await db.project.findFirst({ where: { id: params.id, organization: { users: { some: { id: user.id } } }, deletedAt: null } });
  if (!project) notFound();

  const files = await db.file.findMany({
    where: { projectId: params.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: { uploader: { select: { name: true } } },
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Files — {project.name}</h2>
      {files.length === 0 ? (
        <div className="text-center py-16">
          <Paperclip className="h-10 w-10 mx-auto mb-3 opacity-30" style={{ color: "var(--text-muted)" }} />
          <p style={{ color: "var(--text-muted)" }}>No files uploaded yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((f) => (
            <Card key={f.id} className="card-base">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "var(--bg-tertiary)" }}>
                  <Paperclip className="h-4 w-4" style={{ color: "var(--brand-primary)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{f.name}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{formatBytes(f.size)} · {f.uploader.name}</p>
                </div>
                <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium hover:underline" style={{ color: "var(--brand-primary)" }}>Download</a>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
