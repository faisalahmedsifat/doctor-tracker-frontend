"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { AppointmentInput, AppointmentListResponse, AppointmentResponse } from "./appointments.types";

export const appointmentKeys = {
  all: ["appointments"] as const,
  list: (params: Record<string, string | number | undefined>) => [...appointmentKeys.all, params] as const,
};
function queryString(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  return query.toString();
}
export function useAppointments(params: Record<string, string | number | undefined>, enabled = true) {
  return useQuery({
    enabled,
    queryKey: appointmentKeys.list(params),
    queryFn: () => apiFetch<AppointmentListResponse>(`/appointments?${queryString(params)}`),
    select: (response) => response.data,
    placeholderData: (previous) => previous,
  });
}
export function useCreateAppointment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: AppointmentInput) => apiFetch<AppointmentResponse>("/appointments", {
      method: "POST", body: JSON.stringify(input),
    }),
    onSuccess: () => client.invalidateQueries({ queryKey: appointmentKeys.all }),
  });
}
export function useUpdateAppointment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<AppointmentInput> }) =>
      apiFetch<AppointmentResponse>(`/appointments/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    onSuccess: () => client.invalidateQueries({ queryKey: appointmentKeys.all }),
  });
}
export function useDeleteAppointment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<{ success: true }>(`/appointments/${id}`, { method: "DELETE" }),
    onSuccess: () => client.invalidateQueries({ queryKey: appointmentKeys.all }),
  });
}
