"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, FileText, Paperclip, RefreshCw, Send, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { ALLOWED_ATTACHMENT_MIME_TYPES, MAX_ATTACHMENT_BYTES } from "@/lib/validation/attachments";
import { uploadProofVersionAction, sendProofAction, recordProofResponseAction } from "@/app/(app)/proofs/actions";
import type { ProofView } from "@/server/domain/proofs/buildProofViews";

const LATEST_STATUS_BADGE: Record<string, { label: string; category: "neutral" | "info" | "warning" | "danger" | "success" }> = {
  draft: { label: "Draft", category: "neutral" },
  sent: { label: "Sent", category: "warning" },
  approved: { label: "Approved", category: "success" },
  revision_requested: { label: "Revision requested", category: "warning" },
};

export function ProofCard({
  proof,
  organizationId,
  orderId,
  repairTicketId,
}: {
  proof: ProofView;
  organizationId: string;
  orderId?: string;
  repairTicketId?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [link, setLink] = useState<string | null>(null);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const parent = { orderId, repairTicketId };
  const latest = proof.versions[0] as (typeof proof.versions)[number] | undefined;
  const badge = LATEST_STATUS_BADGE[proof.latestStatus] ?? LATEST_STATUS_BADGE.draft;
  const awaitingResponse = latest && !latest.latestResponse && proof.latestStatus === "sent";

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

    const result = await uploadProofVersionAction(
      {
        proofId: proof.id,
        customerMessage: message.trim() || undefined,
        fileName: file.name,
        fileType: file.type as (typeof ALLOWED_ATTACHMENT_MIME_TYPES)[number],
        storagePath: path,
      },
      parent,
    );
    setUploading(false);
    setMessage("");

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  function handleSend(forceReissue = false) {
    startTransition(async () => {
      const result = await sendProofAction(proof.id, parent, forceReissue);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.portalPath) {
        setLink(`${window.location.origin}${result.portalPath}`);
      } else {
        toast.success("Customer's existing link is still active — nothing new to send.");
      }
      router.refresh();
    });
  }

  function respond(response: "approved" | "revision_requested") {
    if (!latest) return;
    startTransition(async () => {
      const result = await recordProofResponseAction(
        latest.id,
        response,
        response === "revision_requested" ? reason : undefined,
        parent,
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDeclining(false);
      setReason("");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          {proof.title}
          <StatusBadge label={badge.label} category={badge.category} />
        </CardTitle>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {proof.approvalRequired ? <span>Gates production</span> : null}
          <span>·</span>
          <span>{proof.visibility === "customer_visible" ? "Customer visible" : "Internal only"}</span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {proof.versions.length === 0 ? (
          <p className="text-muted-foreground">No versions uploaded yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {proof.versions.map((v) => (
              <div key={v.id} className="rounded-md border p-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium">V{v.versionNumber}</span>
                  <span className="text-xs text-muted-foreground">
                    {v.sentAt ? `Sent ${formatDateTime(v.sentAt)}` : "Not sent"}
                  </span>
                </div>
                {v.signedUrl ? (
                  <a
                    href={v.signedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground hover:underline"
                  >
                    {v.fileName?.endsWith(".pdf") ? (
                      <FileText className="size-3.5" />
                    ) : (
                      <Paperclip className="size-3.5" />
                    )}
                    {v.fileName}
                  </a>
                ) : null}
                {v.customerMessage ? <p className="mt-1 whitespace-pre-wrap">{v.customerMessage}</p> : null}
                {v.latestResponse ? (
                  <p
                    className={
                      v.latestResponse.response === "approved"
                        ? "mt-1.5 text-xs text-emerald-700 dark:text-emerald-400"
                        : "mt-1.5 text-xs text-amber-700 dark:text-amber-400"
                    }
                  >
                    {v.latestResponse.response === "approved" ? "Approved" : "Revision requested"}{" "}
                    {formatDateTime(v.latestResponse.respondedAt)}
                    {v.latestResponse.respondedVia === "portal" ? " (via portal)" : ""}
                    {v.latestResponse.revisionComment ? `: "${v.latestResponse.revisionComment}"` : ""}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}

        {awaitingResponse ? (
          declining ? (
            <div className="flex flex-col gap-2">
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Revision comment (required)"
                rows={2}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending || !reason.trim()}
                  onClick={() => respond("revision_requested")}
                >
                  Confirm revision request
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDeclining(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" disabled={isPending} onClick={() => respond("approved")}>
                <Check className="size-4" />
                Record approval
              </Button>
              <Button size="sm" variant="outline" disabled={isPending} onClick={() => setDeclining(true)}>
                Record revision request
              </Button>
            </div>
          )
        ) : null}

        <div className="flex flex-col gap-2 border-t pt-3">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message to customer (optional)"
            className="h-8 text-xs"
          />
          <div className="flex items-center gap-2">
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
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="size-4" />
              {uploading ? "Uploading…" : "Upload new version"}
            </Button>
            {proof.visibility === "customer_visible" && proof.versions.length > 0 ? (
              link ? (
                <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-2 py-1 text-xs">
                  <span className="max-w-48 truncate">{link}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      navigator.clipboard.writeText(link);
                      toast.success("Link copied");
                    }}
                  >
                    Copy
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button type="button" size="sm" disabled={isPending} onClick={() => handleSend(false)}>
                    <Send className="size-4" />
                    Send to customer
                  </Button>
                  {latest?.sentAt ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() => handleSend(true)}
                      title="Generate a fresh link to copy — replaces the previous one"
                    >
                      <RefreshCw className="size-3.5" />
                      Copy link again
                    </Button>
                  ) : null}
                </div>
              )
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
