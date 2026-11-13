"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string; description?: string };

export function SearchableSelect({
  value, onValueChange, options, placeholder = "Select an option…", searchPlaceholder = "Search…", emptyMessage = "No matches found.", disabled = false, id,
}: {
  value: string; onValueChange: (value: string) => void; options: Option[];
  placeholder?: string; searchPlaceholder?: string; emptyMessage?: string; disabled?: boolean; id?: string;
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const listId = `${inputId}-listbox`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return normalized ? options.filter((option) => `${option.label} ${option.description ?? ""}`.toLocaleLowerCase().includes(normalized)) : options;
  }, [options, query]);
  const selected = options.find((option) => option.value === value);

  function close() { setOpen(false); setQuery(""); setActiveIndex(0); }
  function choose(option: Option) { onValueChange(option.value); close(); }

  return (
    <div className="relative">
      <button type="button" id={inputId} disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-controls={listId}
        onClick={() => { setOpen((current) => !current); setQuery(""); setActiveIndex(0); requestAnimationFrame(() => inputRef.current?.focus()); }}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-md border bg-background px-3 text-left text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50">
        <span className={cn("truncate", !selected && "text-muted-foreground")}>{selected?.label ?? placeholder}</span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>
      {open && <>
        <button type="button" aria-label="Close options" className="fixed inset-0 z-40 cursor-default" onClick={close} />
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg">
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input ref={inputRef} role="combobox" aria-expanded="true" aria-controls={listId} aria-autocomplete="list" aria-label={searchPlaceholder}
              value={query} onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((index) => Math.min(index + 1, filtered.length - 1)); }
                else if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => Math.max(0, index - 1)); }
                else if (event.key === "Enter" && filtered[activeIndex]) { event.preventDefault(); choose(filtered[activeIndex]!); }
                else if (event.key === "Escape") { event.preventDefault(); close(); }
              }}
              placeholder={searchPlaceholder} className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          </div>
          <div id={listId} role="listbox" aria-label="Available options" className="max-h-56 overflow-y-auto p-1">
            {filtered.length ? filtered.map((option, index) => <button key={option.value} type="button" role="option" aria-selected={option.value === value}
              onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(option)}
              className={cn("flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm", index === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted")}>
              <span className="min-w-0 flex-1"><span className="block truncate">{option.label}</span>{option.description && <span className="block truncate text-xs text-muted-foreground">{option.description}</span>}</span>
              {option.value === value && <Check className="size-4 shrink-0" />}
            </button>) : <p className="px-3 py-6 text-center text-xs text-muted-foreground">{emptyMessage}</p>}
          </div>
        </div>
      </>}
    </div>
  );
}
