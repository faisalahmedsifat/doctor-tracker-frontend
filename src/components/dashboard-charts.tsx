"use client";

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardOverview } from "@/features/dashboard/dashboard.types";

export function DashboardCharts({ patientGrowth, patientsByDoctor }: Pick<DashboardOverview, "patientGrowth" | "patientsByDoctor">) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
      <Card className="border-border/70 shadow-none">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div><CardTitle className="text-sm font-semibold">Patient growth</CardTitle><p className="mt-1 text-xs text-muted-foreground">New patient registrations · last 7 months</p></div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={patientGrowth} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                <defs><linearGradient id="patientFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5276D8" stopOpacity={0.18} /><stop offset="95%" stopColor="#5276D8" stopOpacity={0.01} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#E9EDF3" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#8B95A5", fontSize: 11 }} dy={10} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#8B95A5", fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E7EAF0", boxShadow: "0 8px 30px rgba(20,30,50,.08)", fontSize: 12 }} />
                <Area type="monotone" dataKey="patients" name="New patients" stroke="#5276D8" strokeWidth={2.5} fill="url(#patientFill)" activeDot={{ r: 5, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-none">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Patients by doctor</CardTitle><p className="mt-1 text-xs text-muted-foreground">Currently assigned patients · top 5</p></CardHeader>
        <CardContent className="pt-4">
          {patientsByDoctor.length === 0 ? (
            <div className="flex h-[260px] items-center justify-center text-xs text-muted-foreground">No doctor assignments yet.</div>
          ) : (
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={patientsByDoctor} layout="vertical" margin={{ top: 0, right: 12, left: 4, bottom: 0 }} barSize={12}>
                  <CartesianGrid strokeDasharray="3 5" horizontal={false} stroke="#E9EDF3" />
                  <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#8B95A5", fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={112} axisLine={false} tickLine={false} tick={{ fill: "#647084", fontSize: 10 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E7EAF0", fontSize: 12 }} />
                  <Bar dataKey="patients" name="Patients" fill="#82A0E9" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
