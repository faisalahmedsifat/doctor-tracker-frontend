import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { dashboardKeys } from "@/features/dashboard/dashboard.queries";
import type { DoctorInput, DoctorListParams, DoctorListResponse, DoctorResponse } from "./doctors.types";

export const doctorKeys = {
  all: ["doctors"] as const,
  lists: () => [...doctorKeys.all, "list"] as const,
  list: (params: DoctorListParams) => [...doctorKeys.lists(), params] as const,
  details: () => [...doctorKeys.all, "detail"] as const,
  detail: (id: string) => [...doctorKeys.details(), id] as const,
};

function toSearchParams(params: DoctorListParams) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") search.set(key, String(value));
  });
  return search.toString();
}

export function useDoctors(params: DoctorListParams) {
  return useQuery({
    queryKey: doctorKeys.list(params),
    queryFn: () => apiFetch<DoctorListResponse>(`/doctors?${toSearchParams(params)}`),
    select: (response) => response.data,
    placeholderData: (previous) => previous,
  });
}
export function useCreateDoctor() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: DoctorInput) => apiFetch<DoctorResponse>("/doctors", {
      method: "POST", body: JSON.stringify(input),
    }),
    onSuccess: () => Promise.all([
      client.invalidateQueries({ queryKey: doctorKeys.all }),
      client.invalidateQueries({ queryKey: dashboardKeys.overview }),
    ]),
  });
}
export function useUpdateDoctor() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<DoctorInput> }) =>
      apiFetch<DoctorResponse>(`/doctors/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: doctorKeys.all });
      client.invalidateQueries({ queryKey: doctorKeys.detail(variables.id) });
      client.invalidateQueries({ queryKey: dashboardKeys.overview });
    },
  });
}
export function useDeleteDoctor() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<{ success: true }>(`/doctors/${id}`, { method: "DELETE" }),
    onSuccess: () => Promise.all([
      client.invalidateQueries({ queryKey: doctorKeys.all }),
      client.invalidateQueries({ queryKey: dashboardKeys.overview }),
    ]),
  });
}
