-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "leaves_available" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "leaves_taken" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "photo_mime_type" TEXT,
ADD COLUMN     "photo_storage_key" TEXT;
