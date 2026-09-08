-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "starting_salary" DECIMAL(12,2);

-- Backfill: current salary becomes the baseline going forward. Any
-- appraisals recorded before this migration were never applied to salary,
-- so they aren't replayed retroactively here (their history stays intact,
-- just not reflected in the salary they would have produced).
UPDATE "employees" SET "starting_salary" = "salary" WHERE "starting_salary" IS NULL;
