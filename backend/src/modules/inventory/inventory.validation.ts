import { z } from 'zod';

const ownerTypeEnum = z.enum(['MANUFACTURER', 'RETAILER', 'DISTRIBUTOR']);
const inventoryTypeEnum = z.enum(['WAREHOUSE', 'SHOP', 'GODOWN', 'DISTRIBUTION_CENTER']);
const inventoryStatusEnum = z.enum(['ACTIVE', 'INACTIVE']);
const stockSourceTypeEnum = z.enum(['MANUFACTURER', 'OTHER']);
const stockUnitEnum = z.enum(['KG', 'G', 'L', 'ML', 'PACK', 'BAG', 'BOTTLE', 'QUANTAL']);

export const createInventorySchema = z
  .object({
    ownerType: ownerTypeEnum,
    manufacturerId: z.string().uuid().optional().nullable(),
    retailerId: z.string().uuid().optional().nullable(),
    distributorId: z.string().uuid().optional().nullable(),
    name: z.string().min(1, 'Name is required'),
    type: inventoryTypeEnum,
    description: z.string().optional().nullable(),
    status: inventoryStatusEnum.optional().default('ACTIVE'),
    address1: z.string().min(1, 'Address line 1 is required'),
    address2: z.string().optional().nullable(),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    pincode: z.string().length(6, 'Pincode must be 6 digits').regex(/^\d+$/),
    contactName: z.string().optional().nullable(),
    contactPhone: z.string().optional().nullable(),
    contactEmail: z.string().email().optional().nullable(),
  })
  .refine(
    (d) => {
      if (d.ownerType === 'MANUFACTURER') return !!d.manufacturerId;
      if (d.ownerType === 'RETAILER') return !!d.retailerId;
      if (d.ownerType === 'DISTRIBUTOR') return !!d.distributorId;
      return true;
    },
    { message: 'Owner ID is required for the selected owner type', path: ['manufacturerId'] },
  );

export const updateInventorySchema = z.object({
  name: z.string().min(1).optional(),
  type: inventoryTypeEnum.optional(),
  description: z.string().optional().nullable(),
  status: inventoryStatusEnum.optional(),
  address1: z.string().min(1).optional(),
  address2: z.string().optional().nullable(),
  city: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  pincode: z.string().length(6).regex(/^\d+$/).optional(),
  contactName: z.string().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
});

export const listInventoriesQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  search: z.string().optional(),
  ownerType: ownerTypeEnum.optional(),
  type: inventoryTypeEnum.optional(),
  status: inventoryStatusEnum.optional(),
});

const optionalDateString = z
  .string()
  .optional()
  .nullable()
  .refine((v) => !v || !Number.isNaN(Date.parse(v)), { message: 'Invalid date' });

export const addInventoryProductSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  productSizeId: z.string().uuid().optional().nullable(),
  stock: z.number().int().min(1, 'Stock must be at least 1'),
  price: z.number().positive('Price must be positive'),
  sourceType: stockSourceTypeEnum,
  batchNumber: z.string().min(1, 'Batch number is required'),
  mfgDate: optionalDateString,
  expiryDate: optionalDateString,
  purchasedFrom: z.string().optional().nullable(),
  mrp: z.number().min(0).optional().nullable(),
  sellingPrice: z.number().min(0).optional().nullable(),
  gstInclusive: z.boolean().optional().default(false),
  invoiceNumber: z.string().optional().nullable(),
  invoiceDate: optionalDateString,
  discount: z.number().min(0).max(100).optional().nullable(),
  unit: stockUnitEnum,
  lowStockThreshold: z.number().int().min(0).optional().default(10),
});

export const addInventoryProductBatchItemSchema = z.object({
  batchNumber: z.string().min(1, 'Batch number is required'),
  mfgDate: optionalDateString,
  expiryDate: optionalDateString,
  stock: z.number().int().min(1, 'Stock must be at least 1'),
  unit: stockUnitEnum,
  price: z.number().positive('Price must be positive'),
  gstInclusive: z.boolean().optional().default(false),
  discount: z.number().min(0).max(100).optional().nullable(),
});

export const addInventoryProductBatchSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  productSizeId: z.string().uuid().optional().nullable(),
  sourceType: stockSourceTypeEnum,
  purchasedFrom: z.string().optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),
  invoiceDate: optionalDateString,
  mrp: z.number().min(0).optional().nullable(),
  sellingPrice: z.number().min(0).optional().nullable(),
  lowStockThreshold: z.number().int().min(0).optional().default(10),
  batches: z.array(addInventoryProductBatchItemSchema).min(1, 'At least one batch is required'),
});

export const updateInventoryProductSchema = z.object({
  stock: z.number().int().min(0).optional(),
  price: z.number().positive().optional(),
  unit: stockUnitEnum.optional(),
  sourceType: stockSourceTypeEnum.optional(),
  batchNumber: z.string().min(1).optional().nullable(),
  mfgDate: optionalDateString,
  expiryDate: optionalDateString,
  purchasedFrom: z.string().optional().nullable(),
  mrp: z.number().min(0).optional().nullable(),
  sellingPrice: z.number().min(0).optional().nullable(),
  gstInclusive: z.boolean().optional(),
  invoiceNumber: z.string().optional().nullable(),
  invoiceDate: optionalDateString,
  discount: z.number().min(0).max(100).optional().nullable(),
  lowStockThreshold: z.number().int().min(0).optional(),
});

export const listInventoryProductsQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  search: z.string().optional(),
  status: z.enum(['inStock', 'lowStock', 'outOfStock']).optional(),
  company: z.string().optional(),
});
