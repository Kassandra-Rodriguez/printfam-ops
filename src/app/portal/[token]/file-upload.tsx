"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Paperclip, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ALLOWED_ATTACHMENT_MIME_TYPES, MAX_ATTACHMENT_BYTES } from "@/lib/validation/attachments";

export type PortalFileRow = { id: string; file_name: string; file_type: string; signedUrl: string | null };

export function PortalFileUpload({ token, files }: { token: string; files: PortalFileRow[] }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);

    if (!ALLOWED_ATTACHMENT_MIME_TYPES.includes(file.type as (typeof ALLOWED_ATTACHMENT_MIME_TYPES)[number])) {
      setError("That file type isn't supported. Use an image or PDF.");
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setError("File is too large (15MB max).");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.set("file", file);
    const res = await fetch(`/api/portal/${token}/upload`, { method: "POST", body: formData });
    setUploading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Upload failed. Try again.");
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Files</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {files.length === 0 ? (
          <p className="text-sm text-muted-foreground">No files yet.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {files.map((f) => (
              <a
                key={f.id}
                href={f.signedUrl ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm hover:bg-muted/40"
              >
                {f.file_type === "application/pdf" ? (
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                ) : (
                  <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate">{f.file_name}</span>
              </a>
            ))}
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={ALLOWED_ATTACHMENT_MIME_TYPES.join(",")}
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="size-4" />
          {uploading ? "Uploading…" : "Upload a file"}
        </Button>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
