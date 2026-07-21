"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateTime } from "@/lib/format";
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/app/(app)/notifications/actions";
import type { NotificationRow } from "@/server/data/notifications";

const ENTITY_PATH: Record<string, string> = {
  request: "/requests",
  order: "/orders",
  repair_ticket: "/repairs",
  quote: "/quotes",
};

/** docs/screens.md #25: chronological list, unread indicator, click-through to record. */
export function NotificationsBell({ notifications, unreadCount }: { notifications: NotificationRow[]; unreadCount: number }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleOpen(notification: NotificationRow) {
    if (notification.read_at) return;
    startTransition(async () => {
      await markNotificationReadAction(notification.id);
      router.refresh();
    });
  }

  function markAll() {
    startTransition(async () => {
      await markAllNotificationsReadAction();
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="size-5" />
          {unreadCount > 0 ? (
            <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          Notifications
          {unreadCount > 0 ? (
            <button type="button" className="text-xs font-normal text-muted-foreground hover:underline" disabled={isPending} onClick={markAll}>
              Mark all read
            </button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">No notifications yet.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((n) => {
              const basePath = n.entity_type ? ENTITY_PATH[n.entity_type] : undefined;
              const href = basePath && n.entity_id ? `${basePath}/${n.entity_id}` : undefined;
              const content = (
                <div className="flex items-start gap-2">
                  {!n.read_at ? <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" /> : <span className="mt-1.5 size-1.5 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate whitespace-normal">{n.message}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(n.created_at)}</p>
                  </div>
                </div>
              );
              return (
                <DropdownMenuItem key={n.id} asChild onClick={() => handleOpen(n)}>
                  {href ? (
                    <Link href={href}>{content}</Link>
                  ) : (
                    <div>{content}</div>
                  )}
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
