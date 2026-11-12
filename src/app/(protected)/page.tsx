import { Suspense } from "react";
import { LoaderCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth-server";
import DashboardClient from "./dashboard-client";

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <LoaderCircle className="size-5 animate-spin" />
          Verifying administrator access…
        </div>
      </main>
    }>
      <AuthenticatedDashboard />
    </Suspense>
  );
}

async function AuthenticatedDashboard() {
  const admin = await requireAdmin();
  return <AppShell admin={admin}><DashboardClient /></AppShell>;
}
