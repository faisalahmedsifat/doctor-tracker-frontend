"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, CirclePlus,
  Filter, LoaderCircle, MoreHorizontal, Pencil, Search, Stethoscope, Trash2, Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DoctorForm } from "@/features/doctors/doctor-form";
import { doctorKeys, useDeleteDoctor, useDoctors } from "@/features/doctors/doctors.queries";
import type { Doctor, DoctorStatus } from "@/features/doctors/doctors.types";

const specialties = ["Cardiology", "Dermatology", "Neurology", "Orthopedics", "Pediatrics", "Psychiatry", "General Medicine", "Gynecology", "Ophthalmology", "ENT"];

export default function DoctorsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [specialty, setSpecialty] = useState("all");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<"name" | "specialty" | "email" | "createdAt" | "consultationFee">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [formOpen, setFormOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Doctor | null>(null);
  const deleteDoctor = useDeleteDoctor();

  const params = useMemo(() => ({
    page, limit: 10, search: search.trim() || undefined,
    specialty: specialty === "all" ? undefined : specialty,
    status: status === "all" ? undefined : status as DoctorStatus,
    sortBy, sortOrder,
  }), [page, search, specialty, status, sortBy, sortOrder]);
  const { data, isLoading, isError, isFetching, refetch } = useDoctors(params);
  const doctors = data?.doctors ?? [];
  const pagination = data?.pagination;

  function openCreate() { setSelectedDoctor(undefined); setFormOpen(true); }
  function openEdit(doctor: Doctor) { setSelectedDoctor(doctor); setFormOpen(true); }
  function toggleSort(field: typeof sortBy) {
    if (sortBy === field) setSortOrder((current) => current === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortOrder("asc"); }
    setPage(1);
  }
  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteDoctor.mutateAsync(deleteTarget.id);
      toast.success("Doctor deleted.");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: doctorKeys.all });
    } catch { toast.error("Unable to delete this doctor. Please try again."); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><Stethoscope className="size-3.5" /> Workspace / Doctors</div>
          <h1 className="text-[26px] font-semibold tracking-tight">Doctors</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your clinic&apos;s doctors, specialties and availability.</p>
        </div>
        <Button onClick={openCreate} className="h-9 gap-2"><CirclePlus className="size-4" /> Add doctor</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-border/70 shadow-none"><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs text-muted-foreground">Total doctors</p><p className="mt-1 text-2xl font-semibold">{pagination?.total ?? "—"}</p></div><div className="rounded-lg bg-primary/10 p-2.5 text-primary"><Users className="size-5" /></div></CardContent></Card>
        <Card className="border-border/70 shadow-none"><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs text-muted-foreground">Active on this page</p><p className="mt-1 text-2xl font-semibold">{doctors.filter((doctor) => doctor.status === "active").length}</p></div><div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-700"><Stethoscope className="size-5" /></div></CardContent></Card>
        <Card className="border-border/70 shadow-none"><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs text-muted-foreground">Specialties represented</p><p className="mt-1 text-2xl font-semibold">{new Set(doctors.map((doctor) => doctor.specialty)).size}</p></div><div className="rounded-lg bg-violet-50 p-2.5 text-violet-700"><Filter className="size-5" /></div></CardContent></Card>
      </div>

      <Card className="gap-0 border-border/70 py-0 shadow-none">
        <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center md:justify-between">
          <div><h2 className="text-sm font-semibold">All doctors</h2><p className="mt-1 text-xs text-muted-foreground">Search and manage registered medical professionals.</p></div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative sm:w-[230px]"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search doctors..." className="h-9 pl-9 text-xs" /></div>
            <Select value={specialty} onValueChange={(value) => { setSpecialty(value ?? "all"); setPage(1); }}>
              <SelectTrigger className="h-9 w-full text-xs sm:w-[170px]"><SelectValue placeholder="All specialties" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All specialties</SelectItem>{specialties.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={status} onValueChange={(value) => { setStatus(value ?? "all"); setPage(1); }}>
              <SelectTrigger className="h-9 w-full text-xs sm:w-[130px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
            </Select>
          </div>
        </div>

        {isError ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center"><p className="text-sm font-medium">Couldn&apos;t load doctors</p><p className="text-xs text-muted-foreground">Check your connection and try again.</p><Button variant="outline" size="sm" onClick={() => void refetch()}>Retry</Button></div>
        ) : isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> Loading doctors...</div>
        ) : doctors.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center"><div className="rounded-full bg-muted p-3"><Stethoscope className="size-5 text-muted-foreground" /></div><p className="text-sm font-medium">No doctors found</p><p className="max-w-sm text-xs text-muted-foreground">{search || specialty !== "all" || status !== "all" ? "Try adjusting your search or filters." : "Add your first doctor to start managing your clinic directory."}</p>{!search && specialty === "all" && status === "all" && <Button size="sm" onClick={openCreate}>Add your first doctor</Button>}</div>
        ) : (
          <>
            <Table>
              <TableHeader><TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="pl-5"><button onClick={() => toggleSort("name")} className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider">Doctor {sortBy === "name" ? sortOrder === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : <ArrowUpDown className="size-3" />}</button></TableHead>
                <TableHead><button onClick={() => toggleSort("specialty")} className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider">Specialty {sortBy === "specialty" ? sortOrder === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : <ArrowUpDown className="size-3" />}</button></TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider">Contact</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider">Experience</TableHead>
                <TableHead><button onClick={() => toggleSort("consultationFee")} className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider">Fee {sortBy === "consultationFee" ? sortOrder === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : <ArrowUpDown className="size-3" />}</button></TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider">Status</TableHead><TableHead className="w-10 pr-4" />
              </TableRow></TableHeader>
              <TableBody>
                {doctors.map((doctor) => <TableRow key={doctor.id}>
                  <TableCell className="py-3.5 pl-5"><div className="flex items-center gap-3"><div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{doctor.firstName[0]}{doctor.lastName[0]}</div><div className="min-w-0"><p className="truncate text-xs font-semibold">Dr. {doctor.firstName} {doctor.lastName}</p><p className="mt-0.5 truncate text-[10px] text-muted-foreground">{doctor.licenseNumber}</p></div></div></TableCell>
                  <TableCell><Badge variant="secondary" className="font-normal">{doctor.specialty}</Badge></TableCell>
                  <TableCell><p className="text-xs">{doctor.email}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{doctor.phone}</p></TableCell>
                  <TableCell className="text-xs">{doctor.yearsOfExperience} years</TableCell>
                  <TableCell className="text-xs font-medium">৳{doctor.consultationFee.toLocaleString("en-BD")}</TableCell>
                  <TableCell><Badge variant="secondary" className={doctor.status === "active" ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-50" : "bg-slate-100 text-slate-600 hover:bg-slate-100"}>{doctor.status === "active" ? "Active" : "Inactive"}</Badge></TableCell>
                  <TableCell className="pr-4"><DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button>} /><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => openEdit(doctor)}><Pencil className="mr-2 size-3.5" /> Edit doctor</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(doctor)}><Trash2 className="mr-2 size-3.5" /> Delete doctor</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
                </TableRow>)}
              </TableBody>
            </Table>
            <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] text-muted-foreground">{pagination ? `Showing ${(pagination.page - 1) * pagination.limit + 1}–${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total} doctors` : " "} {isFetching && <LoaderCircle className="ml-1 inline size-3 animate-spin" />}</p>
              <div className="flex items-center justify-between gap-2 sm:justify-end"><span className="text-[11px] text-muted-foreground">Page {pagination?.page ?? page} of {Math.max(1, pagination?.totalPages ?? 1)}</span><Button variant="outline" size="icon" className="size-8" disabled={page <= 1 || isFetching} onClick={() => setPage((value) => value - 1)} aria-label="Previous page"><ChevronLeft className="size-4" /></Button><Button variant="outline" size="icon" className="size-8" disabled={!pagination || page >= pagination.totalPages || isFetching} onClick={() => setPage((value) => value + 1)} aria-label="Next page"><ChevronRight className="size-4" /></Button></div>
            </div>
          </>
        )}
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{selectedDoctor ? "Edit doctor" : "Add a doctor"}</DialogTitle><DialogDescription>{selectedDoctor ? "Update this doctor's professional and contact information." : "Enter the details below to add a doctor to your clinic directory."}</DialogDescription></DialogHeader>
          <DoctorForm doctor={selectedDoctor} onCancel={() => setFormOpen(false)} onSuccess={() => { setFormOpen(false); toast.success(selectedDoctor ? "Doctor updated." : "Doctor created."); }} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete doctor?</AlertDialogTitle><AlertDialogDescription>This will permanently delete Dr. {deleteTarget?.firstName} {deleteTarget?.lastName} from the doctor directory. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={deleteDoctor.isPending}>Cancel</AlertDialogCancel><AlertDialogAction disabled={deleteDoctor.isPending} onClick={(event) => { event.preventDefault(); void confirmDelete(); }} className="bg-destructive text-white hover:bg-destructive/90">{deleteDoctor.isPending && <LoaderCircle className="mr-2 size-4 animate-spin" />}Delete doctor</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
