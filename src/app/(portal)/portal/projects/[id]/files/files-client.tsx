"use client";

import { useRef, useState } from "react";
import { Paperclip, Upload, X, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type ProjectFile = {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  createdAt: Date;
  uploader: { name: string | null };
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

interface Props {
  projectId: string;
  projectName: string;
  initialFiles: ProjectFile[];
}

export function FilesClient({ projectId, projectName, initialFiles }: Props) {
  const [files, setFiles] = useState<ProjectFile[]>(initialFiles);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 20 MB.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`/api/portal/projects/${projectId}/files`, {
      method: "POST",
      body: formData,
    });
    setUploading(false);

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast.error(json.error ?? "Upload failed");
      return;
    }

    const newFile: ProjectFile = await res.json();
    setFiles((prev) => [newFile, ...prev]);
    toast.success(`${file.name} uploaded successfully`);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    upload(e.dataTransfer.files);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
        Files — {projectName}
      </h2>

      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 py-10 cursor-pointer transition-colors"
        style={{
          borderColor: dragOver ? "var(--brand-primary)" : "var(--border)",
          background: dragOver ? "var(--bg-secondary)" : "var(--bg-primary)",
        }}
      >
        {uploading ? (
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--brand-primary)" }} />
        ) : (
          <Upload className="h-8 w-8 opacity-40" style={{ color: "var(--text-muted)" }} />
        )}
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          {uploading ? "Uploading…" : "Drop a file here or click to browse"}
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Max file size: 20 MB</p>
        <input ref={inputRef} type="file" className="hidden" onChange={(e) => upload(e.target.files)} />
      </div>

      {/* File list */}
      {files.length === 0 ? (
        <div className="text-center py-10">
          <Paperclip className="h-10 w-10 mx-auto mb-3 opacity-30" style={{ color: "var(--text-muted)" }} />
          <p style={{ color: "var(--text-muted)" }}>No files uploaded yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((f) => (
            <Card key={f.id} className="card-base">
              <CardContent className="p-4 flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: "var(--bg-tertiary)" }}
                >
                  <Paperclip className="h-4 w-4" style={{ color: "var(--brand-primary)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{f.name}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {formatBytes(f.size)} · {f.uploader.name}
                  </p>
                </div>
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium hover:underline"
                  style={{ color: "var(--brand-primary)" }}
                >
                  Download
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
