# User Roles & Permissions — PrintFam Ops

## 1. Role summary

| Role | Who | Scope |
|---|---|---|
| **Owner** | Business owner (Kassandra at PrintFam) | Everything in their organization: settings, billing/subscription, users, financials, all records |
| **Manager** | Trusted staff running day-to-day ops | Customers, requests, orders, repairs, proofs, quotes, tasks, payments, communications — not org settings, users, or financial reports |
| **Team Member** | Staff doing assigned work | Only records assigned to them or explicitly shared; can update status, add notes/files, complete tasks — cannot see org-wide financials |
| **Customer** | External customer | Customer portal only — records explicitly shared with that customer, nothing else |

The v1 role set is intentionally flat (4 roles, no custom role builder) — enough for a small business and simple to reason about. The `roles`/`organization_members` tables are shaped so a custom-permission system can be added later (see `data_model.md`) without a schema migration that breaks existing orgs.

## 2. Permission matrix

Legend: **F** full (create/read/update/delete), **RW** read/write (create/read/update, no delete), **R** read-only, **A** assigned-only, **—** no access.

| Module | Owner | Manager | Team Member | Customer |
|---|---|---|---|---|
| Organization settings | F | — | — | — |
| Users & role assignment | F | — | — | — |
| Billing / subscription | F | — | — | — |
| Custom statuses / workflow config | F | — | — | — |
| Customers | F | RW | A (assigned records) | Own profile: R |
| Requests | F | RW | A | Own: R |
| Orders (all types) | F | RW | A (update status, add notes/files) | Own: R |
| Repair tickets | F | RW | A | Own: R |
| Quotes | F | RW | A | Own: R + approve/decline |
| Proofs | F | RW | A (upload, mark internal/customer-visible) | Own, customer-visible only: R + approve/request revision |
| Payments | F | RW | R (own assigned records) | Own: R (status/balance only, no method/reference internals) |
| Tasks | F | RW | A (own tasks: F) | — |
| Communications | F | RW | RW | Own thread: RW (send message only) |
| Files | F | RW | RW (visibility rules apply) | Customer-visible only: R + upload |
| Inventory | F | RW | R | — |
| Reports & analytics | F | R (no cost/profit) | — | — |
| Activity log | F (full, incl. financial) | R (no cost/profit) | R (own records) | — |
| Notifications | Own: F | Own: F | Own: F | Own (portal-relevant only): R |

## 3. Enforcement rules

1. **Never trust the client.** Every mutation is re-authorized server-side against the caller's `organization_members.role` and, for Team Member, an explicit assignment check — regardless of what the UI shows or hides. See `security.md`.
2. **Cost and profit fields** (`products.cost`, margin calculations) are excluded from any query path reachable by Team Member or Customer, not merely hidden in the UI.
3. **Assignment model for Team Member**: a record is "assigned" if the Team Member is the `orders.assigned_user_id` (or equivalent on requests/repairs/tasks) or is tagged as a collaborator via `activity_logs`/task assignment. Unassigned records are invisible in list views and return 403 on direct access, not just omitted from menus.
4. **Customer role is not a member of the organization.** Customers authenticate via portal tokens (see `security.md`), not `organization_members`. Their access is computed per-record from `portal_access_tokens`, never from a role check against the org.
5. **Owner is not "Manager + more" by convention** — Owner-only actions (deleting the organization, changing subscription, viewing full financial reports, editing workflow definitions) are checked explicitly, not inferred by "Manager can't, so Owner can."

## 4. Role assignment flow

- The user who creates an organization becomes its first Owner automatically.
- An Owner invites additional users by email; the invite specifies the role (Manager or Team Member) at send time and is changeable later only by an Owner.
- A user can belong to multiple organizations with a different role in each (`organization_members` is keyed by `(organization_id, user_id)`); the active organization is chosen at login/switch, and all queries are scoped to that single active org for the session.

## 5. Future extension (not built in v1)

- Per-Team-Member custom permission overrides (e.g., "can see financials but can't delete").
- A dedicated "Bookkeeper" or "Read-only Reports" role.
- Organization-level role name customization (e.g., renaming "Team Member" to "Technician" for a repair-focused tenant).

These are deferred, not designed against — the `roles` table stores a `key` and `label` separately so relabeling is trivial later; behavior changes (custom permissions) would need a proper policy table and are explicitly out of scope until there's a real customer asking for it.
