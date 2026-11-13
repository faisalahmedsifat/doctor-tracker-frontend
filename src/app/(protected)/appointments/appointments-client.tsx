"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarDays, CirclePlus, LoaderCircle, Pencil, Phone, Search, Trash2, Users, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/searchable-select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDoctors } from "@/features/doctors/doctors.queries";
import { usePatients } from "@/features/patients/patients.queries";
import { PatientForm } from "@/features/patients/patient-form";
import { useAppointments, useCreateAppointment, useDeleteAppointment, useUpdateAppointment } from "@/features/appointments/appointments.queries";
import type { Appointment, AppointmentInput, AppointmentStatus } from "@/features/appointments/appointments.types";

const statuses: AppointmentStatus[] = ["scheduled", "confirmed", "completed", "cancelled", "no_show"];
const labels: Record<AppointmentStatus, string> = { scheduled: "Scheduled", confirmed: "Confirmed", completed: "Completed", cancelled: "Cancelled", no_show: "No-show" };
const todayKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());
function dayBounds(day: string, next = false) {
  const [y,m,d] = day.split("-").map(Number);
  // Asia/Dhaka is UTC+06:00; use explicit offsets instead of the browser timezone.
  return new Date(Date.UTC(y!, m! - 1, d! + (next ? 1 : 0), -6, 0, 0)).toISOString();
}
function defaultDateTime() {
  const [y,m,d] = todayKey().split("-").map(Number);
  const tomorrow = new Date(Date.UTC(y!, m! - 1, d! + 1));
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(tomorrow);
  return `${date}T09:00`;
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-BD", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
function formatTime(value: Date) {
  return new Intl.DateTimeFormat("en-BD", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit" }).format(value);
}
function dhakaParts(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short" }).formatToParts(new Date(value));
  return Object.fromEntries(parts.map(p => [p.type,p.value]));
}
function dayNumber(weekday: string) {
  return ({ Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as Record<string,number>)[weekday] ?? 0;
}

export default function AppointmentsClient() {
  const [view, setView] = useState<"today" | "upcoming" | "all">("today");
  const [search, setSearch] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Appointment | null>(null);
  const [patientPhone, setPatientPhone] = useState("");
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [startAt, setStartAt] = useState(defaultDateTime);
  const [duration, setDuration] = useState("30");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [overrideReason, setOverrideReason] = useState("");

  const today = todayKey();
  const dateFrom = view === "today" ? dayBounds(today) : view === "upcoming" ? dayBounds(today, true) : undefined;
  const dateTo = view === "today" ? dayBounds(today, true) : undefined;
  const params = {
    page, limit: 10, search: search.trim() || undefined,
    doctorId: doctorFilter === "all" ? undefined : doctorFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
    dateFrom, dateTo, sortOrder: "asc" as const,
  };
  const query = useAppointments(params);
  const todayQuery = useAppointments({ page: 1, limit: 100, dateFrom: dayBounds(today), dateTo: dayBounds(today,true), sortOrder: "asc" });
  const upcomingQuery = useAppointments({ page: 1, limit: 100, dateFrom: dayBounds(today,true), sortOrder: "asc" });
  const doctorsQuery = useDoctors({ page: 1, limit: 100, status: "active", sortBy: "name", sortOrder: "asc" });
  const patientQuery = usePatients({ page: 1, limit: 10, search: patientPhone.trim() || undefined, status: "active", sortBy: "createdAt", sortOrder: "desc" });
  const day = dhakaParts(new Date(`${startAt}:00+06:00`).toISOString());
  const scheduleQuery = useAppointments({ page: 1, limit: 100, doctorId: doctorId || undefined, dateFrom: dayBounds(day.year+"-"+day.month+"-"+day.day), dateTo: dayBounds(day.year+"-"+day.month+"-"+day.day,true), sortOrder: "asc" }, Boolean(doctorId));
  const create = useCreateAppointment();
  const update = useUpdateAppointment();
  const remove = useDeleteAppointment();
  const appointments = query.data?.appointments ?? [];
  const doctors = doctorsQuery.data?.doctors ?? [];
  const patients = patientQuery.data?.patients ?? [];
  const selectedDoctor = doctors.find(d => d.id === doctorId);
  const existing = (scheduleQuery.data?.appointments ?? []).filter(a => a.id !== editing?.id && ["scheduled","confirmed"].includes(a.status));
  const durationMinutes = Number(duration) || 30;
  const scheduleDay = dayNumber(day.weekday);
  const hours = selectedDoctor?.workingHours?.find(h => h.dayOfWeek === scheduleDay);
  const configured = Boolean(hours);
  const localMinute = Number(day.hour) * 60 + Number(day.minute);
  const outsideHours = !hours || localMinute < Number(hours.startTime.slice(0,2))*60 + Number(hours.startTime.slice(3)) || localMinute + durationMinutes > Number(hours.endTime.slice(0,2))*60 + Number(hours.endTime.slice(3));
  const slots = useMemo(() => {
    if (!hours) return [];
    const [sh,sm] = hours.startTime.split(":").map(Number);
    const [eh,em] = hours.endTime.split(":").map(Number);
    const start = sh!*60+sm!, end = eh!*60+em!;
    const values: { value: string; conflict?: Appointment }[] = [];
    for (let minute=start; minute+durationMinutes<=end; minute+=30) {
      const instant = new Date(Date.UTC(Number(day.year),Number(day.month)-1,Number(day.day),Math.floor(minute/60)-6,minute%60));
      const endInstant = new Date(instant.getTime()+durationMinutes*60000);
      const conflict = existing.find(a => new Date(a.startAt)<endInstant && new Date(a.endAt)>instant);
      values.push({ value: new Date(instant.getTime() + 6 * 3600000).toISOString().slice(0,16), conflict });
    }
    return values;
  }, [hours, day.year, day.month, day.day, durationMinutes, existing]);

  const action = useSearchParams().get("action");
  useEffect(() => { if (action === "create") { window.requestAnimationFrame(() => { setEditing(null); setPatientPhone(""); setPatientId(""); setDoctorId(""); setStartAt(defaultDateTime()); setDuration("30"); setReason(""); setNotes(""); setOverrideReason(""); setOpen(true); }); window.history.replaceState(null,"",window.location.pathname); } }, [action]);

  function resetForm() {
    setEditing(null); setPatientPhone(""); setPatientId(""); setDoctorId(""); setStartAt(defaultDateTime());
    setDuration("30"); setReason(""); setNotes(""); setOverrideReason("");
  }
  function openCreate() { resetForm(); setOpen(true); }
  function openEdit(item: Appointment) {
    setEditing(item); setPatientId(item.patient.id); setPatientPhone(item.patient.patientNumber);
    setDoctorId(item.doctor.id); { const p = dhakaParts(item.startAt); setStartAt(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`); }
    setDuration(String(item.durationMinutes)); setReason(item.reason ?? ""); setNotes(item.notes ?? ""); setOverrideReason(""); setOpen(true);
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!patientId || !doctorId) { toast.error("Find and select the caller's patient record, then choose a doctor."); return; }
    const input: AppointmentInput = { patientId, doctorId, startAt: new Date(`${startAt}:00+06:00`).toISOString(), durationMinutes, reason: reason.trim() || null, notes: notes.trim() || null, scheduleOverrideReason: outsideHours ? overrideReason.trim() : null };
    try {
      if (editing) await update.mutateAsync({ id: editing.id, input });
      else await create.mutateAsync(input);
      toast.success(editing ? "Appointment updated." : "Appointment booked.");
      setOpen(false);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save appointment."); }
  }
  async function changeStatus(item: Appointment, status: AppointmentStatus) {
    try { await update.mutateAsync({ id: item.id, input: { status } }); toast.success("Status updated."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Unable to update status."); }
  }
  async function deleteAppointment() {
    if (!removeTarget) return;
    try { await remove.mutateAsync(removeTarget.id); setRemoveTarget(null); toast.success("Appointment deleted."); }
    catch { toast.error("Unable to delete appointment."); }
  }

  return <div className="space-y-6">
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="size-3.5" /> Workspace / Appointments</div><h1 className="text-[26px] font-semibold tracking-tight">Appointment desk</h1><p className="mt-1 text-sm text-muted-foreground">A receptionist-first queue for booking and managing callers&apos; visits.</p></div>
      <Button className="h-9 gap-2" onClick={openCreate}><CirclePlus className="size-4" /> Book appointment</Button>
    </header>
    <div className="grid gap-3 sm:grid-cols-3">
      <Card className="p-4 shadow-none"><p className="text-xs text-muted-foreground">Today&apos;s appointments</p><p className="mt-1 text-2xl font-semibold">{todayQuery.data?.pagination.total ?? "—"}</p><p className="mt-1 text-[11px] text-muted-foreground">Asia/Dhaka clinic day</p></Card>
      <Card className="p-4 shadow-none"><p className="text-xs text-muted-foreground">Awaiting visit</p><p className="mt-1 text-2xl font-semibold">{(todayQuery.data?.appointments ?? []).filter(a => ["scheduled","confirmed"].includes(a.status)).length}</p><p className="mt-1 text-[11px] text-muted-foreground">Scheduled or confirmed today</p></Card>
      <Card className="p-4 shadow-none"><p className="text-xs text-muted-foreground">Upcoming appointments</p><p className="mt-1 text-2xl font-semibold">{upcomingQuery.data?.pagination.total ?? "—"}</p><p className="mt-1 text-[11px] text-muted-foreground">From tomorrow onward</p></Card>
    </div>
    <Card className="gap-0 overflow-hidden py-0 shadow-none">
      <div className="space-y-4 border-b p-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-sm font-semibold">Appointment queue</h2><p className="mt-1 text-xs text-muted-foreground">Find patients by name, phone or patient number; review the doctor and visit status.</p></div>
          <Tabs value={view} onValueChange={v => { setView(v as typeof view); setPage(1); }}><TabsList><TabsTrigger value="today">Today</TabsTrigger><TabsTrigger value="upcoming">Upcoming</TabsTrigger><TabsTrigger value="all">All</TabsTrigger></TabsList></Tabs>
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_190px_160px]">
          <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input aria-label="Search patient or appointment" placeholder="Patient name, phone, ID or reason…" value={search} onChange={e => {setSearch(e.target.value);setPage(1);}} className="h-9 pl-9 text-xs"/></div>
          <Select value={doctorFilter} onValueChange={v=>{setDoctorFilter(v ?? "all");setPage(1);}}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="All doctors"/></SelectTrigger><SelectContent><SelectItem value="all">All doctors</SelectItem>{doctors.map(d=><SelectItem key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</SelectItem>)}</SelectContent></Select>
          <Select value={statusFilter} onValueChange={v=>{setStatusFilter(v ?? "all");setPage(1);}}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="All statuses"/></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{statuses.map(s=><SelectItem key={s} value={s}>{labels[s]}</SelectItem>)}</SelectContent></Select>
        </div>
      </div>
      {query.isError ? <div className="py-16 text-center"><p className="text-sm font-medium">Couldn&apos;t load the appointment queue</p><Button className="mt-3" size="sm" variant="outline" onClick={()=>void query.refetch()}>Retry</Button></div>
      : query.isLoading ? <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin"/> Loading queue…</div>
      : appointments.length===0 ? <div className="flex flex-col items-center gap-3 px-6 py-16 text-center"><CalendarClock className="size-7 text-muted-foreground"/><p className="text-sm font-medium">No appointments in this view</p><p className="text-xs text-muted-foreground">{view==="today" ? "New calls can be booked directly from the desk." : "Try another view or adjust your filters."}</p><Button size="sm" onClick={openCreate}>Book appointment</Button></div>
      : <>
        <Table><TableHeader><TableRow className="bg-muted/30"><TableHead className="pl-5">Time / visit</TableHead><TableHead>Patient</TableHead><TableHead>Doctor</TableHead><TableHead>Status</TableHead><TableHead className="w-24"/></TableRow></TableHeader>
          <TableBody>{appointments.map(item=><TableRow key={item.id}>
            <TableCell className="py-3.5 pl-5"><p className="text-xs font-semibold">{formatDate(item.startAt)}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{item.durationMinutes} min · {item.reason || "General consultation"}</p></TableCell>
            <TableCell><p className="text-xs font-medium">{item.patient.fullName}</p><p className="text-[10px] text-muted-foreground">{item.patient.patientNumber}</p></TableCell>
            <TableCell><p className="text-xs">{item.doctor.fullName}</p><p className="text-[10px] text-muted-foreground">{item.doctor.specialty}</p></TableCell>
            <TableCell><Select value={item.status} onValueChange={v=>{if(v)void changeStatus(item,v as AppointmentStatus);}}><SelectTrigger className="h-8 w-[125px] text-[11px]"><SelectValue/></SelectTrigger><SelectContent>{statuses.map(s=><SelectItem key={s} value={s}>{labels[s]}</SelectItem>)}</SelectContent></Select></TableCell>
            <TableCell><div className="flex"><Button variant="ghost" size="icon" className="size-8" aria-label="Edit appointment" onClick={()=>openEdit(item)}><Pencil className="size-3.5"/></Button><Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" aria-label="Delete appointment" onClick={()=>setRemoveTarget(item)}><Trash2 className="size-3.5"/></Button></div></TableCell>
          </TableRow>)}</TableBody>
        </Table>
        <div className="flex items-center justify-between border-t px-4 py-3"><p className="text-[11px] text-muted-foreground">{query.data?.pagination.total ?? 0} appointments · Page {page} of {Math.max(1,query.data?.pagination.totalPages ?? 1)}</p><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page<=1||query.isFetching} onClick={()=>setPage(v=>v-1)}>Previous</Button><Button size="sm" variant="outline" disabled={!query.data||page>=query.data.pagination.totalPages||query.isFetching} onClick={()=>setPage(v=>v+1)}>Next</Button></div></div>
      </>}
    </Card>

    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[94vh] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto p-0">
      <div className="border-b px-6 py-5"><DialogHeader><DialogTitle>{editing ? "Update appointment" : "Book a patient appointment"}</DialogTitle><DialogDescription>Start with the caller&apos;s phone number, identify the patient, then select a doctor and time.</DialogDescription></DialogHeader></div>
      <form onSubmit={submit} className="space-y-6 p-6">
        <section className="space-y-3"><div className="flex items-center gap-2"><Phone className="size-4 text-primary"/><h3 className="text-sm font-semibold">1. Identify the caller</h3></div>
          <div className="space-y-1.5"><label htmlFor="caller-phone" className="text-xs font-medium">Patient phone or patient number</label><Input id="caller-phone" autoFocus value={patientPhone} onChange={e=>{setPatientPhone(e.target.value);setPatientId("");}} placeholder="Enter the phone number or PT-…" className="h-10"/></div>
          <div className="space-y-1.5"><label className="text-xs font-medium">Matching patient record</label><SearchableSelect value={patientId} onValueChange={setPatientId} placeholder={patientPhone ? "Choose the matching patient…" : "Enter phone or patient number first"} searchPlaceholder="Search patient name or number…" disabled={!patientPhone || patientQuery.isLoading || patientQuery.isError} options={patients.map(p=>({value:p.id,label:p.firstName+" "+p.lastName,description:p.patientNumber+" · "+p.phone}))}/></div>
          {patientPhone && !patientQuery.isLoading && patients.length===0 && <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">No active patient matched. <button type="button" className="font-medium text-primary underline" onClick={()=>setRegisterOpen(true)}>Register a new patient</button> without leaving this booking.</div>}
          {patientId && <p className="text-xs text-emerald-700">Patient selected. The existing patient record will be reused.</p>}
        </section>
        <section className="space-y-3 border-t pt-5"><div className="flex items-center gap-2"><Users className="size-4 text-primary"/><h3 className="text-sm font-semibold">2. Choose a doctor and visit</h3></div>
          <div className="space-y-1.5"><label className="text-xs font-medium">Doctor</label><SearchableSelect value={doctorId} onValueChange={setDoctorId} placeholder="Select a doctor…" searchPlaceholder="Search by doctor name or specialty…" options={doctors.map(d=>({value:d.id,label:"Dr. "+d.firstName+" "+d.lastName,description:d.specialty+" · "+d.hospital}))}/></div>
          <div className="grid gap-3 sm:grid-cols-[1fr_130px]"><div className="space-y-1.5"><label htmlFor="appointment-start" className="text-xs font-medium">Date and time (Dhaka)</label><Input id="appointment-start" type="datetime-local" required min={defaultDateTime()} value={startAt} onChange={e=>setStartAt(e.target.value)} className="h-10"/></div><div className="space-y-1.5"><label htmlFor="appointment-duration" className="text-xs font-medium">Duration</label><Select value={duration} onValueChange={v=>setDuration(v ?? "30")}><SelectTrigger id="appointment-duration" className="h-10"><SelectValue/></SelectTrigger><SelectContent>{[15,20,30,45,60,90,120].map(n=><SelectItem key={n} value={String(n)}>{n} min</SelectItem>)}</SelectContent></Select></div></div>
          {doctorId && <div className="rounded-xl border p-3">
            <div className="mb-2 flex items-center justify-between"><p className="text-xs font-semibold">Doctor&apos;s working hours</p><span className="text-[10px] text-muted-foreground">Asia/Dhaka</span></div>
            {!configured ? <p className="text-xs text-amber-700">No working hours are configured for this doctor. An administrator must review and record an override reason before booking.</p>
            : <><p className="mb-3 text-xs text-muted-foreground">{hours!.startTime}–{hours!.endTime} · {slots.filter(s=>!s.conflict).length} available start times</p><div className="grid grid-cols-3 gap-2 sm:grid-cols-5">{slots.map(slot=><button key={slot.value} type="button" disabled={Boolean(slot.conflict)} onClick={()=>setStartAt(slot.value)} className={`rounded-md border px-2 py-2 text-xs font-medium ${slot.value===startAt ? "border-primary bg-primary text-primary-foreground" : slot.conflict ? "cursor-not-allowed bg-muted text-muted-foreground line-through" : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-400"}`}>{formatTime(new Date(slot.value))}</button>)}</div>{existing.length>0 && <div className="mt-3 space-y-1 border-t pt-3"><p className="text-[10px] font-medium text-muted-foreground">Already booked</p>{existing.map(a=><p key={a.id} className="text-[11px] text-muted-foreground">{formatTime(new Date(a.startAt))}–{formatTime(new Date(a.endAt))} · {a.patient.fullName}</p>)}</div>}</>}
          </div>}
          {doctorId && outsideHours && <div className="space-y-1.5 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:bg-amber-950/20"><p className="text-xs font-semibold text-amber-900 dark:text-amber-200">Admin override required</p><p className="text-[11px] text-amber-800 dark:text-amber-200">This date/time is outside the doctor&apos;s configured hours or the doctor has no schedule configured. Record why the clinic is approving this exception.</p><label htmlFor="schedule-override-reason" className="text-xs font-medium">Override reason</label><Input id="schedule-override-reason" required minLength={5} maxLength={500} value={overrideReason} onChange={e=>setOverrideReason(e.target.value)} placeholder="e.g. Doctor approved an urgent additional consultation"/></div>}
          <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1.5"><label htmlFor="appointment-reason" className="text-xs font-medium">Reason for visit</label><Input id="appointment-reason" value={reason} onChange={e=>setReason(e.target.value)} maxLength={500} placeholder="e.g. Follow-up"/></div><div className="space-y-1.5"><label htmlFor="appointment-notes" className="text-xs font-medium">Internal notes</label><Input id="appointment-notes" value={notes} onChange={e=>setNotes(e.target.value)} maxLength={2000} placeholder="Optional"/></div></div>
        </section>
        <div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" onClick={()=>setOpen(false)}>Cancel</Button><Button type="submit" disabled={create.isPending||update.isPending||!patientId||!doctorId||doctorsQuery.isLoading||scheduleQuery.isLoading||(outsideHours&&overrideReason.trim().length<5)}>{(create.isPending||update.isPending)&&<LoaderCircle className="mr-2 size-4 animate-spin"/>}{editing?"Save appointment":"Confirm booking"}</Button></div>
      </form>
    </DialogContent></Dialog>
    <Dialog open={registerOpen} onOpenChange={setRegisterOpen}><DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>Register a new patient</DialogTitle><DialogDescription>Create the patient record for this caller, then return to complete the booking.</DialogDescription></DialogHeader><PatientForm initialPhone={patientPhone} onCancel={()=>setRegisterOpen(false)} onSuccess={()=>{setRegisterOpen(false);void patientQuery.refetch();toast.success("Patient registered. Select the new record to continue.");}} /></DialogContent></Dialog>
    <AlertDialog open={Boolean(removeTarget)} onOpenChange={v=>{if(!v)setRemoveTarget(null);}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete appointment?</AlertDialogTitle><AlertDialogDescription>This permanently removes the appointment for {removeTarget?.patient.fullName}.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={e=>{e.preventDefault();void deleteAppointment();}} className="bg-destructive text-white hover:bg-destructive/90">Delete appointment</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
