# Security — PrintFam Ops

## 1. Authentication

- Supabase Auth (email/password + magic link). `users.id` mirrors `auth.users.id`.
- Session resolves to an **active organization** (`organization_members` row) stored server-side per request — never trust an `organization_id` passed from the client in a form field or query param for authorization purposes; it may be used as a display convenience but every write re-derives the org from the session.
- Customers are **not** Supabase Auth users in v1 — see §4, portal access is token-based by design (no account creation friction for a one-off proof approval).

## 2. Authorization (RBAC)

- Enforced in `server/authz` (see `architecture.md` §4), called from every Server Action / Route Handler before a mutation. Role definitions and the full matrix live in `user_roles.md`.
- **Defense in depth, not defense-in-one-place**: the same check exists at the RLS layer (§3) and the application layer, so a bug in one doesn't expose the other's gap.
- Team Member's "assigned records only" scope is enforced as a query filter (`assigned_user_id = current_user_id() OR EXISTS (assignment)`), not as a post-fetch filter — an unassigned record must never leave the database in the response.

## 3. Row Level Security (tenant isolation)

- RLS is **on** for every tenant-owned table from the first migration; there is no "add RLS later" phase.
- Policy pattern:
  ```sql
  create policy org_isolation on orders
    using (organization_id = current_org_id())
    with check (organization_id = current_org_id());
  ```
  `current_org_id()` is a `security definer` SQL function reading the caller's active membership (JWT claim or session lookup, decided at implementation time — either is acceptable as long as it can't be forged from the client).
- Role-sensitive columns (e.g., `products.cost`) are additionally protected by a **column-level view** exposed to Team Member/Customer contexts that omits them, rather than relying on the client to not request the field — a raw `select *` from a lower-privileged context must not be able to retrieve cost/margin data even by accident.
- **Verification requirement** (ties to `product_requirements.md` MVP acceptance criteria): an automated test creates two organizations and asserts that no cross-organization read or write succeeds for any table, run in CI before every deploy.

## 4. Customer portal token security

`portal_access_tokens` (see `data_model.md`) is the entire trust boundary for unauthenticated customer access. Rules:

1. **Scoped, not general-purpose.** A token grants access to exactly one `(scope_type, scope_id)` pair — one order, one quote, one proof, or one repair ticket. It is never a "log into this customer's account" token. This directly satisfies the requirement that a customer can approve a proof without a full account while guaranteeing they can't browse to a different record.
2. **Never store the raw token.** Only `token_hash` (e.g., SHA-256 of a cryptographically random 32-byte value) is persisted; the raw value exists only in the URL sent to the customer and briefly in memory at issuance.
3. **Expiring.** `expires_at` is required at issuance (default: 14 days, configurable per send in the UI). Expired tokens fail closed with the explicit "this link has expired" state from `screens.md` #23 — never a generic 500 or, worse, silent access.
4. **Revocable.** `revoked_at` lets staff invalidate a link immediately (e.g., sent to the wrong person) without waiting for expiry.
5. **Single-record IDOR prevention.** Every portal Route Handler validates `token → (organization_id, scope_type, scope_id)` server-side and scopes *every subsequent query in that request* to that exact tuple — including nested reads (e.g., a proof's order context is fetched via the token's own `scope_id`, never via a client-supplied order id in the URL). Guessing or incrementing an ID in the URL cannot expand access, because the ID in the URL is never trusted; only the token's server-resolved scope is.
6. **Portal writes go through the same domain functions as staff writes** (`architecture.md` §10) with the actor tagged `actor_type = 'customer'` — there is no parallel, less-audited write path.
7. **Rate limiting** on portal endpoints (§8) specifically covers token brute-forcing, since a 32-byte random token is only as safe as the endpoint's tolerance for guessing attempts.

## 5. File security

- All uploads validated server-side: allow-listed MIME types per context (images/PDF/common design files for proofs; broader but still allow-listed for general attachments), max size enforced before a Storage write is issued.
- `attachments.visibility` (`internal_only` / `customer_visible`) is enforced at the query layer that generates signed URLs — a portal request can only receive a signed URL for an attachment that is both `customer_visible` **and** linked to the token's exact scoped record. Internal notes, internal-only proof drafts, and files on unrelated records are never reachable, even by a crafted request with a valid token for a *different* record on the same order.
- Signed URLs are short-lived (minutes, not days) and generated per-request, not cached/stored.
- Virus/malware scanning on upload is noted as a future hardening step, not built in v1 — flagged here rather than silently skipped.

## 6. Audit logging

- `activity_logs` is append-only (no application code path issues an UPDATE or DELETE against it).
- Every domain mutation emits one entry (`architecture.md` §7): actor, action, entity, before/after metadata, timestamp. This is the record that answers "who approved this," "who recorded this payment," and "who changed this status and when" — including for `manual_backfill`-sourced historical entries, which are explicitly tagged so a real audit trail is never confused with a synthesized one.
- Financial mutations (payments, cost fields) are never excluded from logging on the theory that they're "sensitive" — sensitivity is handled by *who can read* the log (`user_roles.md`: Manager/Team Member see activity without cost/profit fields), not by omitting the write.

## 7. Input validation

- Every mutation boundary (Server Action, Route Handler) validates input against a Zod schema shared with the client form — the client schema is a UX convenience (instant feedback), the server schema is the actual gate. A request that bypasses the UI entirely (e.g., a crafted fetch) still hits the same Zod parse before touching `server/domain`.
- Numeric fields (amounts, quantities) are validated for range/sign server-side regardless of client-side `<input type="number">` constraints, which are trivially bypassable.

## 8. Rate limiting

- Applied at minimum to: authentication endpoints (login, magic link request), customer portal token validation, and portal write actions (message send, file upload, approval). Implementation is a standard IP+token-bucket approach at the edge (Vercel) or in a lightweight middleware — exact mechanism is an implementation detail deferred to Phase 2, but the requirement is locked in now so it isn't skipped under deadline pressure later.

## 9. Insecure direct object reference (IDOR) prevention

- **Staff-side**: every record fetch by ID passes through a repository function that includes the organization filter in the same query (`where id = $1 and organization_id = $2`), never a bare `where id = $1` followed by an application-layer ownership check — the two-step version is exactly the pattern that produces IDOR bugs when someone forgets the second step on one code path.
- **Portal-side**: covered in §4.5 — the token, not the URL, is the sole source of the record ID for every query in that request.

## 10. Secrets & environment variables

- Supabase service-role key, Stripe keys (future), and any provider API keys live only in server-side environment variables, never exposed to client bundles (`NEXT_PUBLIC_*` is reserved exclusively for genuinely public values like the Supabase anon key + URL).
- No secret is ever logged, including in `activity_logs` metadata or error messages surfaced to the client.

## 11. What's explicitly deferred (documented, not silently skipped)

- Malware scanning on file upload.
- SSO / SAML for larger future SaaS tenants.
- Fine-grained per-Team-Member permission overrides beyond the flat role model.
- A formal penetration test — recommended before onboarding any external paying tenant, out of scope for the PrintFam-internal MVP.
