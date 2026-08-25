import type { FastifyInstance } from "fastify";
import argon2 from "argon2";
import { CreateEmployeeSchema } from "@office/validation";
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
      },
    });
    return reply.send({ employees });
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
      },
    });

    return reply.code(201).send({ employee });
  });
}
