"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WorkflowStatus } from "@/server/data/workflow";
import { changeRequestStatusAction } from "../actions";

export function RequestStatusControl({
  requestId,
  currentStatusId,
  statuses,
}: {
  requestId: string;
  currentStatusId: string;
  statuses: WorkflowStatus[];
}) {
  const [value, setValue] = useState(currentStatusId);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleChange(statusId: string) {
    setValue(statusId);
    startTransition(async () => {
      const result = await changeRequestStatusAction(requestId, statusId);
      if (!result.ok) {
        toast.error(result.error);
        setValue(currentStatusId);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Select value={value} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="w-56">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {statuses.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
