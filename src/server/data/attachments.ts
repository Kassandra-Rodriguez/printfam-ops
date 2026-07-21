import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AttachmentRow = {
  id: string;
  file_name: string;
  file_type: string;
  storage_path: string;
  visibility: string;
  created_at: string;
};

export async function listAttachmentsForOrder(
  supabase: SupabaseClient,
  organizationId: string,
  orderId: string,
): Promise<AttachmentRow[]> {
  const { data, error } = await supabase
    .from("attachments")
    .select("id, file_name, file_type, storage_path, visibility, created_at")
    .eq("organization_id", organizationId)
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function listAttachmentsForRepairTicket(
  supabase: SupabaseClient,
  organizationId: string,
  repairTicketId: string,
): Promise<(AttachmentRow & { description: string | null })[]> {
  const { data, error } = await supabase
    .from("attachments")
    .select("id, file_name, file_type, storage_path, visibility, description, created_at")
    .eq("organization_id", organizationId)
    .eq("repair_ticket_id", repairTicketId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function listAttachmentsForQuote(
  supabase: SupabaseClient,
  organizationId: string,
  quoteId: string,
): Promise<AttachmentRow[]> {
  const { data, error } = await supabase
    .from("attachments")
    .select("id, file_name, file_type, storage_path, visibility, created_at")
    .eq("organization_id", organizationId)
    .eq("quote_id", quoteId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/** Bucket is private (supabase/migrations/0018_storage.sql) — every view goes through a short-lived signed URL, never a public path. */
export async function getAttachmentSignedUrl(
  supabase: SupabaseClient,
  storagePath: string,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("attachments")
    .createSignedUrl(storagePath, 60 * 5);
  if (error) return null;
  return data.signedUrl;
}

export async function insertAttachment(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: {
    orderId?: string;
    repairTicketId?: string;
    quoteId?: string;
    fileName: string;
    fileType: string;
    storagePath: string;
    description?: string;
  },
) {
  const { error } = await supabase.from("attachments").insert({
    organization_id: organizationId,
    order_id: input.orderId ?? null,
    repair_ticket_id: input.repairTicketId ?? null,
    quote_id: input.quoteId ?? null,
    file_name: input.fileName,
    file_type: input.fileType,
    storage_path: input.storagePath,
    description: input.description ?? null,
    visibility: "internal_only",
    uploaded_by: userId,
  });
  if (error) throw error;
}
