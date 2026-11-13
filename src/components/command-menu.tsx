"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, LayoutDashboard, Search, Stethoscope, Users, UserPlus, CalendarPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppUiStore } from "@/providers/app-ui-provider";
import { cn } from "@/lib/utils";

const destinations = [
  { label: "Overview", description: "Practice summary and activity", href: "/", keywords: "dashboard home", icon: LayoutDashboard, group: "Navigate" },
  { label: "Doctors", description: "Manage your medical team", href: "/doctors", keywords: "physicians staff clinicians", icon: Stethoscope, group: "Navigate" },
  { label: "Patients", description: "Patient directory and records", href: "/patients", keywords: "people clients records", icon: Users, group: "Navigate" },
  { label: "Appointments", description: "Schedule and manage visits", href: "/appointments", keywords: "calendar bookings visits", icon: CalendarDays, group: "Navigate" },
  { label: "Add doctor", description: "Create a doctor profile", href: "/doctors?action=create", keywords: "new doctor physician clinician create", icon: UserPlus, group: "Create" },
  { label: "Add patient", description: "Register a new patient", href: "/patients?action=create", keywords: "new patient register create", icon: UserPlus, group: "Create" },
  { label: "Book appointment", description: "Schedule a patient visit", href: "/appointments?action=create", keywords: "new appointment booking schedule visit", icon: CalendarPlus, group: "Create" },
];

export function CommandMenu() {
  const open = useAppUiStore((state) => state.commandMenuOpen);
  const setOpen = useAppUiStore((state) => state.setCommandMenuOpen);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return destinations;
    return destinations.filter((item) =>
      `${item.label} ${item.description} ${item.keywords}`.toLowerCase().includes(normalized),
    );
  }, [query]);
  const activeItem = filtered[activeIndex];

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen);
      if (!nextOpen) setQuery("");
    }}>
      <DialogContent className="top-[22%] max-w-[min(92vw,34rem)] translate-y-0 gap-0 overflow-hidden p-0 sm:top-[20%]" showCloseButton={false}>
        <DialogTitle className="sr-only">Search the workspace</DialogTitle>
        <DialogDescription className="sr-only">Find a workspace page in Doctor Tracker.</DialogDescription>
        <div className="flex items-center gap-3 border-b px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((index) => Math.min(index + 1, filtered.length - 1)); }
              else if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => Math.max(0, index - 1)); }
              else if (event.key === "Enter" && activeItem) { event.preventDefault(); window.location.assign(activeItem.href); setOpen(false); }
            }}
            placeholder="Search workspace pages..."
            aria-label="Search workspace pages"
            className="h-14 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
          <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">ESC</kbd>
        </div>
        <div className="max-h-[min(55vh,22rem)] overflow-y-auto p-2" role="group" aria-label="Workspace commands">
          {filtered.length ? filtered.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={(event) => {
                setOpen(false);
                if (item.group === "Create") { event.preventDefault(); window.location.assign(item.href); }
              }}
              aria-current={index === activeIndex ? "true" : undefined}
              className={cn("flex items-center gap-3 rounded-lg px-3 py-3 outline-none transition-colors", index === activeIndex ? "bg-muted" : "hover:bg-muted") }
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-card text-muted-foreground">
                <item.icon className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{item.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
              </span>
              <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
            </Link>
          )) : (
            <p className="px-3 py-10 text-center text-sm text-muted-foreground">No pages match “{query}”. Try another search.</p>
          )}
        </div>
        <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-2.5 text-[10px] text-muted-foreground">
          <span>DOCTOR TRACKER</span>
          <span>↑↓ to navigate · Enter to open · Esc to close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
