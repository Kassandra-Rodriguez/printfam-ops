import type { LucideIcon } from "lucide-react";

/**
 * The one empty-state pattern used everywhere in the product, per
 * docs/design_system.md #7/#14 — small monochrome icon, one sentence, one
 * named action. Never a decorative illustration or a marketing moment.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <Icon className="size-8 text-muted-foreground" strokeWidth={1.5} />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}
