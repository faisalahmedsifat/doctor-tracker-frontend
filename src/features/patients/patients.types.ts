export type PatientStatus = "active" | "inactive";
export type Patient = {
  id: string;
  patientNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "female" | "male" | "other" | "prefer_not_to_say";
  phone: string;
  email: string | null;
  address: string | null;
  bloodGroup: string | null;
  condition: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  assignedDoctor: { id: string; fullName: string; specialty: string } | null;
  status: PatientStatus;
  createdAt: string;
  updatedAt: string;
};
export type PatientInput = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Patient["gender"];
  phone: string;
  email?: string | null;
  address?: string | null;
  bloodGroup?: string | null;
  condition?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  assignedDoctorId?: string | null;
  status: PatientStatus;
};
export type PatientListResponse = {
  success: true;
  data: {
    patients: Patient[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
};
export type PatientResponse = { success: true; data: { patient: Patient } };
