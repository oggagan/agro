-- AlterTable
ALTER TABLE "authorized_persons" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" UUID;

-- CreateIndex
CREATE INDEX "authorized_persons_deletedAt_idx" ON "authorized_persons"("deletedAt");
