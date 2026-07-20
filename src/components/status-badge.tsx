import { cn } from "@/lib/utils";
import type { StatusCategory } from "@/server/data/workflow";

/**
 * The 5-token semantic status system from docs/design_system.md #2 — applied
 * only as a tinted pill background + matching text, never a full-row fill.
 * One mapping, reused everywhere a status renders (table rows, board cards,
 * detail-page steppers) so the same category always reads the same color.
 */
const CATEGORY_CLASSES: Record<StatusCategory, string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  danger: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
};

export function StatusBadge({
  label,
  category,
  className,
}: {
  label: string;
  category: StatusCategory;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        CATEGORY_CLASSES[category],
        className,
      )}
    >
      {label}
    </span>
  );
}
