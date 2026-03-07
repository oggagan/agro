-- AlterTable
ALTER TABLE "inventory_products" ADD COLUMN "mrp" DECIMAL(12,2),
ADD COLUMN "sellingPrice" DECIMAL(12,2),
ADD COLUMN "gstInclusive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "invoiceNumber" TEXT,
ADD COLUMN "invoiceDate" TIMESTAMP(3),
ADD COLUMN "discount" DECIMAL(5,2);
