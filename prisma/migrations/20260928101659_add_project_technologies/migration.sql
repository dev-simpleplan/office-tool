-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "technologies" TEXT[] DEFAULT ARRAY[]::TEXT[];
