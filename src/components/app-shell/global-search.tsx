"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { globalSearchAction } from "@/app/(app)/search/actions";
import type { SearchResultGroup } from "@/server/data/search";

/** docs/screens.md #1: "Global search (⌘K-style) is top-bar, always visible." */
export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<SearchResultGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const result = await globalSearchAction(query);
      setGroups(result);
      setLoading(false);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const visibleGroups = query.trim().length >= 2 ? groups : [];

  function go(href: string) {
    setOpen(false);
    setQuery("");
    setGroups([]);
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative ml-auto hidden max-w-sm flex-1 items-center rounded-md border bg-background px-2.5 py-1.5 text-left text-sm text-muted-foreground md:flex"
      >
        <Search className="mr-2 size-4" />
        Search…
        <kbd className="ml-auto rounded border bg-muted px-1.5 py-0.5 text-xs">⌘K</kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-24 translate-y-0 sm:max-w-md" showCloseButton={false}>
          <DialogTitle className="sr-only">Search</DialogTitle>
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customers, orders, requests, repairs…"
          />
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <p className="px-1 py-4 text-center text-sm text-muted-foreground">Searching…</p>
            ) : query.trim().length >= 2 && visibleGroups.length === 0 ? (
              <p className="px-1 py-4 text-center text-sm text-muted-foreground">No results.</p>
            ) : (
              visibleGroups.map((group) => (
                <div key={group.label} className="mb-2">
                  <p className="px-1 py-1 text-xs font-medium text-muted-foreground">{group.label}</p>
                  {group.results.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => go(r.href)}
                      className="flex w-full flex-col items-start rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                    >
                      <span>{r.title}</span>
                      {r.subtitle ? <span className="text-xs text-muted-foreground">{r.subtitle}</span> : null}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
