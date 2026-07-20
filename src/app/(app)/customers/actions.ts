"use server";

import { redirect } from "next/navigation";
import { requireOrgContext } from "@/server/authz/session";
import { createCustomer, type CreateCustomerResult } from "@/server/domain/customers/createCustomer";
import type { CreateCustomerInput } from "@/lib/validation/customers";

export async function createCustomerAction(
  _prevState: CreateCustomerResult | null,
  formData: FormData,
): Promise<CreateCustomerResult> {
  const ctx = await requireOrgContext();

  const result = await createCustomer(
    ctx.supabase,
    ctx.activeMembership.organization_id,
    {
      displayName: String(formData.get("displayName") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? ""),
      instagram: String(formData.get("instagram") ?? ""),
      tiktok: String(formData.get("tiktok") ?? ""),
      preferredContactMethod:
        ((formData.get("preferredContactMethod") as string) || undefined) as
          | CreateCustomerInput["preferredContactMethod"]
          | undefined,
      notes: String(formData.get("notes") ?? ""),
    },
    formData.get("acknowledgeDuplicates") === "true",
  );

  if (result.status === "created") {
    redirect(`/customers/${result.customer.id}`);
  }

  return result;
}
