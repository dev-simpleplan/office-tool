export const ROLES = ["ADMIN", "TEAM_LEAD", "EMPLOYEE"] as const;
export type RoleName = (typeof ROLES)[number];

export const PERMISSIONS = [
  "employees.view",
  "employees.create",
  "employees.update",
  "employees.archive",
  "salary.view",
  "salary.update",
  "departments.view",
  "departments.create",
  "departments.update",
  "departments.archive",
  "teams.view",
  "teams.create",
  "teams.update",
  "teams.archive",
  "schedules.view",
  "schedules.create",
  "schedules.update",
] as const;
export type PermissionName = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<RoleName, PermissionName[]> = {
  ADMIN: [
    "employees.view",
    "employees.create",
    "employees.update",
    "employees.archive",
    "salary.view",
    "salary.update",
    "departments.view",
    "departments.create",
    "departments.update",
    "departments.archive",
    "teams.view",
    "teams.create",
    "teams.update",
    "teams.archive",
    "schedules.view",
    "schedules.create",
    "schedules.update",
  ],
  TEAM_LEAD: ["employees.view", "departments.view", "teams.view", "schedules.view"],
  EMPLOYEE: ["employees.view", "departments.view", "teams.view", "schedules.view"],
};
