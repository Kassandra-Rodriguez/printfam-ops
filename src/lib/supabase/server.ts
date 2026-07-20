import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client for Server Components, Server Actions, and Route
 * Handlers. `cookies()` is async as of Next.js 16 (docs/architecture.md — Async
 * Request APIs). Every table this client touches is still protected by RLS
 * (docs/security.md #3); this client authenticates as the signed-in user, not
 * the service role.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component that can't set cookies — safe to
            // ignore because the proxy (src/proxy.ts) refreshes the session on
            // every navigation regardless.
          }
        },
      },
    },
  );
}

/**
 * Service-role client for code paths that must intentionally bypass RLS:
 * the customer portal (docs/security.md #4 — the token, not a Supabase
 * session, is the trust boundary there) and the `auth.users` mirror trigger's
 * counterparts in application code, if any are ever needed outside SQL.
 * Never imported into anything that runs in the browser.
 */
export function createServiceRoleSupabaseClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // Service-role client is never session-based; nothing to persist.
        },
      },
    },
  );
}
