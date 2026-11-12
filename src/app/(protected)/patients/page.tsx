import { Suspense } from "react";
import { LoaderCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth-server";
import PatientsClient from "./patients-client";

export default function PatientsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-muted/30">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <LoaderCircle className="size-5 animate-spin" />
            Verifying administrator access…
          </div>
        </main>
      }
    >
      <AuthenticatedPatients />
    </Suspense>
  );
}

async function AuthenticatedPatients() {
  const admin = await requireAdmin();
  return (
    <AppShell admin={admin}>
      <PatientsClient />
    </AppShell>
  );
}
