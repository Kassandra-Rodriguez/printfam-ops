# Screen Inventory — PrintFam Ops

Every screen below cites the `mobbin_research.md` section its layout pattern is grounded in. Screens are grouped by build phase relevance where useful. Each entry: purpose, key elements, primary actions, states.

## Navigation shell

Persistent left sidebar (collapses to bottom tab bar on mobile per `mobbin_research.md` §15): Dashboard, Requests, Orders, Repairs, Quotes, Inbox, Customers, Tasks, Inventory, Reports (Phase 8), Settings. A persistent "+ New" button lives in the top bar, not nested in a menu (source spec: "important actions hidden inside menus" is explicitly disallowed). Global search (⌘K-style) is top-bar, always visible.

## 1. Dashboard
**Mobbin pattern**: §1 Operations/Attention Dashboard.
**Purpose**: Answer "what needs my attention right now" before anything else.
**Key elements**: Urgency-grouped sections (Overdue, Needs Response Today, Upcoming) — New Requests, Proofs Awaiting Approval, Quotes Awaiting Approval, Orders Due Soon / Overdue, In Production, Waiting for Payment, Outstanding Balances, Repairs Awaiting Diagnostics/Approval/Parts, Ready for Pickup / Overdue Pickup, Tasks Due/Overdue, Recently Completed (collapsed by default, lowest priority). No charts above the fold.
**Primary actions**: inline row actions (Approve, Mark Contacted, Record Payment) + click-through to side panel or detail page.
**States**: empty section collapses/hides rather than showing "0 items" noise; loading shows skeleton rows, not spinners over blank cards.

## 2. Global search results
**Mobbin pattern**: standard command-palette pattern (not separately researched; low-risk, well-established).
**Purpose**: Cross-entity search (customers, orders, requests, repairs, tracking numbers, notes).
**Key elements**: Grouped results by entity type, keyboard-navigable.
**Primary actions**: Jump to record.

## 3. Customers — list
**Mobbin pattern**: §2 Order/Record Table View (same compact-table pattern reused for consistency).
**Key elements**: Name, contact channels (icons), tags, outstanding balance, last activity date.
**Primary actions**: + New Customer, open profile.
**States**: empty state per §14 ("Add your first customer").

## 4. Customer profile
**Mobbin pattern**: §8 CRM Contact/Customer Profile.
**Key elements**: Fixed left column (contact info across all channels, tags, preferred contact method, duplicate-match warning if applicable); center tabbed activity feed (all / messages / notes / files); right column of collapsible cards — Orders, Requests, Repairs, Quotes, Payments/Balance — each with a count and "View all."
**Primary actions**: Log communication, + New Request/Order/Repair for this customer, edit profile.
**States**: duplicate-detected banner (non-blocking) if identifiers match another customer.

## 5. Requests — list (table + board)
**Mobbin pattern**: §2 (table) and §4 Kanban/Board (board, grouped by status).
**Key elements**: Source-platform icon per row, estimated value, follow-up date, status.
**Primary actions**: + New Request, convert to order (bulk-disabled — conversion is per-record).
**Filters**: status, source, assignee, follow-up date.

## 6. Request detail
**Mobbin pattern**: §5 Help Desk/Ticket Detail (internal-note vs. customer-facing distinction reused for consistency, even though v1 requests don't have a live customer thread yet).
**Key elements**: Status control, source/estimated value, linked quote (if any), messages/notes timeline, files, tasks.
**Primary actions**: Convert to Order, Log Communication, Add Task, Change Status.

## 7. Orders — list (table / board / calendar)
**Mobbin pattern**: §2 (table), §4 (board), §13 Calendar/Schedule (calendar).
**Key elements**: Table: Order #, Customer, Type, Status badge, Due date, Total, Payment status. Board: columns per the order type's workflow statuses. Calendar: orders plotted by due date, color-coded by urgency.
**Primary actions**: + New Order (opens type picker → Quick/Detailed entry), bulk status update.
**Filters**: type, status, source, assignee, due date, payment status.

## 8. Order detail
**Mobbin pattern**: §3 Order/Record Detail Page.
**Key elements**: Status stepper (workflow-driven, not hardcoded), line items, pricing/deposit/balance summary, proofs card, files, payment history, notes/activity timeline, tasks, communication history, source info.
**Primary actions**: Change status, Record Payment, Upload Proof, Add Task, Log Communication, Send to Customer Portal.
**States**: mid-workflow orders show full backfilled history in the timeline exactly as entered (Flow B), not synthesized.

## 9. New Order — Quick / Detailed entry
**Mobbin pattern**: informed by §9 Quote/Estimate Screen's line-item builder for Detailed mode; Quick mode is a minimal single-column form (no direct Mobbin analog needed — deliberately minimal per source spec).
**Key elements**: Type picker (Custom / Existing Product / Bulk / Service) → Quick/Detailed toggle. Quick: customer, title, type, status, total, due date, notes. Detailed: full field set including the "Backfill history" section (Flow B) for status, payments, dates.
**Primary actions**: Save as Draft, Save.
**States**: unsaved draft auto-persists (source spec explicit requirement — "allow drafts so unfinished order entry is not lost").

## 10. Repairs — list
**Mobbin pattern**: §2 (table), §4 (board by repair status).
**Key elements**: Device/model, reported issue, status, diagnostic fee, waiting-for-parts flag.
**Primary actions**: + New Repair (intake form).

## 11. Repair intake form
**Mobbin pattern**: adapted from §9's structured multi-section form pattern.
**Key elements**: Device/serial/issue/error codes/photos/videos, intake date, condition, accessories — status selectable at creation (mid-workflow entry, same as Flow B).
**Primary actions**: Save, Save as Draft.

## 12. Repair detail
**Mobbin pattern**: §3 + §5 (ticket-style internal/customer note distinction).
**Key elements**: Status stepper, diagnostic notes/findings, recommended repair + customer approval state, parts (list + cost), labor cost, testing checklist, before/after photos, final balance, warranty notes, pickup confirmation.
**Primary actions**: Request Customer Approval (generates portal token), Record Payment, Change Status.

## 13. Quotes — list
**Mobbin pattern**: §2.
**Key elements**: Customer, linked request (if any), total, expiration, status.
**Primary actions**: + New Quote.

## 14. Quote builder / detail
**Mobbin pattern**: §9 Quote/Estimate Screen.
**Key elements**: Line-item builder, running summary (subtotal/discount/tax/shipping/deposit/total) docked right, expiration, terms, client-preview toggle.
**Primary actions**: Save Draft, Send (generates portal token), Convert to Order (once approved).

## 15. Proof viewer / upload
**Mobbin pattern**: §7 File/Design Approval & Versioning.
**Key elements**: Dark canvas viewer, version selector (V1/V2/...), comment thread, internal-only vs. customer-visible toggle, approval-required toggle, Approve/Request Changes buttons (staff view shows response status; customer view shows the action buttons).
**Primary actions**: Upload new version, Send to Customer.

## 16. Inbox (communications)
**Mobbin pattern**: §6 Unified Inbox/Messaging.
**Key elements**: Three-column — channel/folder nav, conversation list (channel icon + snippet + timestamp), thread pane; right "About this customer" panel (open orders, balance).
**Primary actions**: Log/paste a new communication, Create Request/Order from message, Create Follow-up Task.

## 17. Log communication (quick entry)
**Mobbin pattern**: minimal form, no dedicated Mobbin research needed (low-risk pattern).
**Key elements**: Customer, channel, direction, paste-message textarea, attachments, linked record, follow-up toggle/date.
**Primary actions**: Save.

## 18. Tasks — list + quick-edit panel
**Mobbin pattern**: §12 Side Panel/Quick-Edit Drawer.
**Key elements**: Grouped by due date (Overdue/Today/Upcoming), linked-record chip, assignee, priority.
**Primary actions**: Complete (inline checkbox), open side panel to edit without leaving the list.

## 19. Files browser
**Mobbin pattern**: adapted from §2 table pattern.
**Key elements**: Name, type, related record, visibility badge (Internal/Customer-visible), uploader, date.
**Primary actions**: Upload, change visibility.

## 20. Inventory — list
**Mobbin pattern**: §11 Inventory/Stock Table.
**Key elements**: Thumbnail, SKU, Available, Reserved, On Hand (computed), low-stock badge.
**Primary actions**: Adjust stock (popover: amount + reason, not a full modal).

## 21. Reports (Phase 8)
**Mobbin pattern**: explicitly *not* the dashboard pattern — per §"General cross-cutting observations," metrics live in a separate secondary area, never the attention dashboard.
**Key elements**: Revenue by month, orders by type, requests by source/conversion, AOV, outstanding balances, average completion time, popular products, repeat customers.

## 22. Settings (Owner only; workflow/status editor ships Phase 8)
**Key elements**: Organization profile (name/logo/brand colors/contact), team members & roles, custom order/repair types, payment settings, notification settings, portal branding, subscription plan.

## 23. Customer portal — order/quote/proof/repair view
**Mobbin pattern**: §10 Customer-Facing Portal.
**Key elements**: Single scrolling read-mostly page — summary at top, 1-2 primary buttons (Approve/Decline, Pay status), payment/balance, pickup/shipping/tracking, message box. No navigation into anything else in the org.
**Primary actions**: Approve/Decline quote or proof or repair recommendation, upload file, send message.
**States**: expired/revoked token → explicit "this link has expired, contact PrintFam" message, never a generic error page.

## 24. Auth & organization onboarding
**Key elements**: Sign up / log in (Supabase Auth), create organization (name, first Owner), invite team members.
**Not separately Mobbin-researched**: standard, low-ambiguity auth patterns; effort was concentrated on the operational screens where PrintFam's actual daily use lives.

## 25. Notifications panel
**Mobbin pattern**: adapted from §1's row pattern (list, not cards).
**Key elements**: Chronological list, unread indicator, click-through to record.

## Screens explicitly deferred past Phase 3

Reports (21), Settings workflow/status editor (22, partial), and full customer-portal styling polish (23) are functional but visually minimal until their respective phases (`build_phases.md`). Screens 1, 7, 8, 9, 10, 11, 12, 18 must exist and work end-to-end by the close of Phase 3 to satisfy the MVP acceptance criteria in `product_requirements.md`.
