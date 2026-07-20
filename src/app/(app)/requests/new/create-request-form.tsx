"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createRequestAction } from "../actions";

const SOURCES = [
  { value: "instagram", label: "Instagram" },
  { value: "text", label: "Text" },
  { value: "shopify", label: "Shopify" },
  { value: "tiktok", label: "TikTok Shop" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "in_person", label: "In person" },
  { value: "returning_customer", label: "Returning customer" },
  { value: "other", label: "Other" },
] as const;

export function CreateRequestForm({
  customers,
  defaultCustomerId,
}: {
  customers: { id: string; name: string }[];
  defaultCustomerId?: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    setError(null);

    const result = await createRequestAction({
      customerId: formData.get("customerId") as string,
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || undefined,
      source: formData.get("source") as (typeof SOURCES)[number]["value"],
      estimatedValue: (formData.get("estimatedValue") as string) || undefined,
      followUpDate: (formData.get("followUpDate") as string) || undefined,
    });

    setSubmitting(false);
    if (result.status === "error") {
      setError(result.error);
      return;
    }
    router.push(`/requests/${result.requestId}`);
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Customer</Label>
            <Select name="customerId" defaultValue={defaultCustomerId} required>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required placeholder="e.g. Bulk keychains for a wedding" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>Source</Label>
              <Select name="source" defaultValue="text" required>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="estimatedValue">Estimated value</Label>
              <Input id="estimatedValue" name="estimatedValue" type="number" step="0.01" min="0" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="followUpDate">Follow up on</Label>
            <Input id="followUpDate" name="followUpDate" type="date" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Notes</Label>
            <Textarea id="description" name="description" rows={3} />
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={submitting} className="mt-2 self-start">
            {submitting ? "Creating…" : "Create request"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
