"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTaskAction } from "@/app/(app)/tasks/actions";

export function AddTaskForm({
  orderId,
  customerId,
  requestId,
  repairTicketId,
}: {
  orderId?: string;
  customerId?: string;
  requestId?: string;
  repairTicketId?: string;
}) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    await createTaskAction({
      title,
      dueDate: dueDate || undefined,
      priority: "normal",
      orderId,
      customerId,
      requestId,
      repairTicketId,
    });
    setTitle("");
    setDueDate("");
    setSubmitting(false);
    inputRef.current?.focus();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a task…"
        className="h-8"
      />
      <Input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className="h-8 w-36"
      />
      <Button type="submit" size="sm" disabled={submitting || !title.trim()}>
        <Plus className="size-4" />
        Add
      </Button>
    </form>
  );
}
