export type DoctorStatus = "active" | "inactive";
export type Doctor = {
  id: string; firstName: string; lastName: string; email: string; phone: string;
  specialty: string; hospital: string; workingHours: { dayOfWeek: number; startTime: string; endTime: string }[]; licenseNumber: string; yearsOfExperience: number;
  consultationFee: number; status: DoctorStatus; createdAt: string; updatedAt: string;
};
export type DoctorInput = Omit<Doctor, "id" | "createdAt" | "updatedAt">;
export type DoctorListResponse = {
  success: true;
  data: { doctors: Doctor[]; pagination: { page: number; limit: number; total: number; totalPages: number } };
};
export type DoctorResponse = { success: true; data: { doctor: Doctor } };
export type DoctorListParams = {
  page: number; limit: number; search?: string; specialty?: string;
  status?: DoctorStatus; sortBy: "name" | "specialty" | "email" | "createdAt" | "consultationFee";
  sortOrder: "asc" | "desc"; dateFrom?: string; dateTo?: string;
};
