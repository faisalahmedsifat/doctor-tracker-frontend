"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateDoctor, useUpdateDoctor } from "./doctors.queries";
import type { Doctor, DoctorInput } from "./doctors.types";

const formSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(80),
  lastName: z.string().trim().min(1, "Last name is required.").max(80),
  email: z.string().trim().email("Enter a valid email address.").max(254),
  phone: z.string().trim().min(7, "Enter a valid phone number.").max(30),
  specialty: z.string().trim().min(2, "Specialty is required.").max(100),
  licenseNumber: z.string().trim().min(2, "License number is required.").max(50),
  yearsOfExperience: z.coerce.number().int().min(0).max(70),
  consultationFee: z.coerce.number().min(0).max(1000000),
  status: z.enum(["active", "inactive"]),
});
type FormInput = z.input<typeof formSchema>;
type FormValues = z.output<typeof formSchema>;

const fields: { name: keyof FormValues; label: string; placeholder: string; type?: string }[] = [
  { name: "firstName", label: "First name", placeholder: "e.g. Sarah" },
  { name: "lastName", label: "Last name", placeholder: "e.g. Ahmed" },
  { name: "email", label: "Email address", placeholder: "doctor@clinic.com", type: "email" },
  { name: "phone", label: "Phone number", placeholder: "+880 1XXX XXXXXX", type: "tel" },
  { name: "specialty", label: "Specialty", placeholder: "e.g. Cardiology" },
  { name: "licenseNumber", label: "Medical license number", placeholder: "e.g. BM-12345" },
  { name: "yearsOfExperience", label: "Years of experience", placeholder: "5", type: "number" },
  { name: "consultationFee", label: "Consultation fee (BDT)", placeholder: "1000", type: "number" },
];

const emptyValues: FormValues = {
  firstName: "", lastName: "", email: "", phone: "", specialty: "", licenseNumber: "",
  yearsOfExperience: 0, consultationFee: 0, status: "active",
};

export function DoctorForm({ doctor, onSuccess, onCancel }: {
  doctor?: Doctor; onSuccess: () => void; onCancel: () => void;
}) {
  const create = useCreateDoctor();
  const update = useUpdateDoctor();
  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: doctor ? {
      firstName: doctor.firstName, lastName: doctor.lastName, email: doctor.email,
      phone: doctor.phone, specialty: doctor.specialty, licenseNumber: doctor.licenseNumber,
      yearsOfExperience: doctor.yearsOfExperience, consultationFee: doctor.consultationFee,
      status: doctor.status,
    } : emptyValues,
  });
  useEffect(() => { form.reset(doctor ? {
    firstName: doctor.firstName, lastName: doctor.lastName, email: doctor.email,
    phone: doctor.phone, specialty: doctor.specialty, licenseNumber: doctor.licenseNumber,
    yearsOfExperience: doctor.yearsOfExperience, consultationFee: doctor.consultationFee,
    status: doctor.status,
  } : emptyValues); }, [doctor, form]);

  const pending = create.isPending || update.isPending;
  const currentStatus = useWatch({ control: form.control, name: "status" });
  async function submit(values: FormValues) {
    const input: DoctorInput = { ...values, email: values.email.trim().toLowerCase(), licenseNumber: values.licenseNumber.trim().toUpperCase() };
    try {
      if (doctor) await update.mutateAsync({ id: doctor.id, input });
      else await create.mutateAsync(input);
      onSuccess();
    } catch {
      form.setError("root", { message: doctor ? "Unable to update this doctor. Check for duplicate email or license number." : "Unable to create this doctor. Check for duplicate email or license number." });
    }
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.name} className="space-y-1.5">
            <label htmlFor={field.name} className="text-xs font-medium">{field.label}</label>
            <Input id={field.name} type={field.type ?? "text"} placeholder={field.placeholder}
              min={field.type === "number" ? 0 : undefined}
              step={field.name === "consultationFee" ? "0.01" : "1"}
              {...form.register(field.name)} className="h-9 text-sm" />
            {form.formState.errors[field.name] && <p className="text-[11px] text-destructive">{form.formState.errors[field.name]?.message}</p>}
          </div>
        ))}
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Account status</label>
          <Select value={currentStatus} onValueChange={(value) => form.setValue("status", value as "active" | "inactive", { shouldDirty: true })}>
            <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      {form.formState.errors.root && <p role="alert" className="text-xs text-destructive">{form.formState.errors.root.message}</p>}
      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>Cancel</Button>
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircle className="mr-2 size-4 animate-spin" />}
          {doctor ? "Save changes" : "Add doctor"}
        </Button>
      </div>
    </form>
  );
}
