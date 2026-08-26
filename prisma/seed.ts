import argon2 from "argon2";
import { PrismaClient } from "../apps/api/src/generated/prisma/index.js";
import { ROLES, ROLE_PERMISSIONS, PERMISSIONS } from "../packages/shared/src/permissions.js";

const prisma = new PrismaClient();

async function main() {
  for (const key of PERMISSIONS) {
    await prisma.permission.upsert({ where: { key }, update: {}, create: { key } });
  }

  const roleRecords: Record<string, string> = {};
  for (const roleName of ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
    roleRecords[roleName] = role.id;

    const permKeys = ROLE_PERMISSIONS[roleName];
    for (const key of permKeys) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { key } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id, permission: { key: { notIn: permKeys } } },
    });
  }

  const password = await argon2.hash("Password123!");

  const admin1 = await prisma.user.upsert({
    where: { email: "admin1@simpleplan.media" },
    update: {},
    create: { email: "admin1@simpleplan.media", passwordHash: password, roleId: roleRecords.ADMIN! },
  });
  const admin2 = await prisma.user.upsert({
    where: { email: "admin2@simpleplan.media" },
    update: {},
    create: { email: "admin2@simpleplan.media", passwordHash: password, roleId: roleRecords.ADMIN! },
  });
  const teamLead = await prisma.user.upsert({
    where: { email: "teamlead@simpleplan.media" },
    update: {},
    create: { email: "teamlead@simpleplan.media", passwordHash: password, roleId: roleRecords.TEAM_LEAD! },
  });

  await prisma.employee.upsert({
    where: { email: "admin1@simpleplan.media" },
    update: {},
    create: {
      fullName: "Alex Admin",
      jobTitle: "Operations Director",
      email: "admin1@simpleplan.media",
      hireDate: new Date("2021-01-15"),
      salary: 125000,
      userId: admin1.id,
    },
  });
  await prisma.employee.upsert({
    where: { email: "admin2@simpleplan.media" },
    update: {},
    create: {
      fullName: "Jordan Admin",
      jobTitle: "HR Director",
      email: "admin2@simpleplan.media",
      hireDate: new Date("2021-03-01"),
      salary: 118000,
      userId: admin2.id,
    },
  });
  await prisma.employee.upsert({
    where: { email: "teamlead@simpleplan.media" },
    update: {},
    create: {
      fullName: "Taylor Lead",
      jobTitle: "Design Team Lead",
      email: "teamlead@simpleplan.media",
      hireDate: new Date("2022-06-10"),
      salary: 95000,
      userId: teamLead.id,
    },
  });

  const extras = [
    { fullName: "Casey Creative", jobTitle: "Graphic Designer", email: "casey@simpleplan.media", hireDate: new Date("2022-09-01"), salary: 72000 },
    { fullName: "Morgan Writer", jobTitle: "Copywriter", email: "morgan@simpleplan.media", hireDate: new Date("2023-02-15"), salary: 68000 },
    { fullName: "Riley Video", jobTitle: "Video Editor", email: "riley@simpleplan.media", hireDate: new Date("2023-07-20"), salary: 74000 },
  ];
  for (const e of extras) {
    await prisma.employee.upsert({ where: { email: e.email }, update: {}, create: e });
  }

  const departmentNames = ["Development", "Design", "Marketing", "Sales", "HR"];
  const departments: Record<string, string> = {};
  for (const name of departmentNames) {
    const dept = await prisma.department.upsert({
      where: { name },
      update: {},
      create: { name, description: `${name} department` },
    });
    departments[name] = dept.id;
  }

  const designLead = await prisma.employee.findUnique({ where: { email: "teamlead@simpleplan.media" } });

  const teamDefs = [
    { name: "Web Development", departmentName: "Development", description: "Website and app builds" },
    { name: "Creative Studio", departmentName: "Design", teamLeadId: designLead?.id, description: "Graphics and video" },
    { name: "Growth Marketing", departmentName: "Marketing", description: "Campaigns and content" },
    { name: "Sales Team", departmentName: "Sales", description: "Client acquisition" },
  ];
  for (const t of teamDefs) {
    const existing = await prisma.team.findFirst({ where: { name: t.name } });
    if (!existing) {
      await prisma.team.create({
        data: {
          name: t.name,
          departmentId: departments[t.departmentName]!,
          teamLeadId: t.teamLeadId,
          description: t.description,
        },
      });
    }
  }

  const standardSchedule = await prisma.workSchedule.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: { id: "00000000-0000-0000-0000-000000000001", name: "Standard Office" },
  });
  for (let day = 0; day <= 6; day++) {
    const isWorkingDay = day >= 1 && day <= 5;
    await prisma.workScheduleDay.upsert({
      where: { scheduleId_dayOfWeek: { scheduleId: standardSchedule.id, dayOfWeek: day } },
      update: {},
      create: {
        scheduleId: standardSchedule.id,
        dayOfWeek: day,
        isWorkingDay,
        startTime: isWorkingDay ? "09:00" : null,
        endTime: isWorkingDay ? "18:00" : null,
        breakMinutes: isWorkingDay ? 60 : 0,
      },
    });
  }

  const caseyEmployee = await prisma.employee.findUnique({ where: { email: "casey@simpleplan.media" } });
  let caseyUser = await prisma.user.findUnique({ where: { email: "casey@simpleplan.media" } });
  if (!caseyUser) {
    caseyUser = await prisma.user.create({
      data: { email: "casey@simpleplan.media", passwordHash: password, roleId: roleRecords.EMPLOYEE! },
    });
  }
  if (caseyEmployee && !caseyEmployee.userId) {
    await prisma.employee.update({ where: { id: caseyEmployee.id }, data: { userId: caseyUser.id } });
  }

  const allEmployees = await prisma.employee.findMany();
  const byEmail = Object.fromEntries(allEmployees.map((e) => [e.email, e]));
  const devTeam = await prisma.team.findFirst({ where: { name: "Web Development" } });
  const creativeTeam = await prisma.team.findFirst({ where: { name: "Creative Studio" } });
  const marketingTeam = await prisma.team.findFirst({ where: { name: "Growth Marketing" } });

  const projectDefs = [
    {
      name: "Acme Corp Rebrand",
      client: "Acme Corp",
      description: "Full brand refresh including logo, guidelines, and templates.",
      departmentId: departments.Design,
      teamId: creativeTeam?.id,
      projectLeadId: designLead?.id,
      status: "ACTIVE" as const,
      priority: "HIGH" as const,
      tags: ["branding", "design"],
      budget: 45000,
      estimatedHours: 320,
    },
    {
      name: "Website Relaunch",
      client: "Internal",
      description: "Rebuild the marketing site on the new stack.",
      departmentId: departments.Development,
      teamId: devTeam?.id,
      status: "PLANNING" as const,
      priority: "MEDIUM" as const,
      tags: ["web"],
      budget: 30000,
      estimatedHours: 400,
    },
    {
      name: "Q3 Growth Campaign",
      client: "Internal",
      description: "Multi-channel campaign for Q3 lead generation.",
      departmentId: departments.Marketing,
      teamId: marketingTeam?.id,
      status: "ACTIVE" as const,
      priority: "URGENT" as const,
      tags: ["campaign", "marketing"],
      budget: 18000,
      estimatedHours: 150,
    },
    {
      name: "Client Portal MVP",
      client: "Beta Industries",
      description: "Standalone client-facing portal, phase 1.",
      departmentId: departments.Development,
      teamId: devTeam?.id,
      status: "ON_HOLD" as const,
      priority: "LOW" as const,
      tags: ["web", "portal"],
      budget: 60000,
      estimatedHours: 500,
    },
  ];

  const createdProjects: Record<string, string> = {};
  for (const p of projectDefs) {
    let project = await prisma.project.findFirst({ where: { name: p.name } });
    if (!project) {
      project = await prisma.project.create({ data: { ...p, createdById: admin1.id } });
    }
    createdProjects[p.name] = project.id;
  }

  const taskDefs = [
    { title: "Design new logo concepts", project: "Acme Corp Rebrand", assignee: "casey@simpleplan.media", status: "IN_PROGRESS" as const, priority: "HIGH" as const },
    { title: "Draft brand guidelines doc", project: "Acme Corp Rebrand", assignee: "teamlead@simpleplan.media", status: "NOT_STARTED" as const, priority: "MEDIUM" as const },
    { title: "Review Acme legacy assets", project: "Acme Corp Rebrand", assignee: "casey@simpleplan.media", status: "COMPLETED" as const, priority: "LOW" as const },
    { title: "Set up new site scaffolding", project: "Website Relaunch", assignee: "morgan@simpleplan.media", status: "IN_PROGRESS" as const, priority: "HIGH" as const },
    { title: "Migrate blog content", project: "Website Relaunch", assignee: "morgan@simpleplan.media", status: "NOT_STARTED" as const, priority: "MEDIUM" as const },
    { title: "Build homepage components", project: "Website Relaunch", assignee: undefined, status: "BLOCKED" as const, priority: "URGENT" as const },
    { title: "Write Q3 campaign copy", project: "Q3 Growth Campaign", assignee: "morgan@simpleplan.media", status: "IN_PROGRESS" as const, priority: "HIGH" as const },
    { title: "Produce campaign video", project: "Q3 Growth Campaign", assignee: "riley@simpleplan.media", status: "NOT_STARTED" as const, priority: "URGENT" as const },
    { title: "Set up ad tracking", project: "Q3 Growth Campaign", assignee: undefined, status: "NOT_STARTED" as const, priority: "MEDIUM" as const },
    { title: "Wireframe portal dashboard", project: "Client Portal MVP", assignee: "casey@simpleplan.media", status: "CANCELLED" as const, priority: "LOW" as const },
    { title: "Spec out auth flow", project: "Client Portal MVP", assignee: "teamlead@simpleplan.media", status: "NOT_STARTED" as const, priority: "MEDIUM" as const },
    { title: "Weekly internal sync notes", project: undefined, assignee: "casey@simpleplan.media", status: "IN_PROGRESS" as const, priority: "LOW" as const },
  ];

  const createdTasks: Record<string, string> = {};
  for (const t of taskDefs) {
    let task = await prisma.task.findFirst({ where: { title: t.title } });
    if (!task) {
      task = await prisma.task.create({
        data: {
          title: t.title,
          projectId: t.project ? createdProjects[t.project] : undefined,
          assigneeId: t.assignee ? byEmail[t.assignee]?.id : undefined,
          status: t.status,
          priority: t.priority,
          createdById: admin1.id,
          completionDate: t.status === "COMPLETED" ? new Date() : undefined,
        },
      });
    }
    createdTasks[t.title] = task.id;
  }

  const firstTaskId = createdTasks["Design new logo concepts"];
  if (firstTaskId) {
    const existingItems = await prisma.taskChecklistItem.count({ where: { taskId: firstTaskId } });
    if (existingItems === 0) {
      await prisma.taskChecklistItem.createMany({
        data: [
          { taskId: firstTaskId, label: "Sketch 5 rough concepts", isDone: true, order: 0 },
          { taskId: firstTaskId, label: "Get feedback from team lead", isDone: true, order: 1 },
          { taskId: firstTaskId, label: "Refine top 2 concepts", isDone: false, order: 2 },
          { taskId: firstTaskId, label: "Present to client", isDone: false, order: 3 },
        ],
      });
    }
    const existingEntries = await prisma.timeEntry.count({ where: { taskId: firstTaskId } });
    if (existingEntries === 0 && caseyEmployee) {
      await prisma.timeEntry.createMany({
        data: [
          { taskId: firstTaskId, employeeId: caseyEmployee.id, date: new Date("2026-08-18"), hours: 3.5, description: "Initial sketches" },
          { taskId: firstTaskId, employeeId: caseyEmployee.id, date: new Date("2026-08-19"), hours: 2, description: "Refinement pass" },
        ],
      });
    }
    const existingComments = await prisma.taskComment.count({ where: { taskId: firstTaskId } });
    if (existingComments === 0) {
      await prisma.taskComment.createMany({
        data: [
          { taskId: firstTaskId, authorId: teamLead.id, content: "Looking good, focus concepts 2 and 4." },
          { taskId: firstTaskId, authorId: caseyUser.id, content: "Will refine those two by Friday." },
        ],
      });
    }
  }

  console.log("Seed complete.");
  console.log("Demo credentials (password: Password123!):");
  console.log("  admin1@simpleplan.media (ADMIN)");
  console.log("  admin2@simpleplan.media (ADMIN)");
  console.log("  teamlead@simpleplan.media (TEAM_LEAD)");
  console.log("  casey@simpleplan.media (EMPLOYEE)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
