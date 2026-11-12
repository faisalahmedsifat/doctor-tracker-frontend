"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Activity, ArrowRight, Eye, EyeOff, HeartPulse, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentAdmin, authKeys } from "@/features/auth/auth.queries";
import { apiFetch, ApiError } from "@/lib/api";
import type { AuthResponse, LoginInput } from "@/features/auth/auth.types";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(254),
  password: z.string().min(1, "Enter your password.").max(128),
});

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: admin, isPending: checkingSession, isError: sessionError } = useCurrentAdmin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (admin) router.replace("/");
  }, [admin, router]);

  const loginMutation = useMutation({
    mutationFn: (input: LoginInput) =>
      apiFetch<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (response) => {
      queryClient.setQueryData(authKeys.currentAdmin, response.data.admin);
      toast.success("Welcome back.");
      router.replace("/");
    },
    onError: (error) => {
      setFormError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Check your email and password.");
      return;
    }

    loginMutation.mutate({
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
    });
  }

  if (checkingSession || admin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <LoaderCircle className="size-5 animate-spin" />
          Checking your session…
        </div>
      </main>
    );
  }

  return (
    <main className="relative grid min-h-screen bg-background lg:grid-cols-[1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-slate-950 px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
        <div className="absolute -right-32 -top-32 size-[480px] rounded-full bg-teal-400/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 size-[460px] rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-teal-400 text-slate-950">
            <HeartPulse className="size-5" />
          </div>
          <div>
            <p className="text-base font-semibold tracking-tight">Careflow</p>
            <p className="text-[10px] tracking-[0.16em] text-slate-400">CLINIC ADMINISTRATION</p>
          </div>
        </div>

        <div className="relative max-w-xl pb-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
            <Activity className="size-3.5 text-teal-300" />
            A clearer view of your practice
          </div>
          <h1 className="max-w-lg text-4xl leading-[1.15] font-semibold tracking-tight xl:text-5xl">
            Better care starts with a <span className="text-teal-300">better overview.</span>
          </h1>
          <p className="mt-5 max-w-md text-sm leading-7 text-slate-400">
            Manage your doctors, patient records, and day-to-day clinic operations from one focused workspace.
          </p>
          <div className="mt-10 grid max-w-md grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-2xl font-semibold">One</p>
              <p className="mt-1 text-xs text-slate-400">Connected workspace</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-2xl font-semibold">Clear</p>
              <p className="mt-1 text-xs text-slate-400">Operational visibility</p>
            </div>
          </div>
        </div>
        <p className="relative text-[11px] text-slate-500">Careflow · Healthcare administration</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-[400px]">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <HeartPulse className="size-5" />
            </div>
            <div>
              <p className="text-base font-semibold">Careflow</p>
              <p className="text-[10px] tracking-[0.14em] text-muted-foreground">CLINIC ADMINISTRATION</p>
            </div>
          </div>

          <div className="mb-8">
            <p className="mb-3 text-xs font-medium tracking-wide text-primary">ADMINISTRATOR ACCESS</p>
            <h2 className="text-3xl font-semibold tracking-tight">Welcome back</h2>
            <p className="mt-2 text-sm text-muted-foreground">Sign in to continue to your workspace.</p>
          </div>

          {sessionError && (
            <div className="mb-5 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-xs text-amber-700">
              Your previous session could not be checked. You can still try signing in.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email address</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  autoFocus
                  placeholder="admin@clinic.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={loginMutation.isPending}
                  aria-invalid={Boolean(formError)}
                  className="h-11 pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium">Password</label>
              </div>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={loginMutation.isPending}
                  aria-invalid={Boolean(formError)}
                  className="h-11 pr-11 pl-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {formError && (
              <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                {formError}
              </p>
            )}

            <Button type="submit" className="h-11 w-full gap-2" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
              {loginMutation.isPending ? "Signing in…" : "Sign in"}
              {!loginMutation.isPending && <ArrowRight className="size-4" />}
            </Button>
          </form>

          <div className="mt-8 border-t pt-6">
            <p className="text-center text-xs leading-5 text-muted-foreground">
              Administrator accounts are provisioned by your system administrator. Contact your administrator if you need access.
            </p>
          </div>
          <p className="mt-8 text-center text-[11px] text-muted-foreground">Protected administrator portal</p>
        </div>
      </section>
    </main>
  );
}
