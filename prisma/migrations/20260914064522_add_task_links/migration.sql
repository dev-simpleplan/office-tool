-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "links" TEXT[] DEFAULT ARRAY[]::TEXT[];
