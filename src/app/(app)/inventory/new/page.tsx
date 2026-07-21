import { requireOrgContext } from "@/server/authz/session";
import { CreateProductForm } from "./create-product-form";

export default async function NewProductPage() {
  await requireOrgContext();

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="text-lg font-semibold">New product</h1>
      <div className="mt-6">
        <CreateProductForm />
      </div>
    </div>
  );
}
