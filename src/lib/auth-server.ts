import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Admin, AuthResponse } from "@/features/auth/auth.types";

function getApiBaseUrl(): string {
  const configuredUrl = process.env.API_INTERNAL_URL;
  if (!configuredUrl && process.env.NODE_ENV === "production") {
    throw new Error("API_INTERNAL_URL must be configured in production.");
  }

  return (configuredUrl ?? "http://localhost:4000/api/v1").replace(/\/$/, "");
}

export async function requireAdmin(): Promise<Admin> {
  const cookie = (await cookies()).get("doctor_tracker_access");
  if (!cookie) redirect("/login");

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}/auth/me`, {
      headers: { cookie: `doctor_tracker_access=${encodeURIComponent(cookie.value)}` },
      cache: "no-store",
    });
  } catch {
    throw new Error("The authentication service is unavailable. Please try again.");
  }

  if (response.status === 401) redirect("/login");
  if (!response.ok) throw new Error("Unable to verify administrator access.");

  const auth = (await response.json()) as AuthResponse;
  return auth.data.admin;
}
