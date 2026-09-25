"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useInfiniteOptions } from "@/hooks/use-infinite-options";
import type { Paginated } from "@/types/pagination";

interface InfiniteComboboxProps<T> {
  /** Stable query key prefix, e.g. ["customers", "picker"]. */
  queryKey: readonly unknown[];
  /** Fetch one page of options; `search` is debounced. */
  fetchPage: (args: {
    page: number;
    limit: number;
    search?: string;
  }) => Promise<Paginated<T>>;
  getOptionId: (option: T) => string;
  /** Row content inside the dropdown. */
  renderOption: (option: T) => React.ReactNode;
  /** Text used for the trigger once something is picked. */
  getOptionLabel: (option: T) => string;
  selectedId?: string;
  /** The selected option, when the caller already holds it (so the trigger can
   *  show a label for something that isn't on the loaded page). */
  selectedOption?: T | null;
  onSelect: (option: T) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Searchable dropdown that loads 10 options at a time and appends the next
 * batch as the list is scrolled, with the search running server-side.
 *
 * `shouldFilter={false}` on the Command is deliberate: cmdk would otherwise
 * also filter locally, which would hide server results that matched on a field
 * the visible label doesn't show (an email, say) and make later pages look
 * empty.
 */
export function InfiniteCombobox<T>({
  queryKey,
  fetchPage,
  getOptionId,
  renderOption,
  getOptionLabel,
  selectedId,
  selectedOption,
  onSelect,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyMessage = "No results found.",
  disabled,
  className,
}: InfiniteComboboxProps<T>) {
  const [open, setOpen] = React.useState(false);

  const {
    options,
    search,
    setSearch,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    fetchMore,
    sentinelRef,
  } = useInfiniteOptions<T>({
    queryKey,
    fetchPage,
    // Nothing is fetched until the dropdown is actually opened.
    enabled: open,
  });

  // Prefer the caller's selected option; fall back to the loaded page.
  const selected =
    selectedOption ??
    (selectedId
      ? options.find((o) => getOptionId(o) === selectedId)
      : undefined);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">
            {selected ? getOptionLabel(selected) : placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isLoading && options.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : error && options.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-sm">
                <span className="text-destructive">Failed to load options</span>
                <Button size="sm" variant="outline" onClick={fetchMore}>
                  Retry
                </Button>
              </div>
            ) : options.length === 0 ? (
              <CommandEmpty>{emptyMessage}</CommandEmpty>
            ) : (
              <CommandGroup>
                {options.map((option) => {
                  const id = getOptionId(option);
                  return (
                    <CommandItem
                      key={id}
                      value={id}
                      onSelect={() => {
                        onSelect(option);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          selectedId === id ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {renderOption(option)}
                    </CommandItem>
                  );
                })}

                {/* Crossing this sentinel pulls the next batch. Keeping the
                    already-loaded options mounted above it is the point —
                    loading more must never blank the list. */}
                {hasMore && (
                  <div
                    ref={sentinelRef}
                    className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Loading more…
                      </>
                    ) : error ? (
                      <Button size="sm" variant="ghost" onClick={fetchMore}>
                        Failed to load more — Retry
                      </Button>
                    ) : (
                      "Scroll for more"
                    )}
                  </div>
                )}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
