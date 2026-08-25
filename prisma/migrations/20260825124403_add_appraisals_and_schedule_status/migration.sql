-- AlterTable
ALTER TABLE "work_schedules" ADD COLUMN     "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "employee_appraisals" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "appraisal_date" TIMESTAMP(3) NOT NULL,
    "percentage_hike" DECIMAL(5,2) NOT NULL,
    "notes" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_appraisals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employee_appraisals_employee_id_idx" ON "employee_appraisals"("employee_id");

-- AddForeignKey
ALTER TABLE "employee_appraisals" ADD CONSTRAINT "employee_appraisals_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_appraisals" ADD CONSTRAINT "employee_appraisals_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
