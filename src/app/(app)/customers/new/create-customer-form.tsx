"use client";

import { useActionState, useRef } from "react";
import { AlertTriangle } from "lucide-react";
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
import { createCustomerAction } from "../actions";
import type { CreateCustomerResult } from "@/server/domain/customers/createCustomer";

export function CreateCustomerForm() {
  const [state, formAction, isPending] = useActionState<CreateCustomerResult | null, FormData>(
    createCustomerAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Card>
      <CardContent className="pt-6">
        <form ref={formRef} action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="displayName">Name</Label>
            <Input id="displayName" name="displayName" required autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" type="tel" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input id="instagram" name="instagram" placeholder="@handle" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="tiktok">TikTok</Label>
              <Input id="tiktok" name="tiktok" placeholder="@handle" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="preferredContactMethod">Preferred contact method</Label>
            <Select name="preferredContactMethod">
              <SelectTrigger id="preferredContactMethod" className="w-full">
                <SelectValue placeholder="Not set" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="in_person">In person</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={3} />
          </div>

          {state?.status === "error" ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}

          {state?.status === "duplicates" ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400" />
                <div className="flex flex-col gap-1">
                  <p className="font-medium text-amber-900 dark:text-amber-200">
                    This might already be a customer
                  </p>
                  <ul className="list-inside list-disc text-amber-800 dark:text-amber-300">
                    {state.matches.map((m) => (
                      <li key={m.customerId}>
                        {m.displayName} — matches on{" "}
                        {m.matchedOn.map((x) => x.kind).join(", ")}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <input type="hidden" name="acknowledgeDuplicates" value="true" />
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="mt-3"
                formAction={formAction}
              >
                Create as a new customer anyway
              </Button>
            </div>
          ) : (
            <Button type="submit" disabled={isPending} className="mt-2">
              {isPending ? "Creating…" : "Create customer"}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
