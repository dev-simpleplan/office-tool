import type { FastifyInstance } from "fastify";
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  EmployeeTaskUpdateSchema,
  CreateChecklistItemSchema,
  UpdateChecklistItemSchema,
  CreateTimeEntrySchema,
  CreateCommentSchema,
} from "@office/validation";
import { prisma } from "../lib/prisma.js";
import { Prisma, TaskStatus, Priority } from "../generated/prisma/index.js";
import { notify, logActivity } from "../lib/notify.js";
import { storage } from "../lib/storage.js";
import { randomUUID } from "node:crypto";

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
// Denylist rather than allowlist: attachments cover arbitrary office docs/images,
// but never anything a browser or OS would treat as executable.
const BLOCKED_ATTACHMENT_TYPES = new Set([
  "application/x-msdownload",
  "application/x-sh",
  "application/x-executable",
  "text/html",
  "application/javascript",
  "text/javascript",
]);

/** Strip path separators and traversal segments so a crafted filename
 *  (e.g. "../../etc/passwd") can never escape the per-task storage prefix. */
function sanitizeFileName(name: string): string {
  return name.replace(/[/\\]/g, "_").replace(/^\.+/, "").slice(-200) || "file";
}

async function employeeUserId(employeeId: string | null | undefined): Promise<string | null> {
  if (!employeeId) return null;
  const employee = await prisma.employee.findUnique({ where: { id: employeeId }, select: { userId: true } });
  return employee?.userId ?? null;
}

function omitStorageKey<T extends { storageKey: string }>(attachment: T): Omit<T, "storageKey"> {
  const clone: Record<string, unknown> = { ...attachment };
  delete clone.storageKey;
  return clone as Omit<T, "storageKey">;
}

const taskInclude = {
  project: { select: { id: true, name: true } },
  assignee: { select: { id: true, fullName: true } },
  timeEntries: { select: { hours: true } },
} satisfies Prisma.TaskInclude;

type TaskWithEntries = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

function serializeTask(t: TaskWithEntries) {
  const { timeEntries, estimatedHours, ...rest } = t;
  return {
    ...rest,
    estimatedHours: estimatedHours === null || estimatedHours === undefined ? null : Number(estimatedHours),
    actualHours: timeEntries.reduce((sum, e) => sum + Number(e.hours), 0),
  };
}

export async function taskRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: app.requirePermission("tasks.view") }, async (req, reply) => {
    const q = req.query as {
      projectId?: string;
      status?: TaskStatus;
      priority?: Priority;
      assigneeId?: string;
      page?: string;
      pageSize?: string;
    };
    // Spec draws a hard line between ADMIN "view all tasks" and EMPLOYEE
    // "view their tasks" (sections 12/14) — TEAM_LEAD gets the same
    // company-wide view as ADMIN for now, matching the Projects decision.
    const isScopedToOwnTasks = req.user!.roleName === "EMPLOYEE";
    const where = {
      ...(q.projectId ? { projectId: q.projectId } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(q.priority ? { priority: q.priority } : {}),
      ...(q.assigneeId ? { assigneeId: q.assigneeId } : {}),
      ...(isScopedToOwnTasks ? { assigneeId: req.user!.employeeId ?? "__none__" } : {}),
    };
    const take = Math.min(Math.max(Number(q.pageSize) || 50, 1), 200);
    const currentPage = Math.max(Number(q.page) || 1, 1);
    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: taskInclude,
        orderBy: { createdAt: "desc" },
        skip: (currentPage - 1) * take,
        take,
      }),
      prisma.task.count({ where }),
    ]);
    return reply.send({ tasks: tasks.map(serializeTask), page: currentPage, pageSize: take, total });
  });

  app.get("/:id", { preHandler: app.requirePermission("tasks.view") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        ...taskInclude,
        checklistItems: { orderBy: { order: "asc" } },
        timeEntries: { include: { employee: { select: { id: true, fullName: true } } }, orderBy: { date: "desc" } },
        comments: { include: { author: { select: { id: true, email: true } } }, orderBy: { createdAt: "asc" } },
        activities: { include: { actor: { select: { id: true, email: true } } }, orderBy: { createdAt: "desc" } },
        attachments: {
          include: { uploadedBy: { select: { id: true, email: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!task) return reply.code(404).send({ error: "not_found" });
    if (req.user!.roleName === "EMPLOYEE" && task.assigneeId !== req.user!.employeeId) {
      return reply.code(403).send({ error: "forbidden", reason: "not_your_task" });
    }
    const serialized = serializeTask(task);
    return reply.send({
      task: {
        ...serialized,
        checklistItems: task.checklistItems,
        timeEntries: task.timeEntries.map((e) => ({ ...e, hours: Number(e.hours) })),
        comments: task.comments,
        activities: task.activities,
        attachments: task.attachments.map((a) => omitStorageKey(a)),
      },
    });
  });

  app.post("/", { preHandler: app.requirePermission("tasks.create") }, async (req, reply) => {
    const parsed = CreateTaskSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_input", issues: parsed.error.issues });
    const { startDate, dueDate, ...data } = parsed.data;
    const task = await prisma.task.create({
      data: {
        ...data,
        startDate: startDate ? new Date(startDate) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        createdById: req.user!.id,
      },
      include: taskInclude,
    });
    await logActivity({ taskId: task.id, actorId: req.user!.id, action: "created" });
    if (task.assigneeId) {
      const assigneeUserId = await employeeUserId(task.assigneeId);
      if (assigneeUserId) {
        await notify({
          userId: assigneeUserId,
          type: "TASK_ASSIGNED",
          title: `You were assigned: ${task.title}`,
          relatedTaskId: task.id,
        });
      }
    }
    return reply.code(201).send({ task: serializeTask(task) });
  });

  app.patch("/:id", { preHandler: app.requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const user = req.user!;
    if (!user.permissions.includes("tasks.update")) {
      return reply.code(403).send({ error: "forbidden", missing: "tasks.update" });
    }
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: "not_found" });

    // EMPLOYEE role holds tasks.update scoped to their own assigned tasks only
    // (field-level restriction below); ADMIN/TEAM_LEAD get unrestricted update.
    const canUpdateAny = user.roleName !== "EMPLOYEE";

    if (canUpdateAny) {
      const parsed = UpdateTaskSchema.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: "invalid_input", issues: parsed.error.issues });
      const { startDate, dueDate, status, ...data } = parsed.data;
      const task = await prisma.task.update({
        where: { id },
        data: {
          ...data,
          ...(status !== undefined
            ? { status, completionDate: status === "COMPLETED" ? new Date() : null }
            : {}),
          ...(startDate !== undefined ? { startDate: startDate ? new Date(startDate) : null } : {}),
          ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
        },
        include: taskInclude,
      });

      if (status !== undefined && status !== existing.status) {
        await logActivity({
          taskId: id,
          actorId: user.id,
          action: "status_changed",
          fromValue: existing.status,
          toValue: status,
        });
        if (status === "COMPLETED" && task.createdById && task.createdById !== user.id) {
          await notify({
            userId: task.createdById,
            type: "TASK_COMPLETED",
            title: `Task completed: ${task.title}`,
            relatedTaskId: task.id,
          });
        }
      }

      if (data.assigneeId !== undefined && data.assigneeId !== existing.assigneeId) {
        const isFirstAssignment = !existing.assigneeId;
        await logActivity({
          taskId: id,
          actorId: user.id,
          action: isFirstAssignment ? "assigned" : "reassigned",
          fromValue: existing.assigneeId,
          toValue: data.assigneeId,
        });
        const [oldUserId, newUserId] = await Promise.all([
          employeeUserId(existing.assigneeId),
          employeeUserId(data.assigneeId),
        ]);
        if (isFirstAssignment) {
          if (newUserId) {
            await notify({
              userId: newUserId,
              type: "TASK_ASSIGNED",
              title: `You were assigned: ${task.title}`,
              relatedTaskId: task.id,
            });
          }
        } else {
          if (oldUserId) {
            await notify({
              userId: oldUserId,
              type: "TASK_REASSIGNED",
              title: `Reassigned away from you: ${task.title}`,
              relatedTaskId: task.id,
            });
          }
          if (newUserId) {
            await notify({
              userId: newUserId,
              type: "TASK_REASSIGNED",
              title: `You were assigned: ${task.title}`,
              relatedTaskId: task.id,
            });
          }
        }
      }

      return reply.send({ task: serializeTask(task) });
    }

    // EMPLOYEE path: only permitted on their own assigned task, and only status/checklist-adjacent fields.
    if (!user.employeeId || existing.assigneeId !== user.employeeId) {
      return reply.code(403).send({ error: "forbidden", reason: "not_assignee" });
    }
    const allowedKeys = new Set(["status", "description"]);
    const bodyKeys = Object.keys((req.body as Record<string, unknown>) ?? {});
    const disallowed = bodyKeys.filter((k) => !allowedKeys.has(k));
    if (disallowed.length > 0) {
      return reply.code(403).send({ error: "forbidden", reason: "field_not_permitted", fields: disallowed });
    }
    const parsed = EmployeeTaskUpdateSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_input", issues: parsed.error.issues });
    const { status, ...data } = parsed.data;
    const task = await prisma.task.update({
      where: { id },
      data: {
        ...data,
        ...(status !== undefined
          ? { status, completionDate: status === "COMPLETED" ? new Date() : null }
          : {}),
      },
      include: taskInclude,
    });

    if (status !== undefined && status !== existing.status) {
      await logActivity({
        taskId: id,
        actorId: user.id,
        action: "status_changed",
        fromValue: existing.status,
        toValue: status,
      });
      if (status === "COMPLETED" && task.createdById && task.createdById !== user.id) {
        await notify({
          userId: task.createdById,
          type: "TASK_COMPLETED",
          title: `Task completed: ${task.title}`,
          relatedTaskId: task.id,
        });
      }
    }

    return reply.send({ task: serializeTask(task) });
  });

  app.post("/:id/checklist", { preHandler: app.requirePermission("tasks.view") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return reply.code(404).send({ error: "not_found" });
    const user = req.user!;
    if (!user.permissions.includes("tasks.update") && task.assigneeId !== user.employeeId) {
      return reply.code(403).send({ error: "forbidden" });
    }
    const parsed = CreateChecklistItemSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_input", issues: parsed.error.issues });
    const item = await prisma.taskChecklistItem.create({ data: { taskId: id, ...parsed.data } });
    return reply.code(201).send({ item });
  });

  app.patch("/:id/checklist/:itemId", { preHandler: app.requirePermission("tasks.view") }, async (req, reply) => {
    const { id, itemId } = req.params as { id: string; itemId: string };
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return reply.code(404).send({ error: "not_found" });
    const user = req.user!;
    if (!user.permissions.includes("tasks.update") && task.assigneeId !== user.employeeId) {
      return reply.code(403).send({ error: "forbidden" });
    }
    const parsed = UpdateChecklistItemSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_input", issues: parsed.error.issues });
    const item = await prisma.taskChecklistItem.update({ where: { id: itemId }, data: parsed.data });
    return reply.send({ item });
  });

  app.delete("/:id/checklist/:itemId", { preHandler: app.requirePermission("tasks.update") }, async (req, reply) => {
    const { itemId } = req.params as { id: string; itemId: string };
    await prisma.taskChecklistItem.delete({ where: { id: itemId } });
    return reply.send({ ok: true });
  });

  app.post("/:id/time-entries", { preHandler: app.requirePermission("time_entries.create") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return reply.code(404).send({ error: "not_found" });
    const user = req.user!;
    const parsed = CreateTimeEntrySchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_input", issues: parsed.error.issues });

    const canLogForOthers = user.permissions.includes("tasks.update");
    let employeeId = parsed.data.employeeId ?? user.employeeId ?? undefined;
    if (!canLogForOthers) {
      if (!user.employeeId) return reply.code(403).send({ error: "forbidden", reason: "no_employee_record" });
      if (task.assigneeId !== user.employeeId) {
        return reply.code(403).send({ error: "forbidden", reason: "not_assignee" });
      }
      employeeId = user.employeeId;
    }
    if (!employeeId) return reply.code(400).send({ error: "invalid_input", issues: [{ message: "employeeId required" }] });

    const entry = await prisma.timeEntry.create({
      data: {
        taskId: id,
        employeeId,
        date: new Date(parsed.data.date),
        hours: parsed.data.hours,
        description: parsed.data.description,
      },
      include: { employee: { select: { id: true, fullName: true } } },
    });
    return reply.code(201).send({ entry: { ...entry, hours: Number(entry.hours) } });
  });

  app.post("/:id/comments", { preHandler: app.requirePermission("tasks.view") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return reply.code(404).send({ error: "not_found" });
    const parsed = CreateCommentSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_input", issues: parsed.error.issues });
    const comment = await prisma.taskComment.create({
      data: { taskId: id, authorId: req.user!.id, content: parsed.data.content },
      include: { author: { select: { id: true, email: true } } },
    });
    await logActivity({ taskId: id, actorId: req.user!.id, action: "comment_added" });
    if (task.assigneeId) {
      const assigneeUserId = await employeeUserId(task.assigneeId);
      if (assigneeUserId && assigneeUserId !== req.user!.id) {
        await notify({
          userId: assigneeUserId,
          type: "COMMENT_ADDED",
          title: `New comment on: ${task.title}`,
          body: parsed.data.content.slice(0, 200),
          relatedTaskId: task.id,
        });
      }
    }
    return reply.code(201).send({ comment });
  });

  app.post("/:id/attachments", { preHandler: app.requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return reply.code(404).send({ error: "not_found" });
    const user = req.user!;
    const canUpdateAny = user.permissions.includes("tasks.update") && user.roleName !== "EMPLOYEE";
    const isOwnTask = task.assigneeId && task.assigneeId === user.employeeId;
    if (!canUpdateAny && !isOwnTask) {
      return reply.code(403).send({ error: "forbidden" });
    }
    const file = await req.file();
    if (!file) return reply.code(400).send({ error: "no_file" });
    if (BLOCKED_ATTACHMENT_TYPES.has(file.mimetype)) {
      return reply.code(400).send({ error: "unsupported_file_type" });
    }
    const buffer = await file.toBuffer();
    if (buffer.length > MAX_ATTACHMENT_SIZE) {
      return reply.code(400).send({ error: "file_too_large" });
    }
    const safeName = sanitizeFileName(file.filename);
    const key = `task-attachments/${id}/${randomUUID()}-${safeName}`;
    await storage.put(key, buffer);
    const attachment = await prisma.taskAttachment.create({
      data: {
        taskId: id,
        fileName: safeName,
        fileSize: buffer.length,
        mimeType: file.mimetype,
        storageKey: key,
        uploadedById: user.id,
      },
      include: { uploadedBy: { select: { id: true, email: true } } },
    });
    return reply.code(201).send({ attachment: omitStorageKey(attachment) });
  });

  app.get("/:id/attachments/:attachmentId", { preHandler: app.requireAuth }, async (req, reply) => {
    const { id, attachmentId } = req.params as { id: string; attachmentId: string };
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return reply.code(404).send({ error: "not_found" });
    const user = req.user!;
    const canViewAny = user.permissions.includes("tasks.view") && user.roleName !== "EMPLOYEE";
    const isOwnTask = task.assigneeId && task.assigneeId === user.employeeId;
    if (!canViewAny && !isOwnTask) {
      return reply.code(403).send({ error: "forbidden" });
    }
    const attachment = await prisma.taskAttachment.findUnique({ where: { id: attachmentId } });
    if (!attachment || attachment.taskId !== id) {
      return reply.code(404).send({ error: "not_found" });
    }
    const buffer = await storage.get(attachment.storageKey);
    reply.header("Content-Type", attachment.mimeType);
    reply.header("Content-Disposition", `attachment; filename="${attachment.fileName}"`);
    reply.header("Cache-Control", "private, max-age=300");
    return reply.send(buffer);
  });
}
