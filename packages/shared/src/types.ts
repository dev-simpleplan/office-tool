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
  dateOfBirth?: string | null;
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
  startingSalary?: number | null;
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

export interface WorkloadResult {
  employeeId: string;
  capacityHours: number | null;
  assignedHours: number;
  utilization: number | null;
  hasSchedule: boolean;
}

export interface UpcomingDateEntry {
  employeeId: string;
  fullName: string;
  date: string;
  nextOccurrence: string;
}

export interface CalendarEvent {
  id: string;
  type: "TASK_DUE" | "PROJECT_START" | "PROJECT_END";
  title: string;
  date: string;
  status?: string;
  refId: string;
}

export interface DashboardTaskItem {
  id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  dueDate?: string | null;
  project?: { id: string; name: string } | null;
}

export interface AdminDashboardData {
  role: "ADMIN";
  employeeCount: number;
  activeEmployeeCount: number;
  departmentCount: number;
  teamCount: number;
  activeProjectCount: number;
  taskCount: number;
  completionRate: number;
  overdueTaskCount: number;
  upcomingBirthdays: UpcomingDateEntry[];
  upcomingAnniversaries: UpcomingDateEntry[];
  companyWorkload: { totalCapacity: number; totalAssigned: number; employeesWithSchedule: number; employeesWithoutSchedule: number };
}

export interface TeamLeadDashboardData {
  role: "TEAM_LEAD";
  teamId: string | null;
  teamName: string | null;
  memberCount: number;
  todaysTasks: DashboardTaskItem[];
  overdueTasks: DashboardTaskItem[];
  blockedTasks: DashboardTaskItem[];
  teamProjects: { id: string; name: string; status: ProjectStatus }[];
  teamHoursThisWeek: number;
  teamWorkload: (WorkloadResult & { fullName: string })[];
}

export interface EmployeeDashboardData {
  role: "EMPLOYEE";
  todaysTasks: DashboardTaskItem[];
  overdueTasks: DashboardTaskItem[];
  completedTaskCount: number;
  hoursLoggedThisWeek: number;
  weeklyProgress: { completed: number; total: number };
  upcomingDeadlines: DashboardTaskItem[];
}

export type DashboardData = AdminDashboardData | TeamLeadDashboardData | EmployeeDashboardData;

export interface EmployeeReport {
  employeeId: string;
  fullName: string;
  start: string;
  end: string;
  tasksCompleted: number;
  totalTasks: number;
  completionRate: number;
  hoursLogged: number;
  estimatedHours: number;
  actualHours: number;
}

export interface TeamReportMember {
  employeeId: string;
  fullName: string;
  capacityHours: number | null;
  assignedHours: number;
  utilization: number | null;
  hasSchedule: boolean;
}

export interface TeamReport {
  teamId: string;
  teamName: string;
  start: string;
  end: string;
  memberCount: number;
  totalCapacityHours: number;
  totalAssignedHours: number;
  utilization: number | null;
  tasksCompleted: number;
  totalTasks: number;
  completionRate: number;
  members: TeamReportMember[];
}

export interface ProjectReport {
  projectId: string;
  projectName: string;
  start: string;
  end: string;
  estimatedHours: number;
  actualHours: number;
  progress: number;
  totalTasks: number;
  statusBreakdown: Record<string, number>;
}

export interface CompanyReport {
  start: string;
  end: string;
  activeProjectCount: number;
  totalTasks: number;
  tasksCompleted: number;
  completionRate: number;
  totalHoursLogged: number;
  totalCapacityHours: number;
  totalAssignedHours: number;
  utilization: number | null;
}
