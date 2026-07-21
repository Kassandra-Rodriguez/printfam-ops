"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/format";
import { completeTaskAction } from "@/app/(app)/tasks/actions";
import type { TaskRow as TaskRowData } from "@/server/data/tasks";

const PRIORITY_LABEL: Record<string, string> = {
  urgent: "Urgent",
  high: "High",
  normal: "Normal",
  low: "Low",
};

export function TaskRow({ task, showOrderLink = true }: { task: TaskRowData; showOrderLink?: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex items-center gap-3 border-b px-4 py-2.5 text-sm last:border-0">
      <input
        type="checkbox"
        disabled={isPending}
        onChange={() =>
          startTransition(async () => {
            await completeTaskAction(task.id, task.order_id ?? undefined);
            router.refresh();
          })
        }
        className="size-4"
        aria-label={`Mark "${task.title}" complete`}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate">{task.title}</p>
        {showOrderLink && task.order ? (
          <Link href={`/orders/${task.order.id}`} className="text-xs text-muted-foreground hover:underline">
            {task.order.order_number}
          </Link>
        ) : null}
      </div>
      {task.priority !== "normal" ? (
        <span className="text-xs text-muted-foreground">{PRIORITY_LABEL[task.priority]}</span>
      ) : null}
      <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
        {task.due_date ? formatDate(task.due_date) : "No date"}
      </span>
    </div>
  );
}
