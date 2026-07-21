import { z } from "zod";
import { ALLOWED_ATTACHMENT_MIME_TYPES } from "./attachments";

/** docs/screens.md #15 — one of order/repair, mirroring the proofs_target_chk DB constraint. */
export const createProofSchema = z
  .object({
    orderId: z.string().uuid().optional(),
    repairTicketId: z.string().uuid().optional(),
    title: z.string().trim().min(1, "Title is required"),
    approvalRequired: z.boolean().default(true),
    visibility: z.enum(["internal_only", "customer_visible"]).default("internal_only"),
  })
  .refine((data) => Boolean(data.orderId) !== Boolean(data.repairTicketId), {
    message: "Proof must belong to exactly one record",
  });

export type CreateProofInput = z.input<typeof createProofSchema>;

/** docs/user_flows.md Flow F step 1 — the file is already uploaded to Storage client-side by the time this runs, same pattern as recordAttachmentSchema. */
export const uploadProofVersionSchema = z.object({
  proofId: z.string().uuid(),
  customerMessage: z.string().trim().optional(),
  fileName: z.string().trim().min(1),
  fileType: z.enum(ALLOWED_ATTACHMENT_MIME_TYPES),
  storagePath: z.string().trim().min(1),
});

export type UploadProofVersionInput = z.input<typeof uploadProofVersionSchema>;

/** docs/user_flows.md Flow F step 3 — revision comment required, not optional, when requesting a revision. */
export const recordProofResponseSchema = z
  .object({
    proofVersionId: z.string().uuid(),
    response: z.enum(["approved", "revision_requested"]),
    revisionComment: z.string().trim().optional(),
  })
  .refine((data) => data.response !== "revision_requested" || Boolean(data.revisionComment), {
    message: "A revision comment is required",
    path: ["revisionComment"],
  });

export type RecordProofResponseInput = z.input<typeof recordProofResponseSchema>;
