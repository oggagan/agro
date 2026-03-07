-- AlterTable: addresses – add retailerId, distributorId; make entityId nullable (schema sync)
ALTER TABLE "addresses" ADD COLUMN IF NOT EXISTS "retailerId" UUID,
ADD COLUMN IF NOT EXISTS "distributorId" UUID;
ALTER TABLE "addresses" ALTER COLUMN "entityId" DROP NOT NULL;

-- CreateIndex (if not exists not supported in older PostgreSQL for indexes; use DO block or ignore errors)
CREATE INDEX IF NOT EXISTS "addresses_retailerId_idx" ON "addresses"("retailerId");
CREATE INDEX IF NOT EXISTS "addresses_distributorId_idx" ON "addresses"("distributorId");

-- AlterTable: bank_details – same
ALTER TABLE "bank_details" ADD COLUMN IF NOT EXISTS "retailerId" UUID,
ADD COLUMN IF NOT EXISTS "distributorId" UUID;
ALTER TABLE "bank_details" ALTER COLUMN "entityId" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "bank_details_retailerId_idx" ON "bank_details"("retailerId");
CREATE INDEX IF NOT EXISTS "bank_details_distributorId_idx" ON "bank_details"("distributorId");
