export type DashboardOverview = {
  metrics: {
    totalDoctors: number;
    activeDoctors: number;
    totalPatients: number;
    activePatients: number;
    averagePatientsPerActiveDoctor: number;
    newPatientsThisMonth: number;
    newPatientsLastMonth: number;
    newPatientsChangePercent: number;
    assignedPatients: number;
  };
  patientGrowth: { month: string; patients: number }[];
  patientsByDoctor: { name: string; patients: number }[];
  recentPatients: {
    id: string;
    patientNumber: string;
    firstName: string;
    lastName: string;
    assignedDoctor: string | null;
    createdAt: string;
    status: 'active' | 'inactive';
  }[];
  generatedAt: string;
};

export type DashboardOverviewResponse = {
  success: true;
  data: DashboardOverview;
};
