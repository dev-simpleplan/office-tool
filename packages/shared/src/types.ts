import type { RoleName } from "./permissions.js";

export interface AuthUser {
  id: string;
  email: string;
  roleName: RoleName;
  permissions: string[];
}

export interface EmployeeSummary {
  id: string;
  fullName: string;
  jobTitle: string;
  email: string;
  status: "ACTIVE" | "ARCHIVED";
  hireDate: string;
  salary?: number | null;
  departmentId?: string | null;
  teamId?: string | null;
  scheduleId?: string | null;
  department?: { id: string; name: string } | null;
  team?: { id: string; name: string } | null;
  schedule?: { id: string; name: string } | null;
}

export interface EmployeeDetail extends EmployeeSummary {
  createdAt: string;
  updatedAt: string;
  user?: { id: string; email: string } | null;
}

export interface DepartmentSummary {
  id: string;
  name: string;
  description?: string | null;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
}

export interface TeamMemberSummary {
  id: string;
  fullName: string;
}

export interface TeamSummary {
  id: string;
  name: string;
  description?: string | null;
  status: "ACTIVE" | "ARCHIVED";
  departmentId: string;
  department?: { id: string; name: string } | null;
  teamLeadId?: string | null;
  teamLead?: { id: string; fullName: string } | null;
  members: TeamMemberSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkScheduleDaySummary {
  id: string;
  dayOfWeek: number;
  isWorkingDay: boolean;
  startTime?: string | null;
  endTime?: string | null;
  breakMinutes: number;
}

export interface WorkScheduleSummary {
  id: string;
  name: string;
  status: "ACTIVE" | "ARCHIVED";
  days: WorkScheduleDaySummary[];
  createdAt: string;
  updatedAt: string;
}

export interface AppraisalSummary {
  id: string;
  employeeId: string;
  appraisalDate: string;
  percentageHike: number;
  notes?: string | null;
  createdBy?: { id: string; email: string } | null;
  createdAt: string;
}
