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

export const recordAttachmentSchema = z.object({
  orderId: z.string().uuid(),
  fileName: z.string().trim().min(1),
  fileType: z.enum(ALLOWED_ATTACHMENT_MIME_TYPES),
  storagePath: z.string().trim().min(1),
});

export type RecordAttachmentInput = z.input<typeof recordAttachmentSchema>;
