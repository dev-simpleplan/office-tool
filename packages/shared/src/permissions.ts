export const ROLES = ["ADMIN", "TEAM_LEAD", "EMPLOYEE"] as const;
export type RoleName = (typeof ROLES)[number];

export const PERMISSIONS = [
  "employees.view",
  "employees.create",
  "employees.update",
  "employees.archive",
  "salary.view",
  "salary.update",
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
  ],
  TEAM_LEAD: ["employees.view"],
  EMPLOYEE: ["employees.view"],
};
