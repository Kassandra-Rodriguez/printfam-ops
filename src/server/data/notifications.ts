import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type NotificationRow = {
  id: string;
  type: string;
  entity_type: string | null;
  entity_id: string | null;
  message: string;
  read_at: string | null;
  created_at: string;
};

export async function listNotificationsForCurrentUser(
  supabase: SupabaseClient,
  limit = 50,
): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, entity_type, entity_id, message, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function countUnreadNotifications(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationRead(supabase: SupabaseClient, notificationId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId);
  if (error) throw error;
}

export async function markAllNotificationsRead(supabase: SupabaseClient) {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) throw error;
}

/**
 * docs/product_requirements.md §7.14's event list, fanned out to every
 * active member of the org — v1 has no per-user event routing/preferences
 * (docs/user_roles.md #5-adjacent scope trim), so "notify everyone who
 * works here" is the whole rule. `notifications_insert`'s RLS policy only
 * requires the caller be an org member, not the row's own user_id, so a
 * staff member's session can write a teammate's notification row.
 */
export async function notifyOrgMembers(
  supabase: SupabaseClient,
  organizationId: string,
  input: { type: string; entityType?: string; entityId?: string; message: string },
): Promise<void> {
  const { data: members, error: membersError } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("status", "active");
  if (membersError) throw membersError;
  if (!members || members.length === 0) return;

  const { error: insertError } = await supabase.from("notifications").insert(
    members.map((m) => ({
      organization_id: organizationId,
      user_id: m.user_id,
      type: input.type,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      message: input.message,
    })),
  );
  if (insertError) throw insertError;
}
