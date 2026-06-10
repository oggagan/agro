import { z } from 'zod';

const productTypeEnum = z.enum([
  'PESTICIDE',
  'FUNGICIDE',
  'HERBICIDE',
  'BACTERIACIDE',
  'PGR',
  'NPK',
  'FERTILIZER',
  'BIO_PESTICIDE',
  'BIO_FUNGICIDE',
  'BIO_PGR',
  'BIO_FERTILIZER',
]);

const productStatusEnum = z.enum(['DRAFT', 'PENDING', 'ACTIVE', 'INACTIVE', 'DECLINED', 'REVERIFY']);

const doseUnitEnum = z.enum(['PER_ACRE', 'PER_HECTARE', 'PER_LITER_WATER']);

const productSizeSchema = z.object({
  quantity: z.string().min(1, 'Quantity is required'),
  unit: z.string().min(1, 'Unit is required'),
  bottlesPerCase: z.number().int().positive('Bottles per case must be positive'),
});

const productCropSchema = z.object({
  cropName: z.string().min(1, 'Crop name is required'),
  isCustom: z.boolean().optional().default(false),
});

export const createProductSchema = z
  .object({
    manufacturerId: z.string().uuid('Invalid manufacturer ID'),
    productType: productTypeEnum,
    productName: z.string().min(1, 'Product name is required'),
    technicalName: z.string().min(1, 'Technical name is required'),
    manufacturedById: z.string().uuid('Invalid manufactured by ID'),
    marketedById: z.string().uuid().optional().nullable(),
    description: z.string().optional().nullable(),
    cirNumber: z.string().optional().nullable(),
    gstPercentage: z.number().min(0).max(100),
    hsnCode: z.string().min(1, 'HSN code is required'),
    recommendedDose: z.string().min(1, 'Recommended dose is required'),
    doseUnit: doseUnitEnum,
    dosePerLiter: z.string().optional().nullable(),
    sizes: z.array(productSizeSchema).min(1, 'At least one product size is required'),
    crops: z.array(productCropSchema).min(1, 'At least one crop is required'),
    isDraft: z.boolean().optional().default(false),
  })
  .refine(
    (d) => {
      if (d.isDraft) return true;
      return (
        d.sizes.length >= 1 &&
        d.sizes.every((s) => s.quantity && s.unit && s.bottlesPerCase > 0) &&
        d.crops.length >= 1 &&
        d.productName &&
        d.technicalName &&
        d.gstPercentage !== undefined &&
        d.hsnCode &&
        d.recommendedDose &&
        d.doseUnit
      );
    },
    { message: 'When not draft, all required fields must be filled', path: ['sizes'] },
  )
  .refine(
    (d) => {
      if (d.isDraft) return true;
      const needsCir = ['PESTICIDE', 'FUNGICIDE', 'HERBICIDE', 'BACTERIACIDE'].includes(d.productType);
      if (!needsCir) return true;
      return d.cirNumber != null && String(d.cirNumber).trim().length > 0;
    },
    { message: 'CIR number is required for this product type', path: ['cirNumber'] },
  );

export const updateProductSchema = z.object({
  productName: z.string().min(1).optional(),
  technicalName: z.string().min(1).optional(),
  manufacturedById: z.string().uuid().optional(),
  marketedById: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
  cirNumber: z.string().optional().nullable(),
  gstPercentage: z.number().min(0).max(100).optional(),
  hsnCode: z.string().min(1).optional(),
  recommendedDose: z.string().min(1).optional(),
  doseUnit: doseUnitEnum.optional(),
  dosePerLiter: z.string().optional().nullable(),
  sizes: z.array(productSizeSchema).optional(),
  crops: z.array(productCropSchema).optional(),
});

export const updateProductStatusSchema = z.object({
  status: productStatusEnum,
  reason: z.string().optional(),
});

export const listProductsQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  search: z.string().optional(),
  status: productStatusEnum.optional(),
  productType: productTypeEnum.optional(),
  manufacturerId: z.string().uuid().optional(),
});

export const addProductSizeSchema = productSizeSchema;

export const updateProductSizeSchema = z.object({
  quantity: z.string().min(1).optional(),
  unit: z.string().min(1).optional(),
  bottlesPerCase: z.number().int().positive().optional(),
});
