import { CreateCustomerForm } from "./create-customer-form";

export default function NewCustomerPage() {
  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="text-lg font-semibold">New customer</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Only the name is required — add what you know now, fill in the rest later.
      </p>
      <div className="mt-6">
        <CreateCustomerForm />
      </div>
    </div>
  );
}
