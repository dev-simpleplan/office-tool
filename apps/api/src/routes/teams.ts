import type { FastifyInstance } from "fastify";
import { CreateTeamSchema, UpdateTeamSchema } from "@office/validation";
import { prisma } from "../lib/prisma.js";

const teamInclude = {
  department: { select: { id: true, name: true } },
  teamLead: { select: { id: true, fullName: true } },
  members: { include: { employee: { select: { id: true, fullName: true } } } },
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
  members: { employee: { id: string; fullName: string } }[];
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
    members: team.members.map((m) => ({ id: m.employee.id, fullName: m.employee.fullName })),
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
  };
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
    const team = await prisma.team.create({
      data: {
        ...data,
        members: { create: memberIds.map((employeeId: string) => ({ employeeId })) },
      },
      include: teamInclude,
    });
    return reply.code(201).send({ team: serializeTeam(team) });
  });

  app.patch("/:id", { preHandler: app.requirePermission("teams.update") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = UpdateTeamSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", issues: parsed.error.issues });
    }
    const { memberIds, ...data } = parsed.data;
    const team = await prisma.team.update({
      where: { id },
      data: {
        ...data,
        ...(memberIds
          ? {
              members: {
                deleteMany: {},
                create: memberIds.map((employeeId: string) => ({ employeeId })),
              },
            }
          : {}),
      },
      include: teamInclude,
    });
    return reply.send({ team: serializeTeam(team) });
  });

  app.post("/:id/archive", { preHandler: app.requirePermission("teams.archive") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const team = await prisma.team.update({ where: { id }, data: { status: "ARCHIVED" }, include: teamInclude });
    return reply.send({ team: serializeTeam(team) });
  });
}
