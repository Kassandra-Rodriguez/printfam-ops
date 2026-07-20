import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { recordAttachmentSchema, type RecordAttachmentInput } from "@/lib/validation/attachments";
import { insertAttachment } from "@/server/data/attachments";

export async function recordOrderAttachment(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: RecordAttachmentInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = recordAttachmentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid file" };
  }

  try {
    await insertAttachment(supabase, organizationId, userId, parsed.data);
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not save the file. Try again." };
  }
}
