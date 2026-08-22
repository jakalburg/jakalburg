"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
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

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  /** Existing options to pick from. */
  options: string[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  /** When true (default) the typed text can be used as a new value. */
  allowCustom?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/**
 * Type-or-select combobox: filter the existing options by typing, pick one, or
 * (when allowCustom) commit whatever you typed as a brand-new value. Used for
 * product category and fabric, where the admin should reuse an existing entry
 * or add a fresh one inline.
 *
 * Custom filtering (shouldFilter={false}) so we can inject the "Use …" row.
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search or type…",
  emptyText = "No matches.",
  allowCustom = true,
  disabled,
  className,
  id,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const q = query.trim();
  const filtered = q
    ? options.filter((o) => o.toLowerCase().includes(q.toLowerCase()))
    : options;
  const exactMatch = options.some((o) => o.toLowerCase() === q.toLowerCase());
  const showCustom = allowCustom && q.length > 0 && !exactMatch;

  const commit = (val: string) => {
    onChange(val);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={searchPlaceholder}
          />
          <CommandList>
            {filtered.length === 0 && !showCustom && (
              <CommandEmpty>{emptyText}</CommandEmpty>
            )}
            {filtered.length > 0 && (
              <CommandGroup>
                {filtered.map((o) => (
                  <CommandItem key={o} value={o} onSelect={() => commit(o)}>
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === o ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {o}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {showCustom && (
              <CommandGroup>
                <CommandItem value={`__use__${q}`} onSelect={() => commit(q)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Use &ldquo;{q}&rdquo;
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default Combobox;
