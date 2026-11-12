"use client";

import { useMemo, useState } from "react";
import {
  CirclePlus,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PatientForm } from "@/features/patients/patient-form";
import {
  useDeletePatient,
  usePatients,
} from "@/features/patients/patients.queries";
import type {
  Patient,
  PatientStatus,
} from "@/features/patients/patients.types";

export default function PatientsClient() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | PatientStatus>("all");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<Patient | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);
  const params = useMemo(
    () => ({
      page,
      limit: 10,
      search: search.trim() || undefined,
      status: status === "all" ? undefined : status,
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    [page, search, status],
  );
  const query = usePatients(params);
  const remove = useDeletePatient();
  const patients = query.data?.patients ?? [];
  const pagination = query.data?.pagination;

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await remove.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
      toast.success("Patient deleted.");
    } catch {
      toast.error("Unable to delete this patient.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="size-3.5" />
            Workspace / Patients
          </div>
          <h1 className="text-[26px] font-semibold tracking-tight">Patients</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage patient records and care-team assignments.
          </p>
        </div>
        <Button
          className="h-9 gap-2"
          onClick={() => {
            setSelected(undefined);
            setFormOpen(true);
          }}
        >
          <CirclePlus className="size-4" />
          Add patient
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4 shadow-none">
          <p className="text-xs text-muted-foreground">Total patients</p>
          <p className="mt-1 text-2xl font-semibold">
            {pagination?.total ?? "—"}
          </p>
        </Card>
        <Card className="p-4 shadow-none">
          <p className="text-xs text-muted-foreground">Active on this page</p>
          <p className="mt-1 text-2xl font-semibold">
            {patients.filter((patient) => patient.status === "active").length}
          </p>
        </Card>
        <Card className="p-4 shadow-none">
          <p className="text-xs text-muted-foreground">Assigned to a doctor</p>
          <p className="mt-1 text-2xl font-semibold">
            {patients.filter((patient) => patient.assignedDoctor).length}
          </p>
        </Card>
      </div>
      <Card className="gap-0 overflow-hidden py-0 shadow-none">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Patient directory</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Search by patient name, number, email or phone.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative sm:w-[260px]">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search patients..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="h-9 pl-9 text-xs"
              />
            </div>
            <select
              aria-label="Filter by status"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as "all" | PatientStatus);
                setPage(1);
              }}
              className="h-9 rounded-lg border bg-background px-3 text-xs"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        {query.isError ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <p className="text-sm font-medium">Couldn&apos;t load patients</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void query.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : query.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            Loading patients…
          </div>
        ) : patients.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <p className="text-sm font-medium">No patients found</p>
            <p className="text-xs text-muted-foreground">
              {search || status !== "all"
                ? "Try changing your search or filters."
                : "Add your first patient to start building the directory."}
            </p>
            {!search && status === "all" && (
              <Button
                size="sm"
                onClick={() => {
                  setSelected(undefined);
                  setFormOpen(true);
                }}
              >
                Add your first patient
              </Button>
            )}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="pl-5">Patient</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Date of birth</TableHead>
                  <TableHead>Assigned doctor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="py-3.5 pl-5">
                      <p className="text-xs font-semibold">
                        {patient.firstName} {patient.lastName}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {patient.patientNumber}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs">{patient.phone}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {patient.email ?? "No email"}
                      </p>
                    </TableCell>
                    <TableCell className="text-xs">
                      {patient.dateOfBirth}
                    </TableCell>
                    <TableCell className="text-xs">
                      {patient.assignedDoctor?.fullName ?? "Unassigned"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          patient.status === "active"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }
                      >
                        {patient.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelected(patient);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="mr-2 size-3.5" />
                            Edit patient
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteTarget(patient)}
                          >
                            <Trash2 className="mr-2 size-3.5" />
                            Delete patient
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-[11px] text-muted-foreground">
                Showing {Math.min((page - 1) * 10 + 1, pagination?.total ?? 0)}–
                {Math.min(page * 10, pagination?.total ?? 0)} of{" "}
                {pagination?.total ?? 0} patients
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">
                  Page {page} of {Math.max(1, pagination?.totalPages ?? 1)}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1 || query.isFetching}
                  onClick={() => setPage((value) => value - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={
                    !pagination ||
                    page >= pagination.totalPages ||
                    query.isFetching
                  }
                  onClick={() => setPage((value) => value + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selected ? "Edit patient" : "Add a patient"}
            </DialogTitle>
            <DialogDescription>
              Enter the patient&apos;s demographic and contact details. Only
              collect information required for care.
            </DialogDescription>
          </DialogHeader>
          <PatientForm
            patient={selected}
            onCancel={() => setFormOpen(false)}
            onSuccess={() => {
              setFormOpen(false);
              toast.success(selected ? "Patient updated." : "Patient created.");
            }}
          />
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete patient?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {deleteTarget?.firstName}{" "}
              {deleteTarget?.lastName} from the patient directory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.isPending}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete patient
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
