import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. RLS tests need a running Supabase instance — run ` +
        `\`supabase start\` (requires Docker) and copy its output into .env.local, ` +
        `or point these vars at a disposable test project. See README.md "Testing".`,
    );
  }
  return value;
}

export function serviceRoleClient(): SupabaseClient {
  return createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export type TestTenant = {
  client: SupabaseClient;
  userId: string;
  organizationId: string;
  email: string;
};

/**
 * Creates a fully confirmed user and a brand-new organization owned by them,
 * returning a Supabase client already authenticated as that user — exactly
 * the shape docs/security.md #3's isolation test needs two of.
 */
export async function createTestTenant(label: string): Promise<TestTenant> {
  const admin = serviceRoleClient();
  const email = `rls-test-${label}-${randomUUID()}@example.com`;
  const password = randomUUID();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    throw new Error(`Failed to create test user: ${createError?.message}`);
  }

  const client = createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) {
    throw new Error(`Failed to sign in test user: ${signInError.message}`);
  }

  const slug = `rls-test-${label}-${randomUUID().slice(0, 8)}`;
  const { data: org, error: orgError } = await client
    .rpc("create_organization_with_owner", { p_name: `RLS Test ${label}`, p_slug: slug })
    .single();
  if (orgError || !org) {
    throw new Error(`Failed to create test organization: ${orgError?.message}`);
  }

  return {
    client,
    userId: created.user.id,
    organizationId: (org as { id: string }).id,
    email,
  };
}

/** Deletes the auth user (cascades to organization_members) and their organization. */
export async function cleanupTestTenant(tenant: TestTenant) {
  const admin = serviceRoleClient();
  await admin.from("organizations").delete().eq("id", tenant.organizationId);
  await admin.auth.admin.deleteUser(tenant.userId);
}
