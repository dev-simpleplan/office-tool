import type { RoleName } from "./permissions";

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
}
