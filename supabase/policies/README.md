# RLS policies

Per `docs/architecture.md`, Row Level Security policies are "reviewed as code." In practice
they live **colocated with the table that owns them**, directly in the migration file that
creates that table (`supabase/migrations/000N_*.sql`), immediately after the table and its
indexes — not duplicated in this directory.

Colocating avoids the alternative failure mode: a policy defined here and a second,
possibly-drifted copy applied by the actual migration. One file, one source of truth per
table.

This directory is kept as the place future integration- or portal-specific policy
*documentation* (not SQL) can live as the app grows past Phase 2 — e.g. a written
walkthrough of the customer-portal service-role bypass pattern once Phase 6/7 build it out.
