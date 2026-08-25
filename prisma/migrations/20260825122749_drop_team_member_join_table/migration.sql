/*
  Warnings:

  - You are about to drop the `team_members` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "team_members" DROP CONSTRAINT "team_members_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "team_members" DROP CONSTRAINT "team_members_team_id_fkey";

-- DropTable
DROP TABLE "team_members";
