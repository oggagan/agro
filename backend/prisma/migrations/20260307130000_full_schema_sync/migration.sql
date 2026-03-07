-- =============================================================================
-- Full schema sync: bring DB in line with prisma/schema.prisma
-- =============================================================================

-- ─── 1. Missing Enum Types ──────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LicenseCategory') THEN
    CREATE TYPE "LicenseCategory" AS ENUM ('SEEDS', 'INSECTICIDE', 'FERTILIZER');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DistributorType') THEN
    CREATE TYPE "DistributorType" AS ENUM ('STATE_DISTRIBUTOR', 'UNDER_MANUFACTURER', 'UNDER_RETAILER');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductType') THEN
    CREATE TYPE "ProductType" AS ENUM ('PESTICIDE', 'FUNGICIDE', 'PGR', 'NPK', 'FERTILIZER', 'BIO_PESTICIDE', 'BIO_FUNGICIDE', 'BIO_PGR', 'BIO_FERTILIZER');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductStatus') THEN
    CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'PENDING', 'ACTIVE', 'INACTIVE', 'DECLINED', 'REVERIFY');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DoseUnit') THEN
    CREATE TYPE "DoseUnit" AS ENUM ('PER_ACRE', 'PER_HECTARE');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InventoryType') THEN
    CREATE TYPE "InventoryType" AS ENUM ('WAREHOUSE', 'SHOP', 'GODOWN', 'DISTRIBUTION_CENTER');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InventoryStatus') THEN
    CREATE TYPE "InventoryStatus" AS ENUM ('ACTIVE', 'INACTIVE');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StockSourceType') THEN
    CREATE TYPE "StockSourceType" AS ENUM ('MANUFACTURER', 'OTHER');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StockUnit') THEN
    CREATE TYPE "StockUnit" AS ENUM ('KG', 'G', 'L', 'ML', 'PACK', 'BAG', 'BOTTLE', 'QUANTAL');
  END IF;
END $$;

-- ─── 2. Missing Enum Values on existing Role enum ───────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'RETAILER' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Role')) THEN
    ALTER TYPE "Role" ADD VALUE 'RETAILER';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'DISTRIBUTOR' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Role')) THEN
    ALTER TYPE "Role" ADD VALUE 'DISTRIBUTOR';
  END IF;
END $$;

-- ─── 3. Missing Tables ─────────────────────────────────────────────────────

-- retailers
CREATE TABLE IF NOT EXISTS "retailers" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyType" "CompanyType" NOT NULL,
    "gstNumber" TEXT,
    "companyPan" TEXT,
    "isDraft" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "retailers_pkey" PRIMARY KEY ("id")
);

-- retailer_licenses
CREATE TABLE IF NOT EXISTS "retailer_licenses" (
    "id" UUID NOT NULL,
    "retailerId" UUID NOT NULL,
    "category" "LicenseCategory" NOT NULL,
    "licenseNumber" TEXT,
    "validUptoDate" TIMESTAMP(3),
    "createdBy" UUID,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "retailer_licenses_pkey" PRIMARY KEY ("id")
);

-- distributors
CREATE TABLE IF NOT EXISTS "distributors" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "distributorType" "DistributorType" NOT NULL,
    "gstNumber" TEXT,
    "licenseNumber" TEXT,
    "licenseValidUpto" TIMESTAMP(3),
    "manufacturerId" UUID,
    "retailerId" UUID,
    "companyName" TEXT,
    "companyType" "CompanyType",
    "companyPan" TEXT,
    "isDraft" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "distributors_pkey" PRIMARY KEY ("id")
);

-- distributor_licenses
CREATE TABLE IF NOT EXISTS "distributor_licenses" (
    "id" UUID NOT NULL,
    "distributorId" UUID NOT NULL,
    "category" "LicenseCategory" NOT NULL,
    "licenseNumber" TEXT,
    "validUptoDate" TIMESTAMP(3),
    "createdBy" UUID,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "distributor_licenses_pkey" PRIMARY KEY ("id")
);

-- products
CREATE TABLE IF NOT EXISTS "products" (
    "id" UUID NOT NULL,
    "manufacturerId" UUID NOT NULL,
    "productType" "ProductType" NOT NULL,
    "productName" TEXT NOT NULL,
    "technicalName" TEXT NOT NULL,
    "manufacturedById" UUID NOT NULL,
    "marketedById" UUID,
    "description" TEXT NOT NULL,
    "cirNumber" TEXT,
    "gstPercentage" DECIMAL(5,2) NOT NULL,
    "hsnCode" TEXT NOT NULL,
    "recommendedDose" TEXT NOT NULL,
    "doseUnit" "DoseUnit" NOT NULL,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "isDraft" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- product_sizes
CREATE TABLE IF NOT EXISTS "product_sizes" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "quantity" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "bottlesPerCase" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "product_sizes_pkey" PRIMARY KEY ("id")
);

-- product_crops
CREATE TABLE IF NOT EXISTS "product_crops" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "cropName" TEXT NOT NULL,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "product_crops_pkey" PRIMARY KEY ("id")
);

-- inventories
CREATE TABLE IF NOT EXISTS "inventories" (
    "id" UUID NOT NULL,
    "ownerType" VARCHAR(50) NOT NULL,
    "manufacturerId" UUID,
    "retailerId" UUID,
    "distributorId" UUID,
    "name" TEXT NOT NULL,
    "type" "InventoryType" NOT NULL,
    "description" TEXT,
    "status" "InventoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "address1" TEXT NOT NULL,
    "address2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" VARCHAR(6) NOT NULL,
    "contactName" TEXT,
    "contactPhone" VARCHAR(15),
    "contactEmail" VARCHAR(255),
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "inventories_pkey" PRIMARY KEY ("id")
);

-- inventory_products
CREATE TABLE IF NOT EXISTS "inventory_products" (
    "id" UUID NOT NULL,
    "inventoryId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "productSizeId" UUID,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "price" DECIMAL(12,2) NOT NULL,
    "averageCost" DECIMAL(12,2),
    "sourceType" "StockSourceType" NOT NULL,
    "batchNumber" TEXT,
    "mfgDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "purchasedFrom" TEXT,
    "unit" "StockUnit" NOT NULL,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 10,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "inventory_products_pkey" PRIMARY KEY ("id")
);

-- ─── 4. Unique Constraints ─────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS "retailers_userId_key" ON "retailers"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "retailer_licenses_retailerId_category_key" ON "retailer_licenses"("retailerId", "category");
CREATE UNIQUE INDEX IF NOT EXISTS "distributors_userId_key" ON "distributors"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "distributor_licenses_distributorId_category_key" ON "distributor_licenses"("distributorId", "category");
CREATE UNIQUE INDEX IF NOT EXISTS "product_crops_productId_cropName_key" ON "product_crops"("productId", "cropName");

-- directors: missing unique constraints for retailerId+userId and distributorId+userId
CREATE UNIQUE INDEX IF NOT EXISTS "directors_retailerId_userId_key" ON "directors"("retailerId", "userId");
CREATE UNIQUE INDEX IF NOT EXISTS "directors_distributorId_userId_key" ON "directors"("distributorId", "userId");

-- authorized_persons: same
CREATE UNIQUE INDEX IF NOT EXISTS "authorized_persons_retailerId_userId_key" ON "authorized_persons"("retailerId", "userId");
CREATE UNIQUE INDEX IF NOT EXISTS "authorized_persons_distributorId_userId_key" ON "authorized_persons"("distributorId", "userId");

-- ─── 5. Indexes ─────────────────────────────────────────────────────────────

-- retailers
CREATE INDEX IF NOT EXISTS "retailers_userId_idx" ON "retailers"("userId");
CREATE INDEX IF NOT EXISTS "retailers_deletedAt_idx" ON "retailers"("deletedAt");

-- retailer_licenses
CREATE INDEX IF NOT EXISTS "retailer_licenses_retailerId_idx" ON "retailer_licenses"("retailerId");

-- distributors
CREATE INDEX IF NOT EXISTS "distributors_userId_idx" ON "distributors"("userId");
CREATE INDEX IF NOT EXISTS "distributors_deletedAt_idx" ON "distributors"("deletedAt");
CREATE INDEX IF NOT EXISTS "distributors_manufacturerId_idx" ON "distributors"("manufacturerId");
CREATE INDEX IF NOT EXISTS "distributors_retailerId_idx" ON "distributors"("retailerId");

-- distributor_licenses
CREATE INDEX IF NOT EXISTS "distributor_licenses_distributorId_idx" ON "distributor_licenses"("distributorId");

-- products
CREATE INDEX IF NOT EXISTS "products_manufacturerId_idx" ON "products"("manufacturerId");
CREATE INDEX IF NOT EXISTS "products_productType_idx" ON "products"("productType");
CREATE INDEX IF NOT EXISTS "products_status_idx" ON "products"("status");
CREATE INDEX IF NOT EXISTS "products_deletedAt_idx" ON "products"("deletedAt");
CREATE INDEX IF NOT EXISTS "products_hsnCode_idx" ON "products"("hsnCode");

-- product_sizes
CREATE INDEX IF NOT EXISTS "product_sizes_productId_idx" ON "product_sizes"("productId");

-- product_crops
CREATE INDEX IF NOT EXISTS "product_crops_productId_idx" ON "product_crops"("productId");

-- inventories
CREATE INDEX IF NOT EXISTS "inventories_ownerType_idx" ON "inventories"("ownerType");
CREATE INDEX IF NOT EXISTS "inventories_manufacturerId_idx" ON "inventories"("manufacturerId");
CREATE INDEX IF NOT EXISTS "inventories_retailerId_idx" ON "inventories"("retailerId");
CREATE INDEX IF NOT EXISTS "inventories_distributorId_idx" ON "inventories"("distributorId");
CREATE INDEX IF NOT EXISTS "inventories_status_idx" ON "inventories"("status");
CREATE INDEX IF NOT EXISTS "inventories_deletedAt_idx" ON "inventories"("deletedAt");

-- inventory_products
CREATE INDEX IF NOT EXISTS "inventory_products_inventoryId_idx" ON "inventory_products"("inventoryId");
CREATE INDEX IF NOT EXISTS "inventory_products_productId_idx" ON "inventory_products"("productId");
CREATE INDEX IF NOT EXISTS "inventory_products_batchNumber_idx" ON "inventory_products"("batchNumber");
CREATE INDEX IF NOT EXISTS "inventory_products_expiryDate_idx" ON "inventory_products"("expiryDate");
CREATE INDEX IF NOT EXISTS "inventory_products_deletedAt_idx" ON "inventory_products"("deletedAt");

-- directors: missing indexes for retailerId and distributorId
CREATE INDEX IF NOT EXISTS "directors_retailerId_idx" ON "directors"("retailerId");
CREATE INDEX IF NOT EXISTS "directors_distributorId_idx" ON "directors"("distributorId");

-- authorized_persons: same
CREATE INDEX IF NOT EXISTS "authorized_persons_retailerId_idx" ON "authorized_persons"("retailerId");
CREATE INDEX IF NOT EXISTS "authorized_persons_distributorId_idx" ON "authorized_persons"("distributorId");

-- ─── 6. Foreign Keys ───────────────────────────────────────────────────────

-- retailers
ALTER TABLE "retailers" ADD CONSTRAINT "retailers_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- retailer_licenses
ALTER TABLE "retailer_licenses" ADD CONSTRAINT "retailer_licenses_retailerId_fkey"
  FOREIGN KEY ("retailerId") REFERENCES "retailers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- distributors
ALTER TABLE "distributors" ADD CONSTRAINT "distributors_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "distributors" ADD CONSTRAINT "distributors_manufacturerId_fkey"
  FOREIGN KEY ("manufacturerId") REFERENCES "manufacturers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "distributors" ADD CONSTRAINT "distributors_retailerId_fkey"
  FOREIGN KEY ("retailerId") REFERENCES "retailers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- distributor_licenses
ALTER TABLE "distributor_licenses" ADD CONSTRAINT "distributor_licenses_distributorId_fkey"
  FOREIGN KEY ("distributorId") REFERENCES "distributors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- products
ALTER TABLE "products" ADD CONSTRAINT "products_manufacturerId_fkey"
  FOREIGN KEY ("manufacturerId") REFERENCES "manufacturers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_manufacturedById_fkey"
  FOREIGN KEY ("manufacturedById") REFERENCES "manufacturers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_marketedById_fkey"
  FOREIGN KEY ("marketedById") REFERENCES "manufacturers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- product_sizes
ALTER TABLE "product_sizes" ADD CONSTRAINT "product_sizes_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- product_crops
ALTER TABLE "product_crops" ADD CONSTRAINT "product_crops_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- inventories
ALTER TABLE "inventories" ADD CONSTRAINT "inventories_manufacturerId_fkey"
  FOREIGN KEY ("manufacturerId") REFERENCES "manufacturers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventories" ADD CONSTRAINT "inventories_retailerId_fkey"
  FOREIGN KEY ("retailerId") REFERENCES "retailers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventories" ADD CONSTRAINT "inventories_distributorId_fkey"
  FOREIGN KEY ("distributorId") REFERENCES "distributors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- inventory_products
ALTER TABLE "inventory_products" ADD CONSTRAINT "inventory_products_inventoryId_fkey"
  FOREIGN KEY ("inventoryId") REFERENCES "inventories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_products" ADD CONSTRAINT "inventory_products_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- addresses → retailers, distributors
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_retailerId_fkey"
  FOREIGN KEY ("retailerId") REFERENCES "retailers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_distributorId_fkey"
  FOREIGN KEY ("distributorId") REFERENCES "distributors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- bank_details → retailers, distributors
ALTER TABLE "bank_details" ADD CONSTRAINT "bank_details_retailerId_fkey"
  FOREIGN KEY ("retailerId") REFERENCES "retailers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bank_details" ADD CONSTRAINT "bank_details_distributorId_fkey"
  FOREIGN KEY ("distributorId") REFERENCES "distributors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- directors → retailers, distributors
ALTER TABLE "directors" ADD CONSTRAINT "directors_retailerId_fkey"
  FOREIGN KEY ("retailerId") REFERENCES "retailers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "directors" ADD CONSTRAINT "directors_distributorId_fkey"
  FOREIGN KEY ("distributorId") REFERENCES "distributors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- authorized_persons → retailers, distributors
ALTER TABLE "authorized_persons" ADD CONSTRAINT "authorized_persons_retailerId_fkey"
  FOREIGN KEY ("retailerId") REFERENCES "retailers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "authorized_persons" ADD CONSTRAINT "authorized_persons_distributorId_fkey"
  FOREIGN KEY ("distributorId") REFERENCES "distributors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- documents → retailers, retailer_licenses, distributors, distributor_licenses, products, product_sizes
ALTER TABLE "documents" ADD CONSTRAINT "documents_retailerId_fkey"
  FOREIGN KEY ("retailerId") REFERENCES "retailers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_retailerLicenseId_fkey"
  FOREIGN KEY ("retailerLicenseId") REFERENCES "retailer_licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_distributorId_fkey"
  FOREIGN KEY ("distributorId") REFERENCES "distributors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_distributorLicenseId_fkey"
  FOREIGN KEY ("distributorLicenseId") REFERENCES "distributor_licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_productSizeId_fkey"
  FOREIGN KEY ("productSizeId") REFERENCES "product_sizes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
