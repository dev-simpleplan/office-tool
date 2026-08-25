import type { FastifyInstance } from "fastify";
import argon2 from "argon2";
import { CreateEmployeeSchema, UpdateEmployeeSchema, CreateAppraisalSchema } from "@office/validation";
import { prisma } from "../lib/prisma.js";

export async function employeeRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: app.requirePermission("employees.view") }, async (req, reply) => {
    const canViewSalary = req.user!.permissions.includes("salary.view");
    const employees = await prisma.employee.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fullName: true,
        jobTitle: true,
        email: true,
        hireDate: true,
        status: true,
        salary: canViewSalary,
        departmentId: true,
        teamId: true,
        scheduleId: true,
        department: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
        schedule: { select: { id: true, name: true } },
      },
    });
    return reply.send({ employees });
  });

  app.get("/:id", { preHandler: app.requirePermission("employees.view") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const canViewSalary = req.user!.permissions.includes("salary.view");
    const employee = await prisma.employee.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        jobTitle: true,
        email: true,
        hireDate: true,
        status: true,
        salary: canViewSalary,
        departmentId: true,
        teamId: true,
        scheduleId: true,
        createdAt: true,
        updatedAt: true,
        department: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
        schedule: { select: { id: true, name: true } },
        user: { select: { id: true, email: true } },
      },
    });
    if (!employee) {
      return reply.code(404).send({ error: "not_found" });
    }
    return reply.send({ employee });
  });

  app.post("/", { preHandler: app.requirePermission("employees.create") }, async (req, reply) => {
    const parsed = CreateEmployeeSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", issues: parsed.error.issues });
    }
    const data = parsed.data;

    const existing = await prisma.employee.findUnique({ where: { email: data.email } });
    if (existing) {
      return reply.code(409).send({ error: "employee_exists" });
    }

    let userId: string | undefined;
    if (data.createLogin) {
      if (!data.password) {
        return reply.code(400).send({ error: "password_required_for_login" });
      }
      const employeeRole = await prisma.role.findUnique({ where: { name: "EMPLOYEE" } });
      if (!employeeRole) {
        return reply.code(500).send({ error: "role_not_seeded" });
      }
      const passwordHash = await argon2.hash(data.password);
      const user = await prisma.user.create({
        data: { email: data.email, passwordHash, roleId: employeeRole.id },
      });
      userId = user.id;
    }

    const employee = await prisma.employee.create({
      data: {
        fullName: data.fullName,
        jobTitle: data.jobTitle,
        email: data.email,
        hireDate: new Date(data.hireDate),
        salary: data.salary,
        userId,
        departmentId: data.departmentId,
        teamId: data.teamId,
        scheduleId: data.scheduleId,
      },
    });

    return reply.code(201).send({ employee });
  });

  app.patch("/:id", { preHandler: app.requirePermission("employees.update") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = UpdateEmployeeSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", issues: parsed.error.issues });
    }
    const employee = await prisma.employee.update({ where: { id }, data: parsed.data });
    return reply.send({ employee });
  });

  app.post("/:id/archive", { preHandler: app.requirePermission("employees.archive") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const employee = await prisma.employee.update({ where: { id }, data: { status: "ARCHIVED" } });
    return reply.send({ employee });
  });

  app.get(
    "/:id/appraisals",
    { preHandler: app.requirePermission("appraisals.view") },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const appraisals = await prisma.employeeAppraisal.findMany({
        where: { employeeId: id },
        orderBy: { appraisalDate: "desc" },
        include: { createdBy: { select: { id: true, email: true } } },
      });
      return reply.send({ appraisals });
    },
  );

  app.post(
    "/:id/appraisals",
    { preHandler: app.requirePermission("appraisals.create") },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const parsed = CreateAppraisalSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_input", issues: parsed.error.issues });
      }
      const appraisal = await prisma.employeeAppraisal.create({
        data: {
          employeeId: id,
          appraisalDate: new Date(parsed.data.appraisalDate),
          percentageHike: parsed.data.percentageHike,
          notes: parsed.data.notes,
          createdById: req.user!.id,
        },
        include: { createdBy: { select: { id: true, email: true } } },
      });
      return reply.code(201).send({ appraisal });
    },
  );
}
