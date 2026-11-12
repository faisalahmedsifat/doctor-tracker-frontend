import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { DashboardOverviewResponse } from './dashboard.types';

export const dashboardKeys = {
  overview: ['dashboard', 'overview'] as const,
};

export function useDashboardOverview() {
  return useQuery({
    queryKey: dashboardKeys.overview,
    queryFn: () => apiFetch<DashboardOverviewResponse>('/dashboard/overview'),
    select: (response) => response.data,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
