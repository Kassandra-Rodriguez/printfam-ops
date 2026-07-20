# Build Phases — PrintFam Ops

Each phase lists scope, acceptance criteria, and what remains explicitly out of scope until a later phase. Phase 3 is the milestone that makes the app usable for PrintFam's real, current orders — everything before it exists to make Phase 3 possible; everything after it can slip without blocking daily use.

## Phase 1 — Planning & design research (this document set)

**Scope**: `product_requirements.md`, `user_roles.md`, `user_flows.md`, `screens.md`, `data_model.md`, `architecture.md`, `security.md`, `mobbin_research.md`, `design_system.md`, `build_phases.md`.

**Acceptance criteria**
- [x] All 10 documents exist and are internally consistent (same entity names, same status vocabularies, same role names throughout).
- [x] Mobbin research completed and documented *before* any screen layout was finalized in `screens.md`.
- [x] Every major screen in `screens.md` cites a specific `mobbin_research.md` section.
- [x] Assumptions are documented explicitly (`product_requirements.md` §10) rather than left implicit.

## Phase 2 — Application foundation

**Scope**
- Next.js (App Router) + TypeScript project scaffold, strict mode on.
- Supabase project: Postgres schema migration for the full `data_model.md` table set, RLS enabled on every tenant table from the first migration (not retrofitted).
- Supabase Auth wiring: sign up, log in, session handling.
- Organization creation flow (first Owner), `organization_members`/`roles` seeding.
- Base `server/authz` module (`architecture.md` §4) with the 4-role matrix from `user_roles.md` enforced on at least one real mutation end-to-end, as a pattern for every subsequent feature to copy.
- Application shell: responsive nav (sidebar/mobile tab bar per `design_system.md` §4/§8), global search shell (can return empty results initially), persistent "+ New" entry point.
- Base design system: color tokens, typography scale, the 5 status-badge tokens, empty/loading/error state components — built once, used everywhere after.

**Acceptance criteria**
- [ ] A new user can sign up, create an organization, and land in an empty-but-navigable shell.
- [ ] RLS verified with the two-organization isolation test from `security.md` §3 — this test is written now and re-run in every subsequent phase's CI, not written once and forgotten.
- [ ] Role checks are server-enforced on at least one action (proves the pattern before it's copied across 30+ mutations in later phases).

**Explicitly not in this phase**: any business entity screens (customers, orders, etc.) beyond what's needed to prove the shell works.

## Phase 3 — First usable workflow (PrintFam can start using the app)

This is the phase the entire build sequence exists to reach quickly. It must satisfy the manual-entry and mid-workflow-entry requirements in `product_requirements.md` §8 without compromise.

**Scope**
- Customer creation (full profile fields, duplicate-detection warning banner).
- Manual order creation: type picker (Custom/Existing Product/Bulk/Service) → Quick Entry and Detailed Entry, including the "Backfill history" section (Flow B) — status selectable at any point in the workflow, historical payments/dates/notes/files enterable at creation.
- Draft persistence (an interrupted order entry survives reload).
- Order list (table view only — board/calendar can follow in the same phase if time allows, but table is the requirement) and order detail page with status stepper, payment history, notes, files, tasks.
- Manual payment recording against an order.
- Basic notes and file upload/attachment on orders.
- Basic tasks: create, assign, complete, linked to an order.
- Dashboard attention list, scoped to what exists at this phase: orders due soon/overdue, orders waiting for payment, outstanding balances, tasks due/overdue. (Proof/request/repair sections populate in later phases without a dashboard redesign — the layout is built to accommodate them from `screens.md` #1.)

**Acceptance criteria**
- [ ] Every one of PrintFam's current active orders (see seed data plan below) can be entered, at its real current status, with real historical dates and payments, with no workaround.
- [ ] Quick Entry order round-trip (create → visible on dashboard/list) takes under 60 seconds for a familiar user.
- [ ] A page reload mid-entry does not lose data.
- [ ] Dashboard accurately reflects live order/payment/task state with no manual refresh trickery.
- [ ] This phase's acceptance criteria in `product_requirements.md` §11 (the order/payment/task-related bullets) all pass.

**Explicitly not in this phase**: requests, communications log, repairs, quotes, proofs, customer portal, inventory. PrintFam can fully operate on orders alone starting here.

## Phase 4 — Requests & communication tracking

**Scope**: full request lifecycle (`user_flows.md` Flow C), request list (table + board), request detail, convert-to-order (with the re-parenting behavior specified in Flow C, not a copy), communications log/inbox (`screens.md` #16/#17), paste-to-log quick entry, create-record-from-message actions, follow-up task generation.

**Acceptance criteria**
- [ ] A request can be created, tracked through its status list, and converted to an order with zero data loss (messages/notes/files/tasks/activity all still linked, verified by inspecting the converted order's timeline).
- [ ] A pasted message can become a request, an order, or a task in one flow without retyping customer info.

## Phase 5 — Repair management

**Scope**: repair intake form, repair detail (diagnostics, parts, labor, testing checklist, before/after photos, warranty, pickup confirmation), repair list (table + board), repair-specific dashboard sections (awaiting diagnostics, awaiting approval, waiting for parts).

**Acceptance criteria**
- [ ] A repair ticket supports the full intake→diagnosis→approval→repair→testing→payment→pickup lifecycle, and can also be entered mid-lifecycle (same backfill principle as Phase 3's orders).

## Phase 6 — Quotes & proofs

**Scope**: quote builder (`screens.md` #14), quote send/view/approve/decline (portal token issuance begins here, scoped narrowly to quotes first), quote-to-order conversion; proof upload/versioning/send, proof approval/revision-request via portal token, production-gate enforcement (`user_flows.md` Flow F).

**Acceptance criteria**
- [ ] A quote can be sent and approved by a real external recipient (not just an internal test user) through a token link, and converts to an order without data loss.
- [ ] A proof's revision cycle preserves every prior version and its comments; approval unlocks the gated order status transition, and the gate is enforced server-side (attempt to skip it via a direct action call fails).

## Phase 7 — Customer portal

**Scope**: unify the token-based views built incrementally in Phase 6 into the full portal experience (`screens.md` #23): order/quote/proof/repair-recommendation views, payment status/balance, pickup/shipping/tracking info, messaging, file upload — with the internal-data exclusions from `security.md` §4-5 verified.

**Acceptance criteria**
- [ ] A portal session, given any valid token, cannot reach any URL or data outside its exact scoped record — verified by an automated test attempting ID substitution/traversal, not just manual spot-checking.
- [ ] Every internal-only field (notes, tasks, cost, profit, other customers/orgs) is absent from the portal's rendered HTML and API responses, not merely hidden by CSS.

## Phase 8 — Inventory, reporting, notifications, refinements

**Scope**: product catalog + inventory adjustments + configurable status-triggered stock transactions (`screens.md` #20), basic reports (`product_requirements.md` §7.15), in-app notifications (§7.14), Settings screen for custom statuses/workflow editing (unlocking the `workflow_statuses` editing UI the data model has supported since Phase 2), global search polish, saved filters, calendar view for orders (if not already done), general performance/accessibility pass.

**Acceptance criteria**
- [ ] Inventory decrements/restores correctly per configurable order-status triggers, and a manual adjustment is auditable.
- [ ] Reports match manually-verified totals against a known seed dataset.
- [ ] An Owner can rename/reorder a status for one entity type in Settings and see it reflected everywhere that status is rendered, with zero code changes.

## Seed data plan (built alongside Phase 3, expanded through later phases)

Realistic PrintFam data, no placeholder names, covering every state in `product_requirements.md`'s acceptance criteria:

1. Custom MiniBits order — in production.
2. CardKit inventory order — existing-product order, paid, preparing.
3. Bulk product request — not yet converted, follow-up needed.
4. Printer repair request — awaiting drop-off.
5. Quote waiting for approval — sent, not yet viewed.
6. Proof waiting for approval — sent to customer, pending response.
7. Revision requested — proof V2 in progress after a V1 revision request.
8. Order in production — mid-workflow, no proof gate.
9. Order waiting for final payment — deposit paid, balance due.
10. Order ready for pickup — fully paid.
11. Existing order manually entered midway through production — backfilled history (2-3 backdated status entries, a backdated deposit payment), demonstrating Flow B directly.
12. Repair waiting for a customer response — diagnostic complete, recommendation sent, awaiting approval.

Each seed record includes realistic customer names, dollar amounts, deadlines, notes, at least one logged communication, and at least one task where the workflow calls for it (e.g., "Follow up on quote" for #5). This dataset is what Phase 3's and later phases' acceptance criteria are verified against, and doubles as the first thing the user sees when demoing the app to a second potential tenant.

## Build sequencing risk notes

- Phases 4-8 can reorder relative to each other somewhat based on what PrintFam actually needs next in practice (e.g., if repairs turn out to be more urgent than quotes, swap Phase 5 and 6) — the one sequencing constraint that should **not** move is Phase 3 staying first among entity-feature phases, since it's the phase that makes the app usable at all.
- The workflow-engine (`architecture.md` §5) must exist by Phase 2/3, not retrofitted later — every subsequent phase's status handling depends on it, and retrofitting it after Phases 3-5 have hardcoded statuses would be exactly the kind of rework the coding standards are trying to avoid.
