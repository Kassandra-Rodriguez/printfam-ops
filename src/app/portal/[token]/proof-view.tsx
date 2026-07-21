"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import type { ProofView } from "@/server/domain/proofs/buildProofViews";

export function ProofPortalView({ token, proof }: { token: string; proof: ProofView }) {
  const [isPending, startTransition] = useTransition();
  const [requestingRevision, setRequestingRevision] = useState(false);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const latest = proof.versions[0];

  function respond(response: "approved" | "revision_requested") {
    if (!latest) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/portal/${token}/proof-response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proofVersionId: latest.id,
          response,
          revisionComment: response === "revision_requested" ? comment : undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Something went wrong. Try again.");
        return;
      }
      router.refresh();
    });
  }

  if (!latest) {
    return (
      <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
        Nothing has been sent yet — check back soon.
      </div>
    );
  }

  const canRespond = !latest.latestResponse;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {proof.title} — V{latest.versionNumber}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          {latest.signedUrl ? (
            latest.fileName?.match(/\.(png|jpe?g|webp|gif)$/i) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={latest.signedUrl} alt={proof.title} className="w-full rounded-md border" />
            ) : (
              <a href={latest.signedUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                View file
              </a>
            )
          ) : null}
          {latest.customerMessage ? <p className="whitespace-pre-wrap">{latest.customerMessage}</p> : null}

          {proof.versions.length > 1 ? (
            <div className="border-t pt-3">
              <p className="mb-1.5 text-xs text-muted-foreground">Earlier versions</p>
              <div className="flex flex-col gap-1.5">
                {proof.versions.slice(1).map((v) => (
                  <div key={v.id} className="text-xs text-muted-foreground">
                    V{v.versionNumber}
                    {v.latestResponse
                      ? ` — ${v.latestResponse.response === "approved" ? "approved" : "revision requested"}`
                      : ""}
                    {v.latestResponse?.revisionComment ? `: "${v.latestResponse.revisionComment}"` : ""}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {latest.latestResponse ? (
        <p className="text-center text-sm text-muted-foreground">
          You {latest.latestResponse.response === "approved" ? "approved" : "requested a revision on"} this version{" "}
          {formatDateTime(latest.latestResponse.respondedAt)}.
        </p>
      ) : canRespond ? (
        requestingRevision ? (
          <div className="flex flex-col gap-2">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What would you like changed? (required)"
              rows={3}
            />
            <div className="flex gap-2">
              <Button disabled={isPending || !comment.trim()} onClick={() => respond("revision_requested")}>
                Send revision request
              </Button>
              <Button variant="ghost" onClick={() => setRequestingRevision(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button disabled={isPending} onClick={() => respond("approved")} className="flex-1">
              Approve
            </Button>
            <Button
              disabled={isPending}
              variant="outline"
              onClick={() => setRequestingRevision(true)}
              className="flex-1"
            >
              Request revision
            </Button>
          </div>
        )
      ) : null}
      {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
