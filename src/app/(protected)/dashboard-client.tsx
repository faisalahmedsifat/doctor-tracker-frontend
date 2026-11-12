"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, CalendarDays,
  ClipboardList, LoaderCircle, Plus, Stethoscope, Users, UserRoundCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DashboardCharts } from "@/components/dashboard-charts";
import { dashboardKeys, useDashboardOverview } from "@/features/dashboard/dashboard.queries";

const metricConfig = [
  { key: "totalDoctors", label: "Total doctors", icon: Stethoscope, tone: "bg-blue-50 text-blue-700", detail: (data: { activeDoctors: number }) => `${data.activeDoctors} active` },
  { key: "totalPatients", label: "Total patients", icon: Users, tone: "bg-violet-50 text-violet-700", detail: (data: { activePatients: number }) => `${data.activePatients} active` },
  { key: "averagePatientsPerActiveDoctor", label: "Avg. active patients / doctor", icon: UserRoundCheck, tone: "bg-emerald-50 text-emerald-700", detail: () => "Based on active doctors" },
  { key: "newPatientsThisMonth", label: "New this month", icon: ClipboardList, tone: "bg-amber-50 text-amber-700", detail: (data: { newPatientsLastMonth: number }) => `${data.newPatientsLastMonth} last month` },
] as const;

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export default function DashboardClient() {
  const queryClient = useQueryClient();
  const query = useDashboardOverview();
  const data = query.data;

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: dashboardKeys.overview });
    toast.success("Dashboard data refreshed.");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="size-3.5" /> {new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date())}</div>
          <h1 className="text-[26px] font-semibold tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">A live view of your doctors, patients and clinic activity.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-9 gap-2 text-xs" onClick={() => void refresh()} disabled={query.isFetching}>
            {query.isFetching ? <LoaderCircle className="size-3.5 animate-spin" /> : <Activity className="size-3.5" />} Refresh data
          </Button>
          <Button render={<Link href="/patients" />} className="h-9 gap-2 text-xs"><Plus className="size-3.5" /> Add patient</Button>
        </div>
      </div>

      {query.isError ? (
        <Card className="border-destructive/30 shadow-none"><CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-sm font-medium">Unable to load dashboard data</p>
          <p className="text-xs text-muted-foreground">Check the API connection and try again.</p>
          <Button size="sm" variant="outline" onClick={() => void query.refetch()}>Retry</Button>
        </CardContent></Card>
      ) : !data ? (
        <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> Loading clinic overview…</div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metricConfig.map((metric) => {
              const Icon = metric.icon;
              const value = data.metrics[metric.key];
              return (
                <Card key={metric.key} className="border-border/70 shadow-none">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between"><p className="text-xs font-medium text-muted-foreground">{metric.label}</p><div className={`flex size-8 items-center justify-center rounded-lg ${metric.tone}`}><Icon className="size-4" /></div></div>
                    <p className="mt-3 text-[27px] font-semibold tracking-tight tabular-nums">{value.toLocaleString("en-BD")}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{metric.detail(data.metrics)}</p>
                    {metric.key === "newPatientsThisMonth" && <p className={`mt-1 flex items-center gap-1 text-[10px] ${data.metrics.newPatientsChangePercent >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{data.metrics.newPatientsChangePercent >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}{Math.abs(data.metrics.newPatientsChangePercent)}% vs last month</p>}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <DashboardCharts patientGrowth={data.patientGrowth} patientsByDoctor={data.patientsByDoctor} />

          <Card className="border-border/70 shadow-none">
            <div className="flex items-center justify-between px-5 py-4">
              <div><h2 className="text-sm font-semibold">Recently added patients</h2><p className="mt-1 text-xs text-muted-foreground">The latest patient records in your system</p></div>
              <Button variant="ghost" size="sm" render={<Link href="/patients" />} className="h-8 gap-1 text-xs text-primary">View all <ArrowRight className="size-3.5" /></Button>
            </div>
            {data.recentPatients.length === 0 ? (
              <div className="border-t px-5 py-12 text-center"><p className="text-sm font-medium">No patients yet</p><p className="mt-1 text-xs text-muted-foreground">New patient records will appear here.</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead className="border-y bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Patient</th><th className="px-4 py-3 font-medium">Assigned doctor</th><th className="px-4 py-3 font-medium">Added</th><th className="px-5 py-3 font-medium">Status</th></tr></thead>
                  <tbody className="divide-y">
                    {data.recentPatients.map((patient) => {
                      const initials = `${patient.firstName[0] ?? ""}${patient.lastName[0] ?? ""}`.toUpperCase();
                      return <tr key={patient.id} className="transition-colors hover:bg-muted/30">
                        <td className="px-5 py-3.5"><div className="flex items-center gap-3"><Avatar className="size-8 rounded-lg"><AvatarFallback className="rounded-lg bg-primary/10 text-[10px] font-semibold text-primary">{initials}</AvatarFallback></Avatar><div><p className="font-medium">{patient.firstName} {patient.lastName}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{patient.patientNumber}</p></div></div></td>
                        <td className="px-4 py-3.5">{patient.assignedDoctor ?? <span className="text-muted-foreground">Unassigned</span>}</td>
                        <td className="px-4 py-3.5 text-muted-foreground">{dateLabel(patient.createdAt)}</td>
                        <td className="px-5 py-3.5"><Badge variant="secondary" className={patient.status === "active" ? "bg-emerald-50 text-[10px] font-medium text-emerald-700" : "bg-slate-100 text-[10px] font-medium text-slate-600"}>{patient.status === "active" ? "Active" : "Inactive"}</Badge></td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="border-t px-5 py-3 text-[10px] text-muted-foreground">Live database records · Updated {dateLabel(data.generatedAt)}</div>
          </Card>
        </>
      )}
    </div>
  );
}
