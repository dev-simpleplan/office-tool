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

  console.log("Seed complete.");
  console.log("Demo credentials (password: Password123!):");
  console.log("  admin1@simpleplan.media (ADMIN)");
  console.log("  admin2@simpleplan.media (ADMIN)");
  console.log("  teamlead@simpleplan.media (TEAM_LEAD)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
