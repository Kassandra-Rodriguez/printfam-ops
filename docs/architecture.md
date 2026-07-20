# Architecture — PrintFam Ops

## 1. Technology stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js (App Router), TypeScript, React | latest stable versions that work together, pinned in `package.json` |
| Database | PostgreSQL via Supabase | also provides Auth, Storage, Realtime |
| Styling | Tailwind CSS + shadcn/ui | component primitives, not a prebuilt admin template |
| Forms | React Hook Form + Zod | one Zod schema shared client (form validation) and server (mutation boundary) |
| Tables | TanStack Table | powers Orders/Customers/Repairs/Inventory list views |
| Drag & drop | dnd-kit | board views |
| Dates | date-fns | |
| Email (future) | Resend | not wired in v1 — see §6 |
| Billing (future) | Stripe | subscription billing for SaaS phase, not v1 |
| Deployment | Vercel | |

## 2. Layering

```
app/                      Next.js routes (App Router) — presentation only
  (dashboard)/...         route groups per screen in screens.md
  api/...                 route handlers for portal + webhooks (future)
components/                shadcn-based UI components, no business logic
server/
  domain/                  framework-agnostic business logic
    orders/                order creation, status transitions, conversion
    requests/
    repairs/
    quotes/
    proofs/
    payments/
    customers/
    tasks/
    communications/
    inventory/
  data/                    Supabase-backed repositories — one module per entity family
  authz/                   centralized role + org + assignment checks (see security.md)
  integrations/            provider interfaces (see §6) + the only real implementation: "manual"
  notifications/
lib/
  validation/              Zod schemas, shared by forms and server actions
supabase/
  migrations/
  policies/                RLS policy SQL, reviewed as code
```

**Rule**: route handlers and server actions call `server/domain/*` functions; they never talk to Supabase directly. `server/domain/*` calls `server/data/*` repositories and `server/authz/*` checks. This is what makes "server authorization checks" and "no duplicated business logic" (both explicit coding standards) actually enforceable — there's exactly one place order-status-transition logic lives, whether it's triggered from the UI, the portal, or (later) an integration webhook.

## 3. Multi-tenancy

Every tenant-owned table carries `organization_id`. Isolation is enforced twice, deliberately redundant:

1. **Database (RLS)** — the authoritative boundary. Every table's policies filter on `organization_id = current_org_id()`, where `current_org_id()` is a Postgres function resolving the caller's active organization from their session (see `security.md` for the exact mechanism). This holds even if application code has a bug.
2. **Application layer** — every `server/data/*` repository function requires an explicit `organizationId` argument threaded from the authenticated session, never inferred from client input. This isn't redundant paranoia so much as the layer that produces good error messages and keeps query plans efficient (RLS alone can still be slow if every query scans cross-tenant before filtering).

No query, anywhere in the codebase, is allowed to omit an organization scope — this is enforced by code review discipline in v1 and is a good candidate for a lint rule once the repository pattern stabilizes.

## 4. Authorization layer

`server/authz/` centralizes role checks (`user_roles.md`) so a permission rule is defined once and reused by every route/action that touches that entity, rather than re-implemented per screen. Shape:

```ts
can(actor, action, resource) -> boolean
```

where `actor` includes `{ userId, organizationId, role, assignedRecordIds? }` and `resource` includes `{ type, id, organizationId }`. Every server action calls `can()` before mutating; UI-level hiding of buttons is a UX convenience only, never the enforcement point (source spec: "never rely only on hidden interface elements for security").

## 5. Status/workflow engine

Per `data_model.md`'s `workflow_definitions`/`workflow_statuses`, the UI never hardcodes a status list or a status's color/category. A shared `server/domain/workflow` module exposes:

- `getStatusesFor(organizationId, entityType)` — ordered list for a dropdown/board.
- `getDefaultStatus(organizationId, entityType)` — used by Quick Entry.
- `transition(record, toStatusId, { backdatedAt?, actor })` — writes the status-history row (live or `manual_backfill`) and fires the domain events in §7.

This is what lets Phase 1 ship the exact status lists from `product_requirements.md` §9 as seed data while keeping the code generic enough that a Phase 8 tenant can rename/reorder them without a redeploy.

## 6. Integration provider interfaces (prepared, not built)

Per the explicit requirement not to build fake integrations, these are **TypeScript interfaces with zero live implementations** beyond a `manual` provider that already backs the v1 UI (i.e., a human typing something in *is* the v1 "provider"):

```ts
interface MessagingProvider {
  sendMessage(to: CustomerContact, body: string, attachments?: FileRef[]): Promise<MessageRef>;
  fetchNewMessages(since: Date): Promise<InboundMessage[]>;
}
// implementations, none built in v1: InstagramProvider, SmsProvider, GmailProvider, MessengerProvider, WhatsAppProvider

interface CommerceProvider {
  fetchOrders(since: Date): Promise<ExternalOrder[]>;
  fetchInventory(): Promise<ExternalInventoryLevel[]>;
}
// implementations, none built in v1: ShopifyProvider, TikTokShopProvider

interface PaymentProvider {
  createCheckout(amount: Money, ref: PaymentRef): Promise<CheckoutSession>;
  handleWebhook(payload: unknown): Promise<PaymentEvent>;
}
// implementation, none built in v1: StripeProvider

interface ShippingProvider {
  createLabel(order: Order): Promise<ShippingLabel>;
  trackShipment(trackingNumber: string): Promise<TrackingStatus>;
}
// no implementation planned for v1 scope
```

`integration_connections` (see `data_model.md`) exists so the Settings screen can show "Instagram — Not Connected" honestly today, without a single line of provider-specific code running. When a real integration is built later, it plugs into the same `server/domain` functions manual entry already calls (e.g., an inbound Instagram DM becomes a `messages` row through the identical `logCommunication()` domain function the "paste a message" UI uses) — no parallel data path.

## 7. Domain events / activity logging

Domain functions that mutate state emit a structured event consumed by two listeners: `activity_logs` writer and the in-app `notifications` writer. This keeps "every important action creates an activity entry" (source spec) true by construction rather than by remembering to log at every call site — one `emit()` call per domain function.

## 8. File storage

Supabase Storage, one bucket per organization (or a shared bucket with `organization_id`-prefixed paths — decided at implementation time based on Supabase project limits, functionally equivalent for isolation purposes since access is always mediated by signed URLs, never public bucket policy). `attachments.visibility` gates whether a given file's signed URL is issuable to a portal-scoped request; see `security.md`.

## 9. Realtime (Phase 8+, not MVP-blocking)

Supabase Realtime subscriptions on `orders`, `tasks`, and `notifications` can later drive live dashboard updates without polling. Not required for MVP — the dashboard refetches on navigation/interval in v1, which is sufficient for a 1-3 person team.

## 10. API surface

Next.js Server Actions are the default mutation path (co-located with the form that calls them, typed end-to-end). Route Handlers (`app/api/...`) are reserved for: the customer portal's token-authenticated endpoints (which can't rely on a logged-in Supabase session), and future webhook receivers for integrations. Both paths funnel into the same `server/domain` functions — there is exactly one implementation of "approve a proof," reachable from a Server Action (staff-initiated on their behalf) or a Route Handler (customer-portal-initiated).

## 11. Why this shape

- Separating `domain` from `data` means business rules (e.g., "you can't move to In Production if a required proof is unapproved") are unit-testable without a database, satisfying the "tests for important business logic" coding standard.
- The workflow-engine indirection is the single piece of complexity added ahead of strict necessity in this codebase, and it's justified twice over: it's required by the "no hardcoded statuses" standard today, and it's required by the multi-tenant SaaS goal later — building it once now avoids a schema migration under a live tenant in the future.
- Everything else follows the "don't build for hypothetical futures" principle: no Stripe code, no Shopify client, no message queue, no multi-region — until a real need forces it.
