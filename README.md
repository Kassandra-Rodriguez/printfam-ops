# PrintFam Ops

Customer requests, custom orders, product orders, and repair jobs in one place — built
first for PrintFam, architected as multi-tenant SaaS from day one. See `docs/` for the
full product/design/architecture spec; this file covers running the code.

Planning documents (read these before making product or architecture decisions):
`docs/product_requirements.md`, `docs/user_roles.md`, `docs/user_flows.md`,
`docs/screens.md`, `docs/data_model.md`, `docs/architecture.md`, `docs/security.md`,
`docs/mobbin_research.md`, `docs/design_system.md`, `docs/build_phases.md`.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript (strict) · Supabase (Postgres, Auth,
Storage) · Tailwind CSS v4 · shadcn/ui · React Hook Form + Zod · TanStack Table · dnd-kit.

**Next.js 16 note**: `middleware.ts` is renamed to `proxy.ts` (`export function proxy`,
not `middleware`) — see `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`
if anything in Next's routing/caching APIs looks unfamiliar; this project already accounts
for the async `cookies()`/`params` changes from that upgrade.

## Prerequisites

- Node.js 20.9+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (installed on demand via `npx supabase`)
- Docker Desktop (or an equivalent Docker runtime) — required by `supabase start` for
  local development. **Local Supabase was not available in the environment this project
  was scaffolded in** (no Docker), so the migrations in `supabase/migrations/` have been
  reviewed carefully but not yet executed against a real Postgres instance. Run
  `supabase start && supabase db reset` as the first step in any environment that does
  have Docker, before relying on the schema.

## Setup

```bash
npm install
cp .env.local.example .env.local
```

### Local Supabase (recommended for development)

```bash
npx supabase start
```

This applies every migration in `supabase/migrations/` to a fresh local Postgres and
prints a `API URL`, `anon key`, and `service_role key`. Copy those into `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=<API URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
```

After changing a migration file, re-apply with:

```bash
npx supabase db reset
```

### Hosted Supabase project

Create a project at supabase.com, then push the schema:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Copy the Project URL / anon key / service_role key from Project Settings → API into
`.env.local`.

## Running the app

```bash
npm run dev
```

Visit `http://localhost:3000`. A fresh account is routed through `/signup` →
`/onboarding` (create an organization) → `/dashboard`. `create_organization_with_owner`
(see `supabase/migrations/0002_tenancy.sql`) makes the signing-up user that
organization's Owner and seeds the default status workflows from
`docs/product_requirements.md` §9 — there is no separate "seed my data" step needed to
start using the shell.

## What's built vs. not yet (Phases 2–3 of `docs/build_phases.md`)

Live: auth, organization creation, the full database schema with RLS on every tenant
table, the responsive app shell — plus, from Phase 3, the workflow this whole build
sequence was aimed at: customer creation (with duplicate-detection warnings), manual
order creation in both Quick Entry and Detailed Entry (including the "backfill history"
flow for entering an order that's already mid-production, with backdated statuses and
payments), the orders list and order detail page (status changes, payment recording,
file uploads, linked tasks), a standalone Tasks view, and a dashboard attention list
driven by real order/task data (overdue orders, due-soon orders, unpaid balances,
overdue/today's tasks).

Not yet: Requests, Repairs, Quotes, Inbox, Inventory, and Reports are each a real route
with an honest "ships in Phase N" state rather than a fake/dead control — per the coding
standard against placeholder actions that do nothing.

**Not yet runtime-verified.** This was built and scaffolded in an environment without
Docker, so — same caveat as the schema itself — everything above passes `npx tsc --noEmit`,
`npm run lint`, and a full `next build`, but has not been exercised against a live
Supabase instance or a real browser. Before trusting it: `npx supabase start`, `npm run
dev`, and walk through sign up → create org → create a customer → create an order (try
both Quick Entry and a backdated Detailed Entry order) → record a payment → add a task →
confirm it all shows up correctly on `/dashboard`.

## Testing

```bash
npm run lint
npx tsc --noEmit
npm run test:rls   # requires a running Supabase instance — see Prerequisites
```

`tests/rls/tenant-isolation.test.ts` is the automated check required by
`docs/security.md` #3: it creates two throwaway organizations and asserts neither can
read or write the other's rows, across the RLS patterns established in
`supabase/migrations/`. It needs real Postgres (local via `supabase start`, or a
disposable hosted project) and will fail fast with a clear message if
`NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` aren't set. This test is the
gate every later phase's migrations must keep passing — extend it as each new entity's
RLS policies ship, rather than writing a parallel test file per phase.

## Project structure

```
src/
  app/            Next.js routes (App Router) — presentation only
    (auth)/       login, signup
    (app)/        the authenticated shell — dashboard, customers, orders, ...
    onboarding/   organization creation
  components/
    ui/           shadcn/ui primitives
    app-shell/     sidebar, topbar, user menu
  server/
    domain/       business logic, framework-agnostic (per entity family)
    data/         Supabase-backed repositories
    authz/        session + org-context resolution, role checks
    integrations/  provider interfaces (none implemented — see docs/architecture.md #6)
  lib/
    supabase/     browser/server/service-role Supabase clients
    validation/   Zod schemas shared by forms and server actions
  proxy.ts        Next.js 16's renamed middleware — refreshes the Supabase session
supabase/
  migrations/     schema + RLS policies, one reviewable file per entity group
  policies/       README explaining where RLS actually lives (colocated in migrations)
tests/
  rls/            the tenant-isolation test and its Supabase test-tenant helpers
```

See `docs/architecture.md` for the reasoning behind this layering.
