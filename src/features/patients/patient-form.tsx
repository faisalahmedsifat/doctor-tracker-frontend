"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDoctors } from "@/features/doctors/doctors.queries";
import type { DoctorListParams } from "@/features/doctors/doctors.types";
import { useCreatePatient, useUpdatePatient } from "./patients.queries";
import type { Patient, PatientInput } from "./patients.types";

const schema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(80),
  lastName: z.string().trim().min(1, "Last name is required.").max(80),
  dateOfBirth: z.string().date("Enter a valid date of birth."),
  gender: z.enum(["female", "male", "other", "prefer_not_to_say"]),
  phone: z.string().trim().min(7).max(30),
  email: z.union([z.string().trim().email(), z.literal("")]),
  address: z.string().max(300),
  bloodGroup: z.string(),
  emergencyContactName: z.string().max(120),
  emergencyContactPhone: z.string(),
  assignedDoctorId: z.string(),
  status: z.enum(["active", "inactive"]),
});
type Values = z.infer<typeof schema>;

const blank: Values = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "prefer_not_to_say",
  phone: "",
  email: "",
  address: "",
  bloodGroup: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  assignedDoctorId: "",
  status: "active",
};

const fields = [
  { name: "firstName", label: "First name" },
  { name: "lastName", label: "Last name" },
  { name: "dateOfBirth", label: "Date of birth", type: "date" },
  { name: "phone", label: "Phone number", type: "tel" },
  { name: "email", label: "Email address", type: "email" },
  { name: "address", label: "Address" },
  { name: "emergencyContactName", label: "Emergency contact name" },
  {
    name: "emergencyContactPhone",
    label: "Emergency contact phone",
    type: "tel",
  },
] as const;

export function PatientForm({
  patient,
  onCancel,
  onSuccess,
}: {
  patient?: Patient;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const create = useCreatePatient();
  const update = useUpdatePatient();
  const doctorParams: DoctorListParams = {
    page: 1,
    limit: 100,
    sortBy: "name",
    sortOrder: "asc",
  };
  const doctors = useDoctors(doctorParams);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: blank,
  });
  useEffect(() => {
    form.reset(
      patient
        ? {
            firstName: patient.firstName,
            lastName: patient.lastName,
            dateOfBirth: patient.dateOfBirth,
            gender: patient.gender,
            phone: patient.phone,
            email: patient.email ?? "",
            address: patient.address ?? "",
            bloodGroup: patient.bloodGroup ?? "",
            emergencyContactName: patient.emergencyContactName ?? "",
            emergencyContactPhone: patient.emergencyContactPhone ?? "",
            assignedDoctorId: patient.assignedDoctor?.id ?? "",
            status: patient.status,
          }
        : blank,
    );
  }, [patient, form]);

  async function submit(values: Values) {
    const input: PatientInput = {
      firstName: values.firstName,
      lastName: values.lastName,
      dateOfBirth: values.dateOfBirth,
      gender: values.gender,
      phone: values.phone,
      email: values.email || null,
      address: values.address || null,
      bloodGroup: values.bloodGroup || null,
      emergencyContactName: values.emergencyContactName || null,
      emergencyContactPhone: values.emergencyContactPhone || null,
      assignedDoctorId: values.assignedDoctorId || null,
      status: values.status,
    };
    try {
      if (patient) await update.mutateAsync({ id: patient.id, input });
      else await create.mutateAsync(input);
      onSuccess();
    } catch {
      form.setError("root", {
        message:
          "Unable to save this patient. Please review the details and try again.",
      });
    }
  }
  const pending = create.isPending || update.isPending;
  const genderValue = useWatch({ control: form.control, name: "gender" });
  const bloodGroupValue = useWatch({
    control: form.control,
    name: "bloodGroup",
  });
  const assignedDoctorValue = useWatch({
    control: form.control,
    name: "assignedDoctorId",
  });
  const statusValue = useWatch({ control: form.control, name: "status" });

  return (
    <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.name} className="space-y-1.5">
            <label htmlFor={field.name} className="text-xs font-medium">
              {field.label}
            </label>
            <Input
              id={field.name}
              type={"type" in field ? field.type : "text"}
              {...form.register(field.name)}
              className="h-9 text-sm"
            />
            {form.formState.errors[field.name] && (
              <p className="text-[11px] text-destructive">
                {form.formState.errors[field.name]?.message}
              </p>
            )}
          </div>
        ))}
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Gender</label>
          <Select
            value={genderValue}
            onValueChange={(value) =>
              form.setValue("gender", value as Values["gender"])
            }
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="other">Other</SelectItem>
              <SelectItem value="prefer_not_to_say">
                Prefer not to say
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Blood group</label>
          <Select
            value={bloodGroupValue}
            onValueChange={(value) => form.setValue("bloodGroup", value ?? "")}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Not specified" />
            </SelectTrigger>
            <SelectContent>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                (group) => (
                  <SelectItem key={group} value={group}>
                    {group}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Record status</label>
          <Select
            value={statusValue}
            onValueChange={(value) =>
              form.setValue("status", value as Values["status"])
            }
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-medium">Assigned doctor</label>
          <Select
            value={assignedDoctorValue || "unassigned"}
            onValueChange={(value) =>
              form.setValue(
                "assignedDoctorId",
                value === "unassigned" ? "" : (value ?? ""),
              )
            }
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {doctors.data?.doctors.map((doctor) => (
                <SelectItem key={doctor.id} value={doctor.id}>
                  Dr. {doctor.firstName} {doctor.lastName} · {doctor.specialty}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {form.formState.errors.root && (
        <p role="alert" className="text-xs text-destructive">
          {form.formState.errors.root.message}
        </p>
      )}
      <div className="flex justify-end gap-2 border-t pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircle className="mr-2 size-4 animate-spin" />}
          {patient ? "Save changes" : "Add patient"}
        </Button>
      </div>
    </form>
  );
}
