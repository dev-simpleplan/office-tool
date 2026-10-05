-- AlterEnum
ALTER TYPE "ProjectStatus" ADD VALUE 'MAINTENANCE';

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "project_type_id" UUID;

-- CreateTable
CREATE TABLE "project_types" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_types_name_key" ON "project_types"("name");

-- CreateIndex
CREATE INDEX "projects_project_type_id_idx" ON "projects"("project_type_id");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_project_type_id_fkey" FOREIGN KEY ("project_type_id") REFERENCES "project_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed the starting types. Existing projects stay untyped until someone picks one.
INSERT INTO "project_types" ("id", "name") VALUES
  (gen_random_uuid(), 'Active Project'),
  (gen_random_uuid(), 'Maintenance Project');
