"use client";

import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity, Bell, CalendarDays, ChevronDown, HeartPulse, LayoutDashboard,
  LogOut, LoaderCircle, Menu, PanelLeftClose, PanelLeftOpen, Search,
  Stethoscope, Users,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { CommandMenu } from "@/components/command-menu";
import { authKeys } from "@/features/auth/auth.queries";
import type { Admin } from "@/features/auth/auth.types";
import { useAppUiStore } from "@/providers/app-ui-provider";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Doctors", href: "/doctors", icon: Stethoscope },
  { label: "Patients", href: "/patients", icon: Users },
  { label: "Appointments", href: "/appointments", icon: CalendarDays },
];

function Navigation({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main navigation" className="space-y-1">
      {!collapsed && <p className="px-3 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Workspace</p>}
      {navigation.map((item) => {
        const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            title={collapsed ? item.label : undefined}
            className={cn(
              "flex h-10 items-center gap-3 rounded-lg text-[13px] font-medium transition-colors duration-150 ease-out active:scale-[0.98]",
              collapsed ? "justify-center px-2" : "px-3",
              active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <item.icon className="size-[17px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
            <span className={collapsed ? "sr-only" : ""}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children, admin }: Readonly<{ children: React.ReactNode; admin: Admin }>) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const sidebarCollapsed = useAppUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useAppUiStore((state) => state.toggleSidebar);
  const mobileNavigationOpen = useAppUiStore((state) => state.mobileNavigationOpen);
  const setMobileNavigationOpen = useAppUiStore((state) => state.setMobileNavigationOpen);
  const setCommandMenuOpen = useAppUiStore((state) => state.setCommandMenuOpen);
  const section = pathname === "/" ? "Overview" : pathname.startsWith("/doctors") ? "Doctors" : pathname.startsWith("/patients") ? "Patients" : pathname.startsWith("/appointments") ? "Appointments" : "Workspace";

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandMenuOpen(true);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [setCommandMenuOpen]);

  const logoutMutation = useMutation({
    mutationFn: () => apiFetch<{ success: true }>("/auth/logout", { method: "POST" }),
    onSuccess: () => {
      queryClient.setQueryData(authKeys.currentAdmin, null);
      queryClient.removeQueries();
      router.replace("/login");
      toast.success("You have been signed out.");
    },
    onError: () => toast.error("Unable to sign out. Please try again."),
  });

  const initials = admin?.email.slice(0, 2).toUpperCase() ?? "AD";

  return (
    <div className="min-h-screen">
      <aside className={cn(
        "fixed inset-y-0 left-0 z-30 hidden border-r bg-card px-3 py-5 transition-[width] duration-200 ease-out motion-reduce:transition-none lg:block",
        sidebarCollapsed ? "w-[76px]" : "w-[248px] px-4",
      )}>
        <div className={cn("flex items-center", sidebarCollapsed ? "justify-center" : "justify-between px-1")}>
          <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="Careflow home">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <HeartPulse className="size-5" />
            </div>
            {!sidebarCollapsed && <div className="min-w-0">
              <p className="text-[15px] font-semibold tracking-tight">Care<span className="text-primary">flow</span></p>
              <p className="text-[10px] text-muted-foreground">CLINIC ADMINISTRATION</p>
            </div>}
          </Link>
          {!sidebarCollapsed && (
            <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={toggleSidebar} aria-label="Collapse sidebar" title="Collapse sidebar">
              <PanelLeftClose className="size-4" />
            </Button>
          )}
        </div>
        {sidebarCollapsed && (
          <Button variant="ghost" size="icon" className="mx-auto mt-5 flex size-9" onClick={toggleSidebar} aria-label="Expand sidebar" title="Expand sidebar">
            <PanelLeftOpen className="size-4" />
          </Button>
        )}
        <div className={sidebarCollapsed ? "mt-5" : ""}>
          <Navigation collapsed={sidebarCollapsed} />
        </div>
        {!sidebarCollapsed && <div className="absolute bottom-5 left-4 right-4 rounded-xl border bg-muted/50 p-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><Activity className="size-4" /></div>
            <div><p className="text-xs font-medium">API connected</p><p className="text-[10px] text-muted-foreground">Session verified</p></div>
          </div>
        </div>}
      </aside>

      <div data-sidebar-collapsed={sidebarCollapsed} className="app-shell-content transition-[padding] duration-200 ease-out motion-reduce:transition-none">
        <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b bg-background/95 px-4 backdrop-blur sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <Sheet open={mobileNavigationOpen} onOpenChange={setMobileNavigationOpen}>
              <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation"><Menu className="size-5" /></Button>} />
              <SheetContent side="left" className="w-[270px] p-5">
                <Link href="/" onClick={() => setMobileNavigationOpen(false)} className="flex items-center gap-3"><HeartPulse className="size-6 text-primary" /><span className="font-semibold">Careflow</span></Link>
                <Navigation onNavigate={() => setMobileNavigationOpen(false)} />
              </SheetContent>
            </Sheet>
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-xs text-muted-foreground">Workspace / <span className="text-foreground">{section}</span></p>
              <p className="text-sm font-semibold tracking-tight">Welcome back</p>
            </div>
            <div className="sm:hidden"><p className="text-sm font-semibold">Careflow</p></div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              className="hidden h-9 w-[220px] justify-between border-border/80 bg-muted/40 px-3 text-xs font-normal text-muted-foreground shadow-none hover:bg-muted md:flex"
              onClick={() => setCommandMenuOpen(true)}
              aria-haspopup="dialog"
              aria-label="Search workspace, shortcut Control K"
            >
              <span className="flex items-center gap-2"><Search className="size-3.5" />Search workspace...</span>
              <kbd className="rounded border bg-background px-1.5 py-0.5 text-[10px]">⌘ K</kbd>
            </Button>
            <Button variant="ghost" size="icon" className="size-9 md:hidden" onClick={() => setCommandMenuOpen(true)} aria-label="Search workspace"><Search className="size-[17px]" /></Button>
            <Button variant="ghost" size="icon" className="relative size-9" aria-label="Notifications"><Bell className="size-[17px]" /></Button>
            <div className="hidden h-7 w-px bg-border sm:block" />
            <Avatar className="size-8"><AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials}</AvatarFallback></Avatar>
            <div className="hidden max-w-[180px] sm:block"><p className="truncate text-xs font-medium">{admin?.email ?? "Administrator"}</p><p className="text-[10px] text-muted-foreground">Administrator</p></div>
            <Button variant="ghost" size="icon" className="size-9" title="Sign out" aria-label="Sign out" disabled={logoutMutation.isPending} onClick={() => logoutMutation.mutate()}>
              {logoutMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <LogOut className="size-4" />}
            </Button>
            <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" />
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] px-4 py-7 sm:px-7 lg:px-9">{children}</main>
      </div>
      <CommandMenu />
    </div>
  );
}
