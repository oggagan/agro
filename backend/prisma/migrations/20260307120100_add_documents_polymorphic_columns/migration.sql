-- AlterTable: documents – add polymorphic relation columns (schema sync)
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "retailerId" UUID;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "retailerLicenseId" UUID;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "distributorId" UUID;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "distributorLicenseId" UUID;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "productId" UUID;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "productSizeId" UUID;
