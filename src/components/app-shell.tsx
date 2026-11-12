"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity, Bell, ChevronDown, LayoutDashboard, Search, Settings2,
  Stethoscope, Users, HeartPulse, Menu, LogOut, LoaderCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { authKeys } from "@/features/auth/auth.queries";
import type { Admin } from "@/features/auth/auth.types";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Doctors", href: "/doctors", icon: Stethoscope },
  { label: "Patients", href: "/patients", icon: Users },
];

function Navigation() {
  const pathname = usePathname();
  return (
    <nav className="space-y-1">
      <p className="px-3 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Workspace</p>
      {navigation.map((item) => {
        const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        return (
          <Link key={item.href} href={item.href} className={cn(
            "flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors",
            active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}>
            <item.icon className="size-[17px]" strokeWidth={1.8} />
            {item.label}
          </Link>
        );
      })}
      <p className="px-3 pb-2 pt-7 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Manage</p>
      <Link href="/settings" className="flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
        <Settings2 className="size-[17px]" strokeWidth={1.8} /> Settings
      </Link>
    </nav>
  );
}

export function AppShell({ children, admin }: Readonly<{ children: React.ReactNode; admin: Admin }>) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

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
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] border-r bg-card px-4 py-5 lg:block">
        <Link href="/" className="flex items-center gap-3 px-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <HeartPulse className="size-5" />
          </div>
          <div>
            <p className="text-[15px] font-semibold tracking-tight">Care<span className="text-primary">flow</span></p>
            <p className="text-[10px] text-muted-foreground">CLINIC ADMINISTRATION</p>
          </div>
        </Link>
        <Navigation />
        <div className="absolute bottom-5 left-4 right-4 rounded-xl border bg-muted/50 p-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><Activity className="size-4" /></div>
            <div><p className="text-xs font-medium">API connected</p><p className="text-[10px] text-muted-foreground">Session verified</p></div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b bg-background/90 px-4 backdrop-blur-xl sm:px-7">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden"><Menu className="size-5" /></Button>} />
              <SheetContent side="left" className="w-[270px] p-5">
                <Link href="/" className="flex items-center gap-3"><HeartPulse className="size-6 text-primary" /><span className="font-semibold">Careflow</span></Link>
                <Navigation />
              </SheetContent>
            </Sheet>
            <div className="hidden sm:block">
              <p className="text-xs text-muted-foreground">Workspace / <span className="text-foreground">{pathname === "/" ? "Overview" : "Workspace"}</span></p>
              <p className="text-sm font-semibold tracking-tight">Welcome back</p>
            </div>
            <div className="sm:hidden"><p className="text-sm font-semibold">Careflow</p></div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative hidden w-[230px] md:block">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search anything..." className="h-9 border-0 bg-muted/70 pl-9 text-xs shadow-none focus-visible:ring-1" />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border bg-background px-1 text-[9px] text-muted-foreground">⌘ K</kbd>
            </div>
            <Button variant="ghost" size="icon" className="relative size-9" aria-label="Notifications"><Bell className="size-[17px]" /></Button>
            <div className="hidden h-7 w-px bg-border sm:block" />
            <Avatar className="size-8"><AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials}</AvatarFallback></Avatar>
            <div className="hidden max-w-[180px] sm:block"><p className="truncate text-xs font-medium">{admin?.email ?? "Administrator"}</p><p className="text-[10px] text-muted-foreground">Administrator</p></div>
            <Button
              variant="ghost"
              size="icon"
              className="size-9"
              title="Sign out"
              aria-label="Sign out"
              disabled={logoutMutation.isPending}
              onClick={() => logoutMutation.mutate()}
            >
              {logoutMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <LogOut className="size-4" />}
            </Button>
            <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" />
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] px-4 py-7 sm:px-7 lg:px-9">{children}</main>
      </div>
    </div>
  );
}
