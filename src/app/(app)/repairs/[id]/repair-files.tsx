"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Paperclip, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { ALLOWED_ATTACHMENT_MIME_TYPES, MAX_ATTACHMENT_BYTES } from "@/lib/validation/attachments";
import { recordRepairAttachmentAction } from "../actions";

export type RepairFileRow = {
  id: string;
  file_name: string;
  file_type: string;
  description: string | null;
  created_at: string;
  signedUrl: string | null;
};

export function RepairFiles({
  repairTicketId,
  organizationId,
  files,
}: {
  repairTicketId: string;
  organizationId: string;
  files: RepairFileRow[];
}) {
  const [uploading, setUploading] = useState(false);
  const [label, setLabel] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ALLOWED_ATTACHMENT_MIME_TYPES.includes(file.type as (typeof ALLOWED_ATTACHMENT_MIME_TYPES)[number])) {
      toast.error("That file type isn't supported. Use an image or PDF.");
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.error("File is too large (15MB max).");
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const path = `${organizationId}/${crypto.randomUUID()}-${file.name}`;

    const { error: uploadError } = await supabase.storage.from("attachments").upload(path, file);
    if (uploadError) {
      toast.error("Upload failed. Try again.");
      setUploading(false);
      return;
    }

    const result = await recordRepairAttachmentAction({
      repairTicketId,
      fileName: file.name,
      fileType: file.type as (typeof ALLOWED_ATTACHMENT_MIME_TYPES)[number],
      storagePath: path,
      description: label.trim() || undefined,
    });
    setUploading(false);
    setLabel("");

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
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
              <span className="truncate">{f.description ? `${f.description} — ` : ""}{f.file_name}</span>
            </a>
          ))}
        </div>
      )}

      <Input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Label (e.g. Before, After) — optional"
        className="h-8 text-xs"
      />
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
        {uploading ? "Uploading…" : "Upload photo/file"}
      </Button>
    </div>
  );
}
