import type { FastifyInstance } from "fastify";
import argon2 from "argon2";
import {
  CreateEmployeeSchema,
  UpdateEmployeeSchema,
  CreateAppraisalSchema,
  UpdateAppraisalSchema,
} from "@office/validation";
import { prisma } from "../lib/prisma.js";
import { storage } from "../lib/storage.js";
import { Prisma } from "../generated/prisma/index.js";

/** Salary is always derived from startingSalary + the full appraisal
 *  history compounded in date order, recomputed from scratch on every
 *  create/update/delete — never incremented in place — so an edited or
 *  removed appraisal can't leave salary out of sync with what the
 *  recorded history actually implies. */
async function recomputeSalary(employeeId: string) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { startingSalary: true },
  });
  if (!employee?.startingSalary) return;
  const appraisals = await prisma.employeeAppraisal.findMany({
    where: { employeeId },
    orderBy: { appraisalDate: "asc" },
    select: { percentageHike: true },
  });
  let salary = new Prisma.Decimal(employee.startingSalary);
  for (const a of appraisals) {
    salary = salary.plus(salary.mul(a.percentageHike).div(100));
  }
  await prisma.employee.update({ where: { id: employeeId }, data: { salary } });
}

const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function employeeRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: app.requirePermission("employees.view") }, async (req, reply) => {
    const canViewSalary = req.user!.permissions.includes("salary.view");
    const { page, pageSize } = req.query as { page?: string; pageSize?: string };
    const take = Math.min(Math.max(Number(pageSize) || 50, 1), 200);
    const currentPage = Math.max(Number(page) || 1, 1);
    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * take,
      take,
      select: {
        id: true,
        fullName: true,
        jobTitle: true,
        email: true,
        hireDate: true,
        dateOfBirth: true,
        status: true,
        salary: canViewSalary,
        departmentId: true,
        teamId: true,
        scheduleId: true,
        photoStorageKey: true,
        leavesAvailable: true,
        leavesTaken: true,
        department: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
        schedule: { select: { id: true, name: true } },
      },
    }),
      prisma.employee.count(),
    ]);
    return reply.send({
      employees: employees.map(({ photoStorageKey, ...e }) => ({ ...e, hasPhoto: !!photoStorageKey })),
      page: currentPage,
      pageSize: take,
      total,
    });
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
        dateOfBirth: true,
        status: true,
        salary: canViewSalary,
        startingSalary: canViewSalary,
        departmentId: true,
        teamId: true,
        scheduleId: true,
        photoStorageKey: true,
        leavesAvailable: true,
        leavesTaken: true,
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
    const { photoStorageKey, ...rest } = employee;
    return reply.send({ employee: { ...rest, hasPhoto: !!photoStorageKey } });
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
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        salary: data.salary,
        startingSalary: data.salary,
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
    const { dateOfBirth, ...rest } = parsed.data;
    const employee = await prisma.employee.update({
      where: { id },
      data: {
        ...rest,
        ...(dateOfBirth !== undefined ? { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null } : {}),
      },
    });
    return reply.send({ employee });
  });

  app.post("/:id/archive", { preHandler: app.requirePermission("employees.archive") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const employee = await prisma.employee.update({ where: { id }, data: { status: "ARCHIVED" } });
    return reply.send({ employee });
  });

  app.post("/:id/photo", { preHandler: app.requirePermission("employees.update") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const file = await req.file();
    if (!file) {
      return reply.code(400).send({ error: "no_file" });
    }
    if (!ALLOWED_PHOTO_TYPES.has(file.mimetype)) {
      return reply.code(400).send({ error: "unsupported_file_type" });
    }
    const employee = await prisma.employee.findUnique({ where: { id }, select: { photoStorageKey: true } });
    if (!employee) {
      return reply.code(404).send({ error: "not_found" });
    }
    const buffer = await file.toBuffer();
    const key = `employee-photos/${id}.${EXT_BY_TYPE[file.mimetype]}`;
    await storage.put(key, buffer);
    if (employee.photoStorageKey && employee.photoStorageKey !== key) {
      await storage.remove(employee.photoStorageKey);
    }
    await prisma.employee.update({
      where: { id },
      data: { photoStorageKey: key, photoMimeType: file.mimetype },
    });
    return reply.send({ ok: true });
  });

  app.get("/:id/photo", { preHandler: app.requirePermission("employees.view") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const employee = await prisma.employee.findUnique({
      where: { id },
      select: { photoStorageKey: true, photoMimeType: true },
    });
    if (!employee?.photoStorageKey || !employee.photoMimeType) {
      return reply.code(404).send({ error: "no_photo" });
    }
    const buffer = await storage.get(employee.photoStorageKey);
    reply.header("Content-Type", employee.photoMimeType);
    reply.header("Cache-Control", "private, max-age=300");
    return reply.send(buffer);
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
      const employee = await prisma.employee.findUnique({ where: { id }, select: { id: true } });
      if (!employee) {
        return reply.code(404).send({ error: "not_found" });
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
      await recomputeSalary(id);
      return reply.code(201).send({ appraisal });
    },
  );

  app.patch(
    "/:id/appraisals/:appraisalId",
    { preHandler: app.requirePermission("appraisals.create") },
    async (req, reply) => {
      const { id, appraisalId } = req.params as { id: string; appraisalId: string };
      const parsed = UpdateAppraisalSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_input", issues: parsed.error.issues });
      }
      const existing = await prisma.employeeAppraisal.findUnique({ where: { id: appraisalId } });
      if (!existing || existing.employeeId !== id) {
        return reply.code(404).send({ error: "not_found" });
      }
      const appraisal = await prisma.employeeAppraisal.update({
        where: { id: appraisalId },
        data: {
          ...(parsed.data.appraisalDate ? { appraisalDate: new Date(parsed.data.appraisalDate) } : {}),
          ...(parsed.data.percentageHike != null ? { percentageHike: parsed.data.percentageHike } : {}),
          ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
        },
        include: { createdBy: { select: { id: true, email: true } } },
      });
      await recomputeSalary(id);
      return reply.send({ appraisal });
    },
  );

  app.delete(
    "/:id/appraisals/:appraisalId",
    { preHandler: app.requirePermission("appraisals.create") },
    async (req, reply) => {
      const { id, appraisalId } = req.params as { id: string; appraisalId: string };
      const existing = await prisma.employeeAppraisal.findUnique({ where: { id: appraisalId } });
      if (!existing || existing.employeeId !== id) {
        return reply.code(404).send({ error: "not_found" });
      }
      await prisma.employeeAppraisal.delete({ where: { id: appraisalId } });
      await recomputeSalary(id);
      return reply.send({ ok: true });
    },
  );
}
