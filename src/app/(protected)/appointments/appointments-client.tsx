"use client";

import { useMemo, useState } from "react";
import { CalendarDays, CirclePlus, LoaderCircle, Search, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDoctors } from "@/features/doctors/doctors.queries";
import { usePatients } from "@/features/patients/patients.queries";
import { useAppointments, useCreateAppointment, useDeleteAppointment, useUpdateAppointment } from "@/features/appointments/appointments.queries";
import type { Appointment, AppointmentInput, AppointmentStatus } from "@/features/appointments/appointments.types";

const statuses: AppointmentStatus[] = ["scheduled", "confirmed", "completed", "cancelled", "no_show"];
const statusLabel: Record<AppointmentStatus, string> = {
  scheduled: "Scheduled", confirmed: "Confirmed", completed: "Completed", cancelled: "Cancelled", no_show: "No-show",
};
function localDate(value: string) {
  return new Intl.DateTimeFormat("en-BD", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
function defaultDateTime() {
  const date = new Date(Date.now() + 86_400_000);
  date.setHours(9, 0, 0, 0);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export default function AppointmentsClient() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Appointment | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [startAt, setStartAt] = useState(defaultDateTime);
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const params = useMemo(() => ({
    page, limit: 10, search: search.trim() || undefined,
    status: status === "all" ? undefined : status,
    dateFrom: dateFrom || undefined, dateTo: dateTo || undefined,
    sortOrder: "asc",
  }), [page, search, status, dateFrom, dateTo]);
  const query = useAppointments(params);
  const doctorsQuery = useDoctors({ page: 1, limit: 100, status: "active", sortBy: "name", sortOrder: "asc" });
  const patientsQuery = usePatients({ page: 1, limit: 100, status: "active", sortBy: "createdAt", sortOrder: "desc" });
  const create = useCreateAppointment();
  const update = useUpdateAppointment();
  const remove = useDeleteAppointment();
  const appointments = query.data?.appointments ?? [];
  const pagination = query.data?.pagination;
  const doctors = doctorsQuery.data?.doctors ?? [];
  const patients = patientsQuery.data?.patients ?? [];

  function openCreate() {
    setSelectedAppointment(null); setPatientId(""); setDoctorId(""); setStartAt(defaultDateTime());
    setDurationMinutes("30"); setReason(""); setNotes(""); setFormOpen(true);
  }
  function openEdit(item: Appointment) {
    setSelectedAppointment(item); setPatientId(item.patient.id); setDoctorId(item.doctor.id);
    const date = new Date(item.startAt);
    setStartAt(new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16));
    setDurationMinutes(String(item.durationMinutes)); setReason(item.reason ?? ""); setNotes(item.notes ?? "");
    setFormOpen(true);
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input: AppointmentInput = {
      patientId, doctorId, startAt: new Date(startAt).toISOString(),
      durationMinutes: Number(durationMinutes), reason: reason.trim() || null, notes: notes.trim() || null,
    };
    try {
      if (selectedAppointment) {
        await update.mutateAsync({ id: selectedAppointment.id, input });
        toast.success("Appointment updated.");
      } else {
        await create.mutateAsync(input);
        toast.success("Appointment scheduled.");
      }
      setFormOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to schedule this appointment.");
    }
  }
  async function changeStatus(appointment: Appointment, nextStatus: AppointmentStatus) {
    try { await update.mutateAsync({ id: appointment.id, input: { status: nextStatus } }); toast.success("Appointment status updated."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Unable to update appointment."); }
  }
  async function confirmDelete() {
    if (!deleteTarget) return;
    try { await remove.mutateAsync(deleteTarget.id); setDeleteTarget(null); toast.success("Appointment deleted."); }
    catch { toast.error("Unable to delete appointment."); }
  }

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="size-3.5" /> Workspace / Appointments</div>
        <h1 className="text-[26px] font-semibold tracking-tight">Appointments</h1>
        <p className="mt-1 text-sm text-muted-foreground">Schedule visits, manage doctor availability and track appointment status.</p>
      </div>
      <Button className="h-9 gap-2" onClick={openCreate}><CirclePlus className="size-4" /> Schedule appointment</Button>
    </div>

    <div className="grid gap-3 sm:grid-cols-3">
      <Card className="p-4 shadow-none"><p className="text-xs text-muted-foreground">Appointments in view</p><p className="mt-1 text-2xl font-semibold">{pagination?.total ?? "—"}</p></Card>
      <Card className="p-4 shadow-none"><p className="text-xs text-muted-foreground">Scheduled / confirmed</p><p className="mt-1 text-2xl font-semibold">{appointments.filter((item) => ["scheduled", "confirmed"].includes(item.status)).length}</p></Card>
      <Card className="p-4 shadow-none"><p className="text-xs text-muted-foreground">Completed on this page</p><p className="mt-1 text-2xl font-semibold">{appointments.filter((item) => item.status === "completed").length}</p></Card>
    </div>

    <Card className="gap-0 overflow-hidden py-0 shadow-none">
      <div className="flex flex-col gap-3 border-b p-4">
        <div><h2 className="text-sm font-semibold">Appointment schedule</h2><p className="mt-1 text-xs text-muted-foreground">Filter by date, status or patient and doctor details.</p></div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative"><Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search appointments" placeholder="Search appointments..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="h-9 pl-9 text-xs" /></div>
          <Select value={status} onValueChange={(value) => { setStatus(value ?? "all"); setPage(1); }}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="All statuses" /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{statuses.map((item) => <SelectItem key={item} value={item}>{statusLabel[item]}</SelectItem>)}</SelectContent></Select>
          <Input aria-label="From date" type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="h-9 text-xs" />
          <Input aria-label="To date" type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="h-9 text-xs" />
        </div>
      </div>
      {query.isError ? <div className="flex flex-col items-center gap-3 py-16"><p className="text-sm font-medium">Couldn&apos;t load appointments</p><Button size="sm" variant="outline" onClick={() => void query.refetch()}>Retry</Button></div>
      : query.isLoading ? <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> Loading appointments…</div>
      : appointments.length === 0 ? <div className="flex flex-col items-center gap-3 px-6 py-16 text-center"><CalendarDays className="size-7 text-muted-foreground" /><p className="text-sm font-medium">No appointments found</p><p className="text-xs text-muted-foreground">{search || status !== "all" || dateFrom || dateTo ? "Try adjusting your filters." : "Schedule the first appointment to populate the clinic calendar."}</p><Button size="sm" onClick={openCreate}>Schedule appointment</Button></div>
      : <>
        <Table><TableHeader><TableRow className="bg-muted/30"><TableHead className="pl-5">Date & time</TableHead><TableHead>Patient</TableHead><TableHead>Doctor</TableHead><TableHead>Duration</TableHead><TableHead>Status</TableHead><TableHead className="w-12" /></TableRow></TableHeader>
          <TableBody>{appointments.map((item) => <TableRow key={item.id}>
            <TableCell className="py-3.5 pl-5"><p className="text-xs font-semibold">{localDate(item.startAt)}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{item.reason || "General consultation"}</p></TableCell>
            <TableCell><p className="text-xs font-medium">{item.patient.fullName}</p><p className="text-[10px] text-muted-foreground">{item.patient.patientNumber}</p></TableCell>
            <TableCell><p className="text-xs">{item.doctor.fullName}</p><p className="text-[10px] text-muted-foreground">{item.doctor.specialty}</p></TableCell>
            <TableCell className="text-xs">{item.durationMinutes} min</TableCell>
            <TableCell><Select value={item.status} onValueChange={(value) => { if (value) void changeStatus(item, value as AppointmentStatus); }}><SelectTrigger className="h-8 w-[125px] text-[11px]"><SelectValue /></SelectTrigger><SelectContent>{statuses.map((value) => <SelectItem key={value} value={value}>{statusLabel[value]}</SelectItem>)}</SelectContent></Select></TableCell>
            <TableCell><div className="flex items-center"><Button variant="ghost" size="icon" className="size-8" aria-label={`Edit appointment for ${item.patient.fullName}`} onClick={() => openEdit(item)}><Pencil className="size-3.5" /></Button><Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" aria-label={`Delete appointment for ${item.patient.fullName}`} onClick={() => setDeleteTarget(item)}><Trash2 className="size-3.5" /></Button></div></TableCell>
          </TableRow>)}</TableBody>
        </Table>
        <div className="flex items-center justify-between border-t px-4 py-3"><p className="text-[11px] text-muted-foreground">Showing {Math.min((page - 1) * 10 + 1, pagination?.total ?? 0)}–{Math.min(page * 10, pagination?.total ?? 0)} of {pagination?.total ?? 0} appointments</p><div className="flex items-center gap-2"><span className="text-[11px] text-muted-foreground">Page {page} of {Math.max(1, pagination?.totalPages ?? 1)}</span><Button size="sm" variant="outline" disabled={page <= 1 || query.isFetching} onClick={() => setPage((v) => v - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={!pagination || page >= pagination.totalPages || query.isFetching} onClick={() => setPage((v) => v + 1)}>Next</Button></div></div>
      </>}
    </Card>

    <Dialog open={formOpen} onOpenChange={setFormOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
      <DialogHeader><DialogTitle>{selectedAppointment ? "Edit appointment" : "Schedule an appointment"}</DialogTitle><DialogDescription>Choose an active patient, doctor and future time slot.</DialogDescription></DialogHeader>
      <form className="space-y-4" onSubmit={(event) => void submit(event)}>
        <div className="space-y-1.5"><label className="text-xs font-medium" htmlFor="appointment-patient">Patient</label><select id="appointment-patient" required value={patientId} onChange={(e) => setPatientId(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Select patient</option>{patients.map((item) => <option key={item.id} value={item.id}>{item.firstName} {item.lastName} · {item.patientNumber}</option>)}</select></div>
        <div className="space-y-1.5"><label className="text-xs font-medium" htmlFor="appointment-doctor">Doctor</label><select id="appointment-doctor" required value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Select doctor</option>{doctors.map((item) => <option key={item.id} value={item.id}>Dr. {item.firstName} {item.lastName} · {item.specialty}</option>)}</select></div>
        <div className="grid gap-3 sm:grid-cols-[1fr_140px]"><div className="space-y-1.5"><label className="text-xs font-medium" htmlFor="appointment-start">Date and time</label><Input id="appointment-start" type="datetime-local" required min={defaultDateTime()} value={startAt} onChange={(e) => setStartAt(e.target.value)} /></div><div className="space-y-1.5"><label className="text-xs font-medium" htmlFor="appointment-duration">Duration</label><select id="appointment-duration" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">{[15, 20, 30, 45, 60, 90, 120].map((v) => <option key={v} value={v}>{v} minutes</option>)}</select></div></div>
        <div className="space-y-1.5"><label className="text-xs font-medium" htmlFor="appointment-reason">Reason for visit</label><Input id="appointment-reason" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Follow-up consultation" /></div>
        <div className="space-y-1.5"><label className="text-xs font-medium" htmlFor="appointment-notes">Internal notes</label><textarea id="appointment-notes" maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Optional notes for clinic staff" /></div>
        {(doctorsQuery.isError || patientsQuery.isError) && <p className="text-xs text-destructive">Unable to load doctors or patients. Close and try again.</p>}
        {!doctorsQuery.isLoading && !patientsQuery.isLoading && (!doctors.length || !patients.length) && <p className="text-xs text-muted-foreground">An active doctor and an active patient are required before scheduling.</p>}
        <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button><Button type="submit" disabled={create.isPending || update.isPending || doctorsQuery.isLoading || patientsQuery.isLoading || !doctors.length || !patients.length}>{(create.isPending || update.isPending) && <LoaderCircle className="mr-2 size-4 animate-spin" />}{selectedAppointment ? "Save changes" : "Schedule appointment"}</Button></div>
      </form>
    </DialogContent></Dialog>
    <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete appointment?</AlertDialogTitle><AlertDialogDescription>This permanently removes the appointment for {deleteTarget?.patient.fullName}. This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel><AlertDialogAction disabled={remove.isPending} onClick={(event) => { event.preventDefault(); void confirmDelete(); }} className="bg-destructive text-white hover:bg-destructive/90">{remove.isPending && <LoaderCircle className="mr-2 size-4 animate-spin" />}Delete appointment</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
