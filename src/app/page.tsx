import {
  ArrowDownRight, ArrowRight, ArrowUpRight, CalendarDays, ClipboardList,
  Plus, Stethoscope, Users, UserRoundCheck,
} from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { DashboardCharts } from "@/components/dashboard-charts";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const metrics = [
  { label: "Total doctors", value: "24", change: "+2 this month", positive: true, icon: Stethoscope, tone: "blue" },
  { label: "Total patients", value: "1,284", change: "+8.4% this month", positive: true, icon: Users, tone: "violet" },
  { label: "Avg. patients / doctor", value: "53.5", change: "+3.2% this month", positive: true, icon: UserRoundCheck, tone: "green" },
  { label: "New this month", value: "86", change: "−2.1% vs last month", positive: false, icon: ClipboardList, tone: "amber" },
];

const recentPatients = [
  { name: "Ayesha Rahman", id: "PT-10284", condition: "Hypertension", doctor: "Dr. Sarah Ahmed", date: "Nov 12, 2026", initials: "AR", color: "bg-sky-100 text-sky-700" },
  { name: "Mahmud Hasan", id: "PT-10283", condition: "Type 2 diabetes", doctor: "Dr. Tanvir Hasan", date: "Nov 11, 2026", initials: "MH", color: "bg-violet-100 text-violet-700" },
  { name: "Nusrat Jahan", id: "PT-10282", condition: "Migraine", doctor: "Dr. Nadia Rahman", date: "Nov 11, 2026", initials: "NJ", color: "bg-amber-100 text-amber-700" },
  { name: "Rafiq Islam", id: "PT-10281", condition: "Asthma", doctor: "Dr. Imran Chowdhury", date: "Nov 10, 2026", initials: "RI", color: "bg-emerald-100 text-emerald-700" },
];

const tones: Record<string, string> = {
  blue: "bg-blue-50 text-blue-700",
  violet: "bg-violet-50 text-violet-700",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
};

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="size-3.5" /> Wednesday, November 12, 2026</div><h1 className="text-[26px] font-semibold tracking-tight">Overview</h1><p className="mt-1 text-sm text-muted-foreground">Here&apos;s what&apos;s happening across your practice today.</p></div>
          <div className="flex gap-2"><Button variant="outline" className="h-9 gap-2 text-xs"><CalendarDays className="size-3.5" /> Last 30 days</Button><Button className="h-9 gap-2 text-xs"><Plus className="size-3.5" /> Add patient</Button></div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.label} className="border-border/70 shadow-none">
              <CardContent className="p-4">
                <div className="flex items-start justify-between"><p className="text-xs font-medium text-muted-foreground">{metric.label}</p><div className={`flex size-8 items-center justify-center rounded-lg ${tones[metric.tone]}`}><metric.icon className="size-4" /></div></div>
                <div className="mt-3 flex items-baseline gap-2"><p className="text-[27px] font-semibold tracking-tight">{metric.value}</p></div>
                <div className="mt-1 flex items-center gap-1 text-[10px]"><span className={metric.positive ? "text-emerald-600" : "text-rose-600"}>{metric.positive ? <ArrowUpRight className="inline size-3" /> : <ArrowDownRight className="inline size-3" />}{metric.change}</span><span className="text-muted-foreground">from previous period</span></div>
              </CardContent>
            </Card>
          ))}
        </div>

        <DashboardCharts />

        <Card className="border-border/70 shadow-none">
          <div className="flex items-center justify-between px-5 py-4">
            <div><h2 className="text-sm font-semibold">Recently added patients</h2><p className="mt-1 text-xs text-muted-foreground">The latest patient records in your system</p></div>
            <Button variant="ghost" size="sm" render={<Link href="/patients" />} className="h-8 gap-1 text-xs text-primary">View all <ArrowRight className="size-3.5" /></Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead className="border-y bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Patient</th><th className="px-4 py-3 font-medium">Condition</th><th className="px-4 py-3 font-medium">Assigned doctor</th><th className="px-4 py-3 font-medium">Added</th><th className="px-5 py-3 font-medium">Status</th></tr></thead>
              <tbody className="divide-y">
                {recentPatients.map((patient) => <tr key={patient.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-5 py-3.5"><div className="flex items-center gap-3"><Avatar className="size-8 rounded-lg"><AvatarFallback className={`rounded-lg text-[10px] font-semibold ${patient.color}`}>{patient.initials}</AvatarFallback></Avatar><div><p className="font-medium">{patient.name}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{patient.id}</p></div></div></td>
                  <td className="px-4 py-3.5 text-muted-foreground">{patient.condition}</td><td className="px-4 py-3.5">{patient.doctor}</td><td className="px-4 py-3.5 text-muted-foreground">{patient.date}</td><td className="px-5 py-3.5"><Badge variant="secondary" className="bg-emerald-50 text-[10px] font-medium text-emerald-700 hover:bg-emerald-50">Active</Badge></td>
                </tr>)}
              </tbody>
            </table>
          </div>
          <div className="border-t px-5 py-3 text-[10px] text-muted-foreground">Sample interface data · Will be replaced with live API records</div>
        </Card>
      </div>
    </AppShell>
  );
}
