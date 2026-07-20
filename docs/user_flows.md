# User Flows — PrintFam Ops

Each flow lists: trigger, actor, steps, system behavior, edge cases, and resulting records. These flows are the source of truth `screens.md` is built against.

## Flow A — Quick manual order entry

**Trigger**: Owner/Manager needs to log an order fast, mid-conversation.
**Actor**: Owner, Manager.

1. Click persistent "+ New" → "Order" (from anywhere in the app, not buried in a menu).
2. Choose order type: Custom / Existing Product / Bulk / Service (Repair routes to Flow D's intake instead).
3. Quick Entry panel opens pre-filtered to 7 fields: Customer (existing search-select or "+ new customer" inline), Order title, Order type (carried from step 2), Current status (dropdown, defaults to the type's first status but is changeable), Total amount, Due date, Notes.
4. Save. Order is created with status history seeded at the chosen status (see Flow B for backdating), and the record opens in Detailed view for optional immediate follow-up.

**Edge cases**: customer not found → inline creation without leaving the panel. Save with only required fields (customer, title, type) — total/due date/notes are optional even in Quick Entry the source spec calls "quick," but customer/title/type/status are mandatory to keep the record usable on lists.

**Resulting records**: `customers` (maybe), `orders`, `order_status_history` (1 row), `activity_logs` (order created).

## Flow B — Entering an order already in progress (mid-workflow entry)

**Trigger**: PrintFam has active orders today that are already partially done — this flow is why Phase 3 exists.
**Actor**: Owner.

1. "+ New" → "Order" → choose type → switch to **Detailed Entry** (toggle at top of the same form, not a separate screen).
2. Fill customer, items/specs, pricing, deposit terms.
3. **Status field is a first-class selector**, not a locked "start at step one" field — every status in that order type's workflow is selectable (e.g., "In Production," "Waiting for Final Payment," "Ready for Pickup").
4. On choosing a non-initial status, the form surfaces a **"Backfill history" section**: optional entries for prior statuses with historical dates (so the status timeline isn't a lie), existing payments already collected (amount, method, date — can add multiple), existing notes, and file/proof uploads.
5. Save. `order_status_history` is seeded with the backfilled entries in chronological order plus the current status as the latest entry; `payments` rows are created with their real historical dates (not today's date); `activity_logs` entries are backdated to match, tagged `source: manual_backfill` so they're distinguishable from live activity if ever needed.

**Edge cases**: user skips backfill entirely → order is created with a single status-history row timestamped now, current status as chosen. No payments recorded is valid (source spec: "Completed but still unpaid" is a legitimate entry state).

**Resulting records**: same as Flow A, plus multiple `order_status_history` and `payments` rows with historical timestamps.

## Flow C — Request intake → conversion to order

**Trigger**: A new inquiry comes in through any channel.
**Actor**: Owner, Manager, Team Member (create), Owner/Manager (convert).

1. Create request manually (from "+ New" or directly from a logged communication, Flow H) with source platform, description, estimated value, follow-up date.
2. Request moves through its status list as the conversation progresses (Reviewing → Quote Sent → Approved, etc.), logged via the request detail page's status control.
3. When ready, click "Convert to Order" from the request detail page.
4. System opens Detailed Entry pre-filled from the request (customer, description → title/notes, source, linked quote if one exists) — user confirms/adjusts and saves.
5. On save: the new order gets `converted_from_request_id`; all `messages`, `attachments`, `tasks`, and `activity_logs` rows that referenced the request are **re-pointed** (not copied) to also reference the order via their existing nullable FK columns, and the request itself transitions to "Converted to Order" and is locked from further edits except read access.

**Edge cases**: request has no quote yet → order can still be created, quote step skipped. Request declined/lost → status set directly, no conversion, record stays for reporting (conversion-rate-by-source needs this).

**Resulting records**: `orders` (new), `requests` (status updated), re-parented `messages`/`attachments`/`tasks`, `activity_logs` (conversion event).

## Flow D — Repair intake → diagnostics → approval → completion

**Trigger**: Customer drops off or ships a device, or requests repair remotely.
**Actor**: Owner, Manager, Team Member.

1. "+ New" → "Repair" opens the repair intake form: device/model, serial number, reported issue, error codes, photos/videos, intake date, condition at intake, accessories received. Status defaults to "Repair Requested" or "Device Received" depending on whether it's in-hand yet (selectable, same mid-workflow principle as Flow B).
2. Diagnostic stage: diagnostic notes, diagnostic fee, identified problem, recommended repair, parts required + cost, labor cost estimate — status moves to "Diagnostic in Progress" then "Waiting for Customer Approval."
3. Customer approval is requested either in-app (if staff relays it) or via the customer portal (repair recommendation approval, per Flow J). Approval/decline recorded with timestamp.
4. On approval: status → "Waiting for Parts" (if needed) → "Repair in Progress" → "Testing" (testing checklist + before/after photos) → "Repair Completed."
5. Final balance calculated from parts + labor + diagnostic fee minus deposit; payment recorded (Flow G) moves status → "Waiting for Payment" → "Ready for Pickup" → "Returned to Customer" → "Closed."

**Edge cases**: customer declines recommended repair → status can move directly to "Closed" or "Cancelled" with notes; diagnostic fee may still be owed. Repair enters system already mid-repair (a device the shop already has) → same mid-workflow entry as Flow B, using the repair ticket's own status list.

**Resulting records**: `repair_tickets`, `repair_diagnostics`, `repair_parts`, `repair_ticket status history` (modeled the same way as `order_status_history`, entity-scoped), `payments`, `activity_logs`.

## Flow E — Quote → customer approval → order

**Trigger**: Owner/Manager needs to price out custom or bulk work before committing.
**Actor**: Owner, Manager (create/send); Customer (approve, via portal).

1. Create quote (standalone or from a request): line items, labor, materials, discounts, tax, shipping, deposit amount, expiration date, terms, customer notes. Status "Draft."
2. "Send" generates a portal access token (see `security.md`) and marks status "Sent"; a client-preview toggle lets staff see exactly what the customer will see before sending.
3. Customer opens the portal link → status auto-updates to "Viewed" on first open.
4. Customer approves or declines in the portal. Approval sets status "Approved" and timestamps it; decline sets "Declined" with an optional reason.
5. Staff clicks "Convert to Order" (same mechanics as Flow C step 4-5, but sourced from the quote) — quote status becomes "Converted to Order."
6. Expiration: a scheduled check (or on-view lazy check) flips unactioned quotes past `expires_at` to "Expired."

**Resulting records**: `quotes`, `quote_items`, `portal_access_tokens`, `activity_logs` (sent/viewed/approved/declined/converted), optionally `orders`.

## Flow F — Proof upload → customer approval/revision → production unlock

**Trigger**: Design work is ready for customer sign-off before production.
**Actor**: Owner, Manager, Team Member (upload); Customer (approve/revise, via portal).

1. From an order/repair detail page, upload a proof: file(s), version label (auto-incremented, e.g. V1), customer message, internal-only vs customer-visible flag, whether approval is required to unlock production (`approval_required`).
2. "Send to customer" generates/reuses a portal token scoped to that proof and marks the proof "Sent"; if a prior version existed, it's preserved (never overwritten) and shown as history.
3. Customer views in the portal, and either **Approves** (timestamped, recorded in `proof_responses`) or **Requests Revision** (revision comment required, not optional).
4. On revision request: staff uploads a new version (V2, V3, ...) against the same proof thread; prior versions and their comments stay visible.
5. On approval: if the parent order has `approval_required = true` and no prior approved proof, the production-stage status transitions become unblocked (enforced server-side, not just a hidden button — see `security.md`).

**Edge cases**: internal-only proofs (e.g., a rough mockup for internal review) never generate a portal token and never appear in the customer portal, even if requested by ID.

**Resulting records**: `proofs`, `proof_versions`, `proof_responses`, `portal_access_tokens`, `activity_logs`.

## Flow G — Recording a payment

**Trigger**: Cash, deposit, or final balance received through any method.
**Actor**: Owner, Manager, Team Member (if assigned).

1. From an order/quote/repair detail page (or a standalone "+ New" → "Payment" that requires selecting the target record first), open "Record Payment."
2. Enter amount, method (cash/Cash App/Zelle/card/Shopify/TikTok Shop/Square/bank transfer/other), date (can be backdated), deposit-or-final flag, reference number, notes, optional receipt attachment.
3. Save. The target record's paid/remaining-balance figures recompute immediately everywhere they're displayed (detail page, dashboard, customer profile, portal).

**Resulting records**: `payments`, `activity_logs` (payment recorded), possible task auto-suggestion dismissal ("Collect final balance" task auto-completes if it was open on that record).

## Flow H — Logging a communication

**Trigger**: A message/call happens on any channel outside the app.
**Actor**: Owner, Manager, Team Member.

1. "+ New" → "Communication" (or "Log message" from a customer/order detail page, pre-filled with that customer/record).
2. Choose channel, direction (incoming/outgoing), paste or type message content, attach files, set date/time (defaults to now, editable), optionally link to an existing request/order, flag follow-up required + date.
3. Save creates the `messages`/`conversations` row. From the saved record, one-click actions: "Create request from this," "Create order from this," "Create follow-up task."

**Resulting records**: `conversations`/`messages`, optionally `requests`/`orders`/`tasks`, `activity_logs`.

## Flow I — Daily dashboard triage loop

**Trigger**: Start of day, or any time the owner opens the app.
**Actor**: Owner, Manager, Team Member (sees only assigned subset).

1. Dashboard loads the attention list first (see `screens.md` §Dashboard) — grouped by urgency (Overdue, Needs Response Today, Upcoming), never charts-first.
2. Each row supports an inline primary action (approve, send invoice, mark contacted, call) or opens the side panel for a quick edit without leaving the dashboard.
3. Completing an action removes the row from that section in real time (optimistic UI) and logs to `activity_logs`.

**Resulting records**: whatever the underlying action produces; the dashboard itself doesn't create records.

## Flow J — Customer portal: viewing and approving

**Trigger**: Customer receives a link (via a communication logged outside the app, e.g., a text or email staff send manually in v1) containing a scoped, expiring token.
**Actor**: Customer.

1. Open the link → token validated (not expired, not revoked, matches the record) → portal renders exactly one order/quote/proof/repair-recommendation view, with no navigation into anything else in the organization.
2. Customer can: view order/quote/proof/repair status and details, approve/decline a quote, approve/request revision on a proof, approve a repair recommendation, upload a file, view payment status/balance, send a message, view pickup/shipping/tracking info.
3. Any action taken (approval, message, upload) writes back through the same domain services normal staff actions use — the portal is a restricted client of the same backend, not a parallel system — and appears immediately in staff-side detail pages and the dashboard's attention list.

**Edge cases**: expired/revoked token → clear "this link has expired, contact PrintFam" state, never a generic error. Token scoped to one record → cannot be reused to view a different order/proof/quote even by guessing an adjacent ID (see `security.md` IDOR section).

**Resulting records**: `proof_responses`/`quotes` status/`repair_tickets` approval fields, `messages`, `attachments`, `activity_logs` — all attributed to "Customer" as actor, not an internal user.
