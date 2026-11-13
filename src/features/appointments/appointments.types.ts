export type AppointmentStatus = "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
export type Appointment = {
  id: string;
  patient: { id: string; fullName: string; patientNumber: string };
  doctor: { id: string; fullName: string; specialty: string };
  startAt: string;
  endAt: string;
  durationMinutes: number;
  reason: string | null;
  notes: string | null;
  scheduleOverrideReason: string | null;
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
};
export type AppointmentInput = {
  patientId: string;
  doctorId: string;
  startAt: string;
  durationMinutes: number;
  reason?: string | null;
  notes?: string | null;
  scheduleOverrideReason?: string | null;
  status?: AppointmentStatus;
};
export type AppointmentListResponse = {
  success: true;
  data: {
    appointments: Appointment[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
};
export type AppointmentResponse = { success: true; data: { appointment: Appointment } };
