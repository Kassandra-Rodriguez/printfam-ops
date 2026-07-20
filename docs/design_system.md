# Design System — PrintFam Ops

Grounded in `mobbin_research.md`; every rule below traces back to a pattern selected (or rejected) there. This document defines the reusable visual language, not individual screens (see `screens.md`).

## 1. Principles (from the source brief, made concrete)

1. Attention before decoration — urgency-ranked lists precede any chart, everywhere, always.
2. One meaning per color — status colors are never reused for anything else on the page.
3. Density with breathing room — compact rows, whitespace spent on section breaks, not padding inside every element.
4. No hidden primary actions — the main action on any screen is a visible button, not a menu item.
5. Consistent empty/loading/error states — one pattern each, reused everywhere, never bespoke per screen.

## 2. Color system

### Semantic status colors (5, and only 5)
| Token | Use | Example |
|---|---|---|
| `neutral` (gray) | Draft, new, not yet started | New request, draft quote |
| `info` (blue) | In progress, active work | In production, diagnostic in progress |
| `warning` (amber) | Waiting on someone/something | Waiting for deposit, waiting for parts, proof sent |
| `danger` (red) | Overdue, blocked, cancelled | Overdue pickup, cancelled, declined |
| `success` (green) | Done, paid, approved | Completed, paid, approved |

**Rules**: applied only as (a) a small pill badge with a tinted background + matching text, or (b) a 3px left-border accent on a list row/card. Never as a full-row or full-card background fill (this is the specific pattern rejected in `mobbin_research.md` §"Status color systems"). `workflow_statuses.category` (`data_model.md`) maps 1:1 to these five tokens — a status's color is data-driven, never a per-screen hardcoded class.

### Base palette
- Neutral grays for surfaces/text (a standard Tailwind slate/zinc scale is sufficient — no custom brand-gray system needed for an internal ops tool).
- One brand accent color (PrintFam's own, TBD by the user — placeholder: indigo) used **only** for primary buttons, active nav item, and links. Not used for status meaning, to keep the two color systems from colliding.
- No gradients anywhere in the product UI. (Marketing/portal branding header is the one place an organization's brand color may appear as a solid fill, per the portal-branding requirement — still no gradients.)

## 3. Typography

- Compact scale: body 13-14px, table rows 13px, page titles 18-20px (not oversized — `mobbin_research.md` explicitly notes reference apps use plain, small page titles, no hero headings).
- One weight step for emphasis: regular for supporting text, medium/semibold reserved for the single most important field per row (customer name, amount) — never bold entire rows.
- A single sans-serif system font stack; no display/decorative fonts.

## 4. Layout & spacing

- Sidebar (240px desktop) + content area; sidebar collapses to a bottom tab bar under the mobile breakpoint (`mobbin_research.md` §15).
- 8px spacing scale. Table/list row vertical padding stays tight (8-10px); section-level gaps (between dashboard urgency groups, between form sections) get the larger spacing values — whitespace is spent on structure, not decoration.
- Max content width on detail pages to prevent line-length sprawl on wide monitors; tables are allowed to use full width.

## 5. Component inventory

| Component | Pattern source | Notes |
|---|---|---|
| Data table | `mobbin_research.md` §2 | TanStack Table; sticky header, status-chip filter row, checkbox column for bulk actions |
| Board/Kanban card | §4 | thin card: title, 1-2 metadata chips, small avatar — no cover images |
| Status badge | §1, §2 | pill shape, one of the 5 semantic tokens, label pulled from `workflow_statuses.label` |
| Side panel / drawer | §12 | right-side slide-over, Esc/X to close, prev/next record arrows |
| Detail page two-column layout | §3 | fixed right sidebar (contact/summary), scrolling left main column |
| Timeline/activity feed | §5, §8 | single-column chronological list, internal notes visually distinct (yellow tint) from customer-facing entries |
| Inbox split view | §6 | 3-column: nav / list / thread, right context panel |
| Proof viewer | §7 | dark canvas, version chip selector, comment thread, Approve/Request Changes buttons |
| Calendar grid | §13 | day/week toggle, lanes by staff/category, colored blocks |
| Empty state | §14 | small monochrome line illustration, one sentence, one named-action button |
| Filter bar | §2 | chip-style quick filters + a single "More filters" popover, not a wall of always-visible dropdowns |
| Stat row (not stat cards) | cross-cutting observations | inline text counts next to filters/section headers, never a standalone KPI card grid |

## 6. Iconography

Functional, line-style icons only (channel icons for Instagram/text/TikTok/email/phone/in-person; status/priority icons). No decorative "AI sparkle" iconography, no illustrative hero graphics on functional screens — reserved exclusively for empty states, and even there kept small and monochrome.

## 7. States (standardized once, reused everywhere)

- **Loading**: skeleton rows/cards matching the real layout's shape — never a centered spinner over a blank page.
- **Empty**: per §14 pattern — illustration + one sentence + one named-action button.
- **Error**: inline, specific message near the affected control/section; a full-page error only for a failed initial data load, and even then with a retry action, never a dead end.
- **Disabled/blocked** (e.g., "can't move to In Production — proof not approved"): the control stays visible (never hidden — source spec's "no hidden primary actions" extends to disabled states) but is disabled with an inline explanation on hover/tap.

## 8. Responsiveness

- Desktop: multi-column dashboard, two-column detail pages, full data tables.
- Tablet: sidebar collapses to icon-only; two-column detail pages stack.
- Mobile: bottom tab nav, dashboard collapses to the single ranked list from `mobbin_research.md` §15 (one CTA, one merged To-Do list — no board/calendar views on mobile in v1; those remain desktop/tablet features).

## 9. Accessibility

- Status meaning is never color-only — every badge carries a text label, not just a colored dot.
- All interactive elements keyboard-reachable; the side panel and command-palette search are fully keyboard operable (Esc closes, arrow keys navigate lists).
- Minimum WCAG AA contrast for all text/background pairs, including status badges (tinted background + text combinations validated, not assumed).
- Focus states visible on every focusable element — no `outline: none` without a replacement focus style.

## 10. What this system deliberately avoids

Directly enumerated against the source brief's "avoid" list, each with the alternative actually used:

| Avoid | Instead |
|---|---|
| Excessive dashboard cards | Urgency-grouped lists (§5, dashboard) |
| Oversized typography | 18-20px max page titles |
| Excessive empty space | 8px scale, spacing spent on structure not padding |
| Random gradients | Solid semantic colors only |
| Decorative charts with no purpose | Charts confined to Phase 8 Reports, never the dashboard |
| Generic AI icons | Functional line icons only |
| Repetitive layouts | Each screen type has one purpose-built layout, not a copy-pasted template |
| Excessive rounded containers | Restrained radius scale, used for badges/buttons/cards, not every div |
| Floating decorative elements | None; every element on screen is either data or a control |
| Hidden primary actions | Persistent "+ New," visible primary buttons on every detail page |
