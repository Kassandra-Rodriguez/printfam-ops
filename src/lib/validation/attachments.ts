import { z } from "zod";

/** Allow-listed per docs/security.md #5 — validated again server-side, never trusting the client alone. */
export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
] as const;

export const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

/**
 * Exactly one of orderId/repairTicketId identifies what the file is attached
 * to, mirroring the DB's own attachments check constraint (at least one
 * relation column non-null) — enforced here at the app layer since more than
 * one entity type shares this one recording path.
 */
export const recordAttachmentSchema = z
  .object({
    orderId: z.string().uuid().optional(),
    repairTicketId: z.string().uuid().optional(),
    fileName: z.string().trim().min(1),
    fileType: z.enum(ALLOWED_ATTACHMENT_MIME_TYPES),
    storagePath: z.string().trim().min(1),
    description: z.string().trim().optional(),
  })
  .refine((data) => Boolean(data.orderId) !== Boolean(data.repairTicketId), {
    message: "Attachment must belong to exactly one record",
  });

export type RecordAttachmentInput = z.input<typeof recordAttachmentSchema>;
