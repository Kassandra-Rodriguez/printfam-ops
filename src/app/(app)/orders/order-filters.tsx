"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Bookmark, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createSavedFilterAction, deleteSavedFilterAction } from "@/app/(app)/saved-filters/actions";
import type { SavedFilterRow } from "@/server/data/savedFilters";

const ORDER_TYPES = [
  { value: "custom", label: "Custom" },
  { value: "existing_product", label: "Existing product" },
  { value: "bulk", label: "Bulk" },
  { value: "service", label: "Service" },
];
const STATUS_CATEGORIES = [
  { value: "neutral", label: "Neutral" },
  { value: "info", label: "In progress" },
  { value: "warning", label: "Needs attention" },
  { value: "danger", label: "Cancelled/at risk" },
  { value: "success", label: "Done" },
];
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
];

export function OrderFilters({ savedFilters }: { savedFilters: SavedFilterRow[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [filterName, setFilterName] = useState("");

  const orderType = searchParams.get("orderType") ?? "";
  const statusCategory = searchParams.get("statusCategory") ?? "";
  const source = searchParams.get("source") ?? "";
  const hasActiveFilters = Boolean(orderType || statusCategory || source);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  function applyFilterParams(params: Record<string, string>) {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) next.set(key, value);
    router.push(`${pathname}?${next.toString()}`);
  }

  function clearAll() {
    router.push(pathname);
  }

  function saveCurrentFilter() {
    if (!filterName.trim()) return;
    const params: Record<string, string> = {};
    if (orderType) params.orderType = orderType;
    if (statusCategory) params.statusCategory = statusCategory;
    if (source) params.source = source;

    startTransition(async () => {
      await createSavedFilterAction("orders", filterName.trim(), params, "/orders");
      setFilterName("");
      toast.success("Filter saved");
      router.refresh();
    });
  }

  function removeSavedFilter(id: string) {
    startTransition(async () => {
      await deleteSavedFilterAction(id, "/orders");
      router.refresh();
    });
  }

  return (
    <div className="mb-4 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={orderType || "all"} onValueChange={(v: string) => setParam("orderType", v === "all" ? "" : v)}>
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {ORDER_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusCategory || "all"} onValueChange={(v: string) => setParam("statusCategory", v === "all" ? "" : v)}>
          <SelectTrigger className="h-8 w-48 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            {STATUS_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={source || "all"} onValueChange={(v: string) => setParam("source", v === "all" ? "" : v)}>
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any source</SelectItem>
            {SOURCES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters ? (
          <Button size="sm" variant="ghost" onClick={clearAll}>
            <X className="size-3.5" />
            Clear
          </Button>
        ) : null}

        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline">
              <Bookmark className="size-3.5" />
              Saved filters
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="flex flex-col gap-3">
            {savedFilters.length === 0 ? (
              <p className="text-xs text-muted-foreground">No saved filters yet.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {savedFilters.map((f) => (
                  <div key={f.id} className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-muted">
                    <button type="button" className="flex-1 text-left" onClick={() => applyFilterParams(f.filter_params)}>
                      {f.name}
                    </button>
                    <button type="button" disabled={isPending} onClick={() => removeSavedFilter(f.id)}>
                      <Trash2 className="size-3.5 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {hasActiveFilters ? (
              <div className="flex flex-col gap-1.5 border-t pt-2">
                <Input
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  placeholder="Name this filter"
                  className="h-8 text-xs"
                />
                <Button size="sm" disabled={isPending || !filterName.trim()} onClick={saveCurrentFilter}>
                  Save current filter
                </Button>
              </div>
            ) : null}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
