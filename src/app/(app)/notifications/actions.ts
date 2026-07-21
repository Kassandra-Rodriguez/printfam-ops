"use server";

import { revalidatePath } from "next/cache";
import { requireOrgContext } from "@/server/authz/session";
import { markNotificationRead, markAllNotificationsRead } from "@/server/data/notifications";

export async function markNotificationReadAction(notificationId: string) {
  const ctx = await requireOrgContext();
  await markNotificationRead(ctx.supabase, notificationId);
  revalidatePath("/", "layout");
}

export async function markAllNotificationsReadAction() {
  const ctx = await requireOrgContext();
  await markAllNotificationsRead(ctx.supabase);
  revalidatePath("/", "layout");
}
