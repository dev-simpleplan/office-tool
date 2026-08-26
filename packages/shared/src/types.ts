import type { RoleName } from "./permissions.js";

export interface AuthUser {
  id: string;
  email: string;
  roleName: RoleName;
  permissions: string[];
  employeeId: string | null;
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
  hasPhoto: boolean;
  leavesAvailable: number;
  leavesTaken: number;
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

export type ProjectStatus =
  | "PLANNING"
  | "NOT_STARTED"
  | "ACTIVE"
  | "ON_HOLD"
  | "COMPLETED"
  | "CANCELLED"
  | "ARCHIVED";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TaskStatus = "NOT_STARTED" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED" | "CANCELLED";

export interface ProjectSummary {
  id: string;
  name: string;
  client?: string | null;
  description?: string | null;
  departmentId?: string | null;
  department?: { id: string; name: string } | null;
  teamId?: string | null;
  team?: { id: string; name: string } | null;
  projectLeadId?: string | null;
  projectLead?: { id: string; fullName: string } | null;
  startDate?: string | null;
  endDate?: string | null;
  budget?: number | null;
  estimatedHours?: number | null;
  status: ProjectStatus;
  priority: Priority;
  tags: string[];
  taskCount: number;
  completedTaskCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetail extends ProjectSummary {
  tasks: TaskSummary[];
}

export interface TaskChecklistItemSummary {
  id: string;
  label: string;
  isDone: boolean;
  order: number;
}

export interface TimeEntrySummary {
  id: string;
  employeeId: string;
  employee?: { id: string; fullName: string } | null;
  date: string;
  hours: number;
  description?: string | null;
  createdAt: string;
}

export interface TaskCommentSummary {
  id: string;
  authorId: string;
  author?: { id: string; email: string } | null;
  content: string;
  createdAt: string;
}

export interface TaskSummary {
  id: string;
  title: string;
  description?: string | null;
  projectId?: string | null;
  project?: { id: string; name: string } | null;
  departmentId?: string | null;
  teamId?: string | null;
  assigneeId?: string | null;
  assignee?: { id: string; fullName: string } | null;
  createdById?: string | null;
  priority: Priority;
  status: TaskStatus;
  startDate?: string | null;
  dueDate?: string | null;
  estimatedHours?: number | null;
  actualHours: number;
  completionDate?: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskDetail extends TaskSummary {
  checklistItems: TaskChecklistItemSummary[];
  timeEntries: TimeEntrySummary[];
  comments: TaskCommentSummary[];
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
