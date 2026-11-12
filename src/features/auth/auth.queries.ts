"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiFetch } from "@/lib/api";
import type { AuthResponse } from "./auth.types";

export const authKeys = {
  currentAdmin: ["auth", "current-admin"] as const,
};

export function useCurrentAdmin() {
  return useQuery({
    queryKey: authKeys.currentAdmin,
    queryFn: async () => {
      try {
        const response = await apiFetch<AuthResponse>("/auth/me");
        return response.data.admin;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: 60_000,
    retry: false,
  });
}
