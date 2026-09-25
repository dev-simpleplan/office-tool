import type { FastifyInstance } from "fastify";
import { CreateTeamSchema, UpdateTeamSchema } from "@office/validation";
import { prisma } from "../lib/prisma.js";

const teamInclude = {
  department: { select: { id: true, name: true } },
  teamLead: { select: { id: true, fullName: true } },
  employees: { select: { id: true, fullName: true } },
} as const;

function serializeTeam(team: {
  id: string;
  name: string;
  description: string | null;
  status: string;
  departmentId: string;
  department: { id: string; name: string } | null;
  teamLeadId: string | null;
  teamLead: { id: string; fullName: string } | null;
  employees: { id: string; fullName: string }[];
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: team.id,
    name: team.name,
    description: team.description,
    status: team.status,
    departmentId: team.departmentId,
    department: team.department,
    teamLeadId: team.teamLeadId,
    teamLead: team.teamLead,
    members: team.employees,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
  };
}

/** Employee.teamId is the single source of truth for membership — reassign
 *  it for exactly the given employees, and clear it for anyone previously on
 *  this team who was dropped from the selection. */
async function syncMembers(teamId: string, memberIds: string[]) {
  await prisma.employee.updateMany({
    where: { teamId, id: { notIn: memberIds } },
    data: { teamId: null },
  });
  if (memberIds.length > 0) {
    await prisma.employee.updateMany({
      where: { id: { in: memberIds } },
      data: { teamId },
    });
  }
}

export async function teamRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: app.requirePermission("teams.view") }, async (_req, reply) => {
    const teams = await prisma.team.findMany({ orderBy: { name: "asc" }, include: teamInclude });
    return reply.send({ teams: teams.map(serializeTeam) });
  });

  app.post("/", { preHandler: app.requirePermission("teams.create") }, async (req, reply) => {
    const parsed = CreateTeamSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", issues: parsed.error.issues });
    }
    const { memberIds, ...data } = parsed.data;
    const team = await prisma.team.create({ data, include: teamInclude });
    if (memberIds.length > 0) {
      await syncMembers(team.id, memberIds);
    }
    const fresh = await prisma.team.findUniqueOrThrow({ where: { id: team.id }, include: teamInclude });
    return reply.code(201).send({ team: serializeTeam(fresh) });
  });

  app.patch("/:id", { preHandler: app.requirePermission("teams.update") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = UpdateTeamSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", issues: parsed.error.issues });
    }
    const { memberIds, ...data } = parsed.data;
    await prisma.team.update({ where: { id }, data });
    if (memberIds) {
      await syncMembers(id, memberIds);
    }
    const fresh = await prisma.team.findUniqueOrThrow({ where: { id }, include: teamInclude });
    return reply.send({ team: serializeTeam(fresh) });
  });

  app.post("/:id/archive", { preHandler: app.requirePermission("teams.archive") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const team = await prisma.team.update({ where: { id }, data: { status: "ARCHIVED" }, include: teamInclude });
    return reply.send({ team: serializeTeam(team) });
  });

  app.delete("/:id", { preHandler: app.requirePermission("teams.delete") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await prisma.team.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return reply.code(404).send({ error: "not_found" });
    await prisma.team.delete({ where: { id } });
    return reply.send({ ok: true });
  });
}
