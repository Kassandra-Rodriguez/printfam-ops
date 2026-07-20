# Mobbin Design Research — PrintFam Ops

This research was completed before any screen in `screens.md` or any visual decision in `design_system.md` was finalized, per the requirement that design patterns be grounded in real, polished products rather than generated generically. Fifteen screen/flow categories were searched on Mobbin (web platform, plus one mobile pass) against Shopify, Square, Linear, Notion, Airtable, Monday, Asana, ClickUp, HubSpot, Intercom, Zendesk, Front, Stripe, ServiceTitan, Jobber, and HoneyBook. No single app's design is copied; each section below documents the pattern selected, why it fits PrintFam Ops specifically, how it's adapted, and what was deliberately rejected.

Each section maps directly to a screen in `screens.md` — see the "Mobbin pattern" reference on each screen entry there.

## 1. Operations/Attention Dashboard
**Mobbin flow/category researched**: "Operations dashboard prioritized list" and "Linear triage." Studied Zendesk's "Tickets requiring your attention" list, ClickUp Home grouped by priority (Urgent/High/Normal sections), Linear's priority-grouped Todo view, and Shopify admin Home "Things to do next."
**Pattern selected**: Flat urgency-labeled sections (Overdue / Needs Response Today / Upcoming) each with a colored dot + count badge, rows are single-line with inline action buttons — not cards, not charts.
**Why it fits**: A non-technical owner needs "what's on fire" in one glance, not a chart to interpret first.
**How it's adapted**: Sections = Overdue Proofs, Unpaid Invoices, New Requests, Today's Repairs/Tasks. Each row: customer name, order #, one-line status, one primary action button (Approve, Send Invoice, Call).
**Rejected**: Shopify's dismissible "setup guide" cards and marketing tiles — add visual noise unrelated to daily ops triage.

## 2. Order/Record Table View
**Mobbin flow/category researched**: Shopify Orders list and Stripe Payments/Transactions list with status-filter chip bar.
**Pattern selected**: Compact rows with pill-shaped status badges (color per state), a horizontal chip row showing counts per status ("All 6 / Succeeded 1 / Failed 3") that double as quick filters, checkbox column for bulk actions, sticky "More filters" popover.
**Why it fits**: Staff triage orders fastest by scanning color, not reading every field — the chip-count bar answers "how many need X" instantly.
**How it's adapted**: Columns: Order #, Customer, Type (custom/existing/bulk/service), Status badge, Due date, Total, Payment status. Status chips generated from the order type's `workflow_statuses`, not hardcoded.
**Rejected**: Stripe's dense "Edit columns" power-user customization — unnecessary complexity for a small team with a fixed workflow.

## 3. Order/Record Detail Page
**Mobbin flow/category researched**: Shopify order detail (line items + timeline + sidebar) and Etsy order detail (status stepper).
**Pattern selected**: Two-column layout — main column has line items, payment summary, and a comment/timeline feed; right sidebar has Customer, Contact info, Shipping/Billing address, Tags — fixed, non-scrolling with the main column.
**Why it fits**: Keeps customer contact info always visible while staff scroll production notes/timeline, avoiding repeated lookups.
**How it's adapted**: Status stepper styled like Etsy's, plus PrintFam-specific sidebar cards for Proof status and Balance Due.
**Rejected**: Shopify's "Fraud analysis" risk-score widget — irrelevant to a small shop with mostly known repeat customers.

## 4. Kanban/Board View
**Mobbin flow/category researched**: Linear board view and ClickUp board, both with status columns and a Display/config panel for grouping.
**Pattern selected**: Slim columns with count badges in the header, minimal cards (title, one or two metadata chips, small avatar) — not thick cards with cover images.
**Why it fits**: Owners running production need to see many orders per column at a glance (capacity awareness), which thin cards support better than image-heavy cards.
**How it's adapted**: Columns = production stages (Quoted, In Queue, In Production, Proofing, Ready to Ship). Card shows order #, customer, due-date chip color-coded by urgency.
**Rejected**: Trello/Monday-style large cover-image cards — too much scroll for a shop tracking 20+ concurrent orders.

## 5. Help Desk / Ticket Detail
**Mobbin flow/category researched**: Zendesk ticket detail and Intercom conversation view, both three-pane (list, thread, record sidebar).
**Pattern selected**: Yellow-background internal notes visually distinct from customer message bubbles, with an explicit "Public reply / Internal note" tab switcher above the composer.
**Why it fits**: Prevents the single most costly small-business mistake — accidentally sending an internal note to a customer.
**How it's adapted**: Reused for order comments/timeline entries on requests and repair tickets, with the sidebar showing linked order, customer record, and interaction history.
**Rejected**: Intercom's AI Copilot panel — out of scope, adds UI weight without matching PrintFam's current needs.

## 6. Unified Inbox / Messaging
**Mobbin flow/category researched**: Front shared inbox and HubSpot Conversations inbox.
**Pattern selected**: Three-column layout (channel/folder nav, conversation list with channel icon + snippet, thread pane), with a right-side "About this contact" panel showing linked records.
**Why it fits**: One inbox for messages logged from any channel avoids checking multiple tools; the linked-record sidebar ties a message straight to its order without switching screens.
**How it's adapted**: Channel icons for Instagram, text, TikTok Shop, Shopify, email, phone, in-person; sidebar shows the customer's open orders and outstanding balance, not generic CRM deal-stage fields.
**Rejected**: HubSpot's Owner/Priority/Category dropdown row atop every thread — too much required metadata entry for a 2-3 person team.

## 7. File/Design Approval & Versioning
**Mobbin flow/category researched**: ClickUp/Air-style proofing view (numbered pins on image + comment thread) and a version-history modal pattern (revision list with restore).
**Pattern selected**: Dark canvas proof viewer with numbered comment pins directly on the artwork, paired with a right-hand thread panel; a version dropdown ("V1, V2...") rather than a full history modal.
**Why it fits**: Print/design approval is inherently visual — customers need to point at exactly what's wrong, not describe it in prose.
**How it's adapted**: Explicit "Approve" / "Request Changes" buttons above the thread, and a version chip per proof upload.
**Rejected**: A full multi-branch version tree (Figma-style) — overkill for a linear proof-revision cycle with 2-4 rounds.

## 8. CRM Contact/Customer Profile
**Mobbin flow/category researched**: HubSpot contact record (tabbed activity + right-side associated records) and Intercom user profile.
**Pattern selected**: Fixed left column (contact info, tags, lifecycle), center tabbed activity feed (filterable by type), right column of collapsible "associated record" cards with counts (Orders 3, Repairs 1).
**Why it fits**: Owners think in terms of "everything about this customer" — answers order history, open balance, past conversations without navigating away.
**How it's adapted**: Right column cards become Orders, Quotes, Repair Tickets, Payments — matching PrintFam's actual record types instead of generic CRM deals.
**Rejected**: HubSpot's AI-generated contact summary card — adds complexity without a clear small-business need yet.

## 9. Quote/Estimate Screen
**Mobbin flow/category researched**: Jobber's quote builder (line items, discount, required deposit) and HoneyBook invoice (payment-schedule table).
**Pattern selected**: Line-item builder with add/remove rows, a running subtotal/discount/tax/total summary docked to the right, an explicit "Required Deposit" line, and a client-view toggle to preview exactly what the customer will see before sending.
**Why it fits**: Deposit terms are core to custom/print work; the client-preview toggle prevents typos going out to customers.
**How it's adapted**: Optional line items for upsells like rush fees, and a "Convert to Order" action once accepted, mirroring Jobber's quote-to-job flow.
**Rejected**: Bare-bones single-item invoice forms — too minimal for multi-item custom orders with tax/deposit needs.

## 10. Customer-Facing Portal
**Mobbin flow/category researched**: Jobber's client-facing quote view (Approve/Request Changes only) and Stripe customer portal (plan, payment methods, invoice history).
**Pattern selected**: Single scrolling read-mostly page: order/quote summary at top, 1-2 primary buttons (Approve, Pay Now), payment method and invoice history below — no navigation sidebar, no internal fields.
**Why it fits**: Customers should never see internal statuses, staff notes, or navigation clutter — just what they need to decide and pay.
**How it's adapted**: Portal home lists a customer's active orders/quotes/proofs as simple cards, each linking to this same minimal detail-and-action pattern.
**Rejected**: A full pipeline-stage progress bar visible to the client (HoneyBook-style) — internal stage names ("Follow-up," "Planning") are meaningless and slightly unprofessional to expose externally.

## 11. Inventory/Stock Table
**Mobbin flow/category researched**: Shopify Inventory management, inline-editable Available/On Hand columns and an "Adjust Available" popover with a reason dropdown.
**Pattern selected**: Table with product thumbnail, variant subtext, Available and On Hand as separate editable number fields, and a lightweight adjustment popover (amount + reason) rather than a full modal.
**Why it fits**: A small print shop tracks raw materials by simple counts — inline editing avoids extra clicks for frequent small adjustments.
**How it's adapted**: Low-stock badge (red/amber) when Available falls under a per-item threshold, and a "Committed" column reflecting stock reserved by open orders.
**Rejected**: Shopify's multi-location transfer/purchase-order flows — not needed for a single-location v1 shop.

## 12. Side Panel / Quick-Edit Drawer
**Mobbin flow/category researched**: Airtable's expanded record (fields left, comment thread right) and a CRM record side panel pattern.
**Pattern selected**: Right-side slide-over panel (not a full-screen modal) that edits a record's fields inline with a comment/activity thread alongside, closable with an X or Esc, with next/previous record arrows.
**Why it fits**: Lets staff quickly update a status or add a note from any list view without losing their place — critical when triaging many small orders in a row.
**How it's adapted**: Used for quick-editing tasks, order status, and repair ticket fields directly from table/board views; a "Open full page" icon remains for full navigation.
**Rejected**: Full-page-navigation-only editing (no drawer) — too many clicks/context switches for frequent small edits.

## 13. Calendar/Schedule View
**Mobbin flow/category researched**: A staff-scheduling week grid (rows by role, colored shift blocks) and Square Appointments calendar (week grid with colored time blocks).
**Pattern selected**: Day/Week toggle grid with colored blocks per job/task, each block showing customer name + short label; rows/lanes grouped by staff member or category.
**Why it fits**: Small teams need to see who's doing what and when at a glance — color-by-type plus lanes answers scheduling conflicts instantly.
**How it's adapted**: Lanes = staff member or workstation; blocks = repair pickups, delivery windows, production milestones — clicking a block opens the quick-edit side panel (pattern 12).
**Rejected**: Labor-cost percentage footers — irrelevant to PrintFam's order-scheduling need.

## 14. Empty States
**Mobbin flow/category researched**: ClickUp's "This Space is empty," a CRM's "No tasks found," and a forms tool's "No forms yet."
**Pattern selected**: Small centered line-art illustration, one-sentence description of what will appear here, single primary button naming the exact action ("Create task," not "Get started").
**Why it fits**: A non-technical owner seeing a blank dashboard/table for the first time needs an unambiguous next step, not a marketing moment.
**How it's adapted**: Consistent small monochrome line illustrations across all empty states (orders, tasks, inventory) so they read as one system; button text always matches the record type ("Create your first order").
**Rejected**: Heavy full-color decorative illustration — too playful/consumer-facing for a B2B ops tool.

## 15. Mobile Dashboard (iOS reference)
**Mobbin flow/category researched**: Jobber's mobile Home screen and today's-visit view.
**Pattern selected**: Everything collapses to one vertically stacked prioritized list under a single date header — one primary CTA at top, a "This week" summary strip, then a flat "To do" list with icon + title + one-line subtitle + chevron per row.
**Why it fits**: Confirms that on mobile, the multi-column desktop dashboard (pattern 1) should collapse to exactly this: one ranked list, no columns, no charts.
**How it's adapted**: Mobile PrintFam Ops home = today's date, one CTA ("New Order"), then a single To-Do list merging overdue proofs/payments/tasks in priority order.
**Rejected**: A live map/dispatch view as the mobile home default — PrintFam has no field-dispatch component, irrelevant real estate on a small screen.

## General cross-cutting observations

**Status color systems**: Every polished tool researched (Shopify, Stripe, Zendesk, Linear, HubSpot) uses a small, consistent semantic palette — green for success/paid/approved, amber/yellow for pending/waiting, red for failed/overdue/urgent, gray/blue-gray for neutral/draft — applied only to small pill badges and left-border accents, never as full-row or full-card background fills. Colors repeat identically across every screen (table badges, board columns, calendar blocks) so users learn the meaning once. PrintFam Ops defines 4-5 status colors up front (`design_system.md`) and applies them nowhere else — no decorative gradients, no rainbow charts.

**Density vs. scannability**: The best tools default to compact table/list rows (Shopify orders, Stripe transactions, Linear issues) with 13-14px type and generous horizontal padding but tight vertical padding, reserving whitespace for section breaks (urgency groups, column headers) rather than around every element. Bold weight is reserved for the single most important field per row (customer name or amount); everything else is regular-weight gray — the opposite of card-heavy layouts, which force more scrolling for the same information.

**Avoiding the "generic AI dashboard" look**: None of the reference apps open their most-used screen with large gradient stat tiles, oversized welcome headings, or decorative chart-filled hero sections — Shopify's home and Linear's Triage go straight into an actionable list below a plain, small page title. Metrics that do appear (Stripe's status chip counts, ClickUp's task counts) are inline text badges next to filters, not standalone KPI cards. PrintFam Ops follows this: a small plain heading, no hero banner, no gradient cards, and any future charts/metrics pushed to a separate secondary Reports area (Phase 8) — never the attention dashboard.
