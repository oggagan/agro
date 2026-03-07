-- AlterTable: directors – add retailerId, distributorId; make manufacturerId nullable (schema sync)
ALTER TABLE "directors" ADD COLUMN IF NOT EXISTS "retailerId" UUID;
ALTER TABLE "directors" ADD COLUMN IF NOT EXISTS "distributorId" UUID;
ALTER TABLE "directors" ALTER COLUMN "manufacturerId" DROP NOT NULL;

-- AlterTable: authorized_persons – same
ALTER TABLE "authorized_persons" ADD COLUMN IF NOT EXISTS "retailerId" UUID;
ALTER TABLE "authorized_persons" ADD COLUMN IF NOT EXISTS "distributorId" UUID;
ALTER TABLE "authorized_persons" ALTER COLUMN "manufacturerId" DROP NOT NULL;
