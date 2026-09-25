import { pathToFileURL } from "node:url";
import { PrismaClient } from "../apps/api/src/generated/prisma/index.js";
import { ROLES, ROLE_PERMISSIONS, PERMISSIONS } from "../packages/shared/src/permissions.js";

export async function syncPermissions(prisma: PrismaClient): Promise<Record<string, string>> {
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
  return roleRecords;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const prisma = new PrismaClient();
  syncPermissions(prisma)
    .then(() => console.log("Roles and permissions synced."))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
