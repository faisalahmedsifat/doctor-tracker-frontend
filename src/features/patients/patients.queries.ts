import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { dashboardKeys } from "@/features/dashboard/dashboard.queries";
import type {
  PatientInput,
  PatientListResponse,
  PatientResponse,
} from "./patients.types";

export const patientKeys = {
  all: ["patients"] as const,
  list: (params: Record<string, string | number | undefined>) =>
    [...patientKeys.all, params] as const,
};

function queryString(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  return query.toString();
}

export function usePatients(
  params: Record<string, string | number | undefined>,
) {
  return useQuery({
    queryKey: patientKeys.list(params),
    queryFn: () =>
      apiFetch<PatientListResponse>(`/patients?${queryString(params)}`),
    select: (response) => response.data,
    placeholderData: (previous) => previous,
  });
}
export function useCreatePatient() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: PatientInput) =>
      apiFetch<PatientResponse>("/patients", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => Promise.all([
      client.invalidateQueries({ queryKey: patientKeys.all }),
      client.invalidateQueries({ queryKey: dashboardKeys.overview }),
    ]),
  });
}
export function useUpdatePatient() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<PatientInput> }) =>
      apiFetch<PatientResponse>(`/patients/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => Promise.all([
      client.invalidateQueries({ queryKey: patientKeys.all }),
      client.invalidateQueries({ queryKey: dashboardKeys.overview }),
    ]),
  });
}
export function useDeletePatient() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ success: true }>(`/patients/${id}`, { method: "DELETE" }),
    onSuccess: () => Promise.all([
      client.invalidateQueries({ queryKey: patientKeys.all }),
      client.invalidateQueries({ queryKey: dashboardKeys.overview }),
    ]),
  });
}
