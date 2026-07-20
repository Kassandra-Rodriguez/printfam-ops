import { Construction } from "lucide-react";
import { EmptyState } from "./empty-state";

/**
 * An honest "not built yet" page for nav items that route somewhere real
 * instead of a dead link, without pretending the feature works — the
 * distinction the coding standards draw between an unfinished screen and a
 * "placeholder action that does nothing" (docs/build_phases.md).
 */
export function PhasePlaceholder({ title, phase }: { title: string; phase: number }) {
  return (
    <div className="p-6">
      <h1 className="mb-2 text-lg font-semibold">{title}</h1>
      <EmptyState
        icon={Construction}
        title={`${title} ships in Phase ${phase}`}
        description={`See docs/build_phases.md for what Phase ${phase} includes and why it's sequenced there.`}
      />
    </div>
  );
}
