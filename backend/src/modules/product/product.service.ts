import prisma from '../../config/database.js';
import { AppError } from '../../middleware/error.middleware.js';
import { createAuditLog, createStatusHistory } from '../../utils/audit.js';
import { notDeleted, softDeleteData } from '../../utils/soft-delete.js';
import { getPaginationParams, buildPaginationMeta } from '../../utils/pagination.js';

const productInclude = {
  manufacturer: { select: { id: true, companyName: true } },
  manufacturedBy: { select: { id: true, companyName: true } },
  marketedBy: { select: { id: true, companyName: true } },
  sizes: { include: { documents: { where: { deletedAt: null } } } },
  crops: true,
  documents: { where: { deletedAt: null } },
};

export async function createProduct(
  data: Record<string, any>,
  performedBy: string,
  performedByRole: string,
  manufacturerIdForUser?: string | null,
  ip?: string,
  userAgent?: string,
) {
  let manufacturerId = data.manufacturerId;
  if (performedByRole === 'MANUFACTURER' || performedByRole === 'AUTHORIZED_PERSON') {
    if (!manufacturerIdForUser) throw new AppError('Manufacturer not found for user.', 403, 'FORBIDDEN');
    if (manufacturerId && manufacturerId !== manufacturerIdForUser) {
      throw new AppError('You can only create products for your own manufacturer.', 403, 'FORBIDDEN');
    }
    manufacturerId = manufacturerIdForUser;
  }
  const manufacturedById = data.manufacturedById ?? manufacturerId;
  const marketedById = data.marketedById ?? manufacturedById;

  const status = data.isDraft ? 'DRAFT' : 'PENDING';
  const result = await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        manufacturerId,
        productType: data.productType,
        productName: data.productName,
        technicalName: data.technicalName,
        manufacturedById,
        marketedById: marketedById || null,
        description: (data.description && String(data.description).trim()) ? String(data.description).trim() : null,
        cirNumber: data.cirNumber ?? null,
        gstPercentage: data.gstPercentage,
        hsnCode: data.hsnCode,
        recommendedDose: data.recommendedDose,
        doseUnit: data.doseUnit,
        dosePerLiter: data.dosePerLiter ?? null,
        status: status as any,
        isDraft: data.isDraft ?? false,
        createdBy: performedBy,
      },
    });

    for (const size of data.sizes ?? []) {
      await tx.productSize.create({
        data: {
          productId: product.id,
          quantity: size.quantity,
          unit: size.unit,
          bottlesPerCase: size.bottlesPerCase,
        },
      });
    }

    const cropNames = new Set<string>();
    for (const crop of data.crops ?? []) {
      if (cropNames.has(crop.cropName)) continue;
      cropNames.add(crop.cropName);
      await tx.productCrop.create({
        data: {
          productId: product.id,
          cropName: crop.cropName,
          isCustom: crop.isCustom ?? false,
        },
      });
    }

    return product;
  });

  await createAuditLog({
    action: 'CREATE',
    entityType: 'product',
    entityId: result.id,
    performedBy,
    performedByRole,
    newData: { id: result.id, productName: result.productName, productType: result.productType },
    ipAddress: ip,
    userAgent,
  });

  const full = await prisma.product.findUnique({
    where: { id: result.id },
    include: productInclude,
  });
  return full;
}

export async function listProducts(query: Record<string, unknown>) {
  const { page, limit, skip } = getPaginationParams(query);
  const where: Record<string, any> = { ...notDeleted };

  if (query.status) where.status = query.status;
  if (query.productType) where.productType = query.productType;
  if (query.manufacturerId) where.manufacturerId = query.manufacturerId;

  if (query.search) {
    const search = query.search as string;
    where.OR = [
      { productName: { contains: search, mode: 'insensitive' } },
      { technicalName: { contains: search, mode: 'insensitive' } },
      { hsnCode: { contains: search, mode: 'insensitive' } },
      { cirNumber: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: productInclude,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.count({ where }),
  ]);

  return { data: products, meta: buildPaginationMeta(page, limit, total) };
}

export async function getProductById(id: string) {
  const product = await prisma.product.findFirst({
    where: { id, ...notDeleted },
    include: productInclude,
  });
  if (!product) throw new AppError('Product not found.', 404, 'NOT_FOUND');
  return product;
}

export async function updateProduct(
  id: string,
  data: Record<string, any>,
  performedBy: string,
  performedByRole: string,
  manufacturerIdForUser?: string | null,
  ip?: string,
  userAgent?: string,
) {
  const existing = await prisma.product.findFirst({
    where: { id, ...notDeleted },
    include: { sizes: true, crops: true },
  });
  if (!existing) throw new AppError('Product not found.', 404, 'NOT_FOUND');

  if ((performedByRole === 'MANUFACTURER' || performedByRole === 'AUTHORIZED_PERSON') && manufacturerIdForUser != null) {
    if (existing.manufacturerId !== manufacturerIdForUser) {
      throw new AppError('You can only edit your own manufacturer products.', 403, 'FORBIDDEN');
    }
  }

  const previousData = { ...existing, sizes: existing.sizes, crops: existing.crops };

  await prisma.$transaction(async (tx) => {
    const { sizes, crops, ...productData } = data;
    const updatePayload: Record<string, any> = { ...productData, updatedBy: performedBy };
    if (updatePayload.gstPercentage !== undefined) (updatePayload as any).gstPercentage = updatePayload.gstPercentage;
    if (updatePayload.manufacturedById !== undefined) (updatePayload as any).manufacturedById = updatePayload.manufacturedById;
    if (updatePayload.marketedById !== undefined) (updatePayload as any).marketedById = updatePayload.marketedById;
    delete (updatePayload as any).sizes;
    delete (updatePayload as any).crops;
    if (Object.keys(updatePayload).length > 1) {
      await tx.product.update({ where: { id }, data: updatePayload });
    }

    if (Array.isArray(sizes)) {
      const existingSizeIds = existing.sizes.map((s) => s.id);
      const incomingIds = sizes.filter((s: any) => s.id).map((s: any) => s.id);
      const toDelete = existingSizeIds.filter((sid) => !incomingIds.includes(sid));
      for (const sizeId of toDelete) {
        await tx.productSize.deleteMany({ where: { id: sizeId, productId: id } });
      }
      for (const size of sizes) {
        if (size.id && existingSizeIds.includes(size.id)) {
          await tx.productSize.update({
            where: { id: size.id },
            data: {
              quantity: size.quantity,
              unit: size.unit,
              bottlesPerCase: size.bottlesPerCase,
            },
          });
        } else {
          await tx.productSize.create({
            data: {
              productId: id,
              quantity: size.quantity,
              unit: size.unit,
              bottlesPerCase: size.bottlesPerCase,
            },
          });
        }
      }
    }

    if (Array.isArray(crops)) {
      await tx.productCrop.deleteMany({ where: { productId: id } });
      const cropNames = new Set<string>();
      for (const crop of crops) {
        if (cropNames.has(crop.cropName)) continue;
        cropNames.add(crop.cropName);
        await tx.productCrop.create({
          data: {
            productId: id,
            cropName: crop.cropName,
            isCustom: crop.isCustom ?? false,
          },
        });
      }
    }
  });

  await createAuditLog({
    action: 'UPDATE',
    entityType: 'product',
    entityId: id,
    performedBy,
    performedByRole,
    previousData: { id, productName: previousData.productName },
    newData: { id, productName: data.productName ?? previousData.productName },
    ipAddress: ip,
    userAgent,
  });

  return prisma.product.findUnique({
    where: { id },
    include: productInclude,
  });
}

export async function updateProductStatus(
  id: string,
  status: string,
  reason: string | undefined,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const product = await prisma.product.findFirst({
    where: { id, ...notDeleted },
  });
  if (!product) throw new AppError('Product not found.', 404, 'NOT_FOUND');

  const previousStatus = product.status;

  await prisma.product.update({
    where: { id },
    data: { status: status as any, updatedBy: performedBy },
  });

  await createAuditLog({
    action: 'STATUS_CHANGE',
    entityType: 'product',
    entityId: id,
    performedBy,
    performedByRole,
    previousData: { status: previousStatus },
    newData: { status },
    ipAddress: ip,
    userAgent,
  });

  await createStatusHistory({
    entityType: 'product',
    entityId: id,
    fromStatus: previousStatus,
    toStatus: status,
    reason,
    changedBy: performedBy,
    changedByRole: performedByRole,
  });

  return prisma.product.findUnique({
    where: { id },
    include: productInclude,
  });
}

export async function deleteProduct(id: string, performedBy: string, _performedByRole: string, ip?: string, userAgent?: string) {
  const product = await prisma.product.findFirst({
    where: { id, ...notDeleted },
  });
  if (!product) throw new AppError('Product not found.', 404, 'NOT_FOUND');

  await prisma.product.update({
    where: { id },
    data: softDeleteData(performedBy),
  });

  await createAuditLog({
    action: 'DELETE',
    entityType: 'product',
    entityId: id,
    performedBy,
    performedByRole: _performedByRole,
    previousData: { id, productName: product.productName },
    ipAddress: ip,
    userAgent,
  });

  return { message: 'Product deleted successfully.' };
}

export async function uploadProductDocuments(
  productId: string,
  files: Express.Multer.File[],
  docType: string,
  performedBy: string,
  performedByRole: string,
  manufacturerIdForUser?: string | null,
  ip?: string,
  userAgent?: string,
  productSizeId?: string | null,
) {
  const product = await prisma.product.findFirst({ where: { id: productId, ...notDeleted } });
  if (!product) throw new AppError('Product not found.', 404, 'NOT_FOUND');

  if (performedByRole === 'MANUFACTURER' || performedByRole === 'AUTHORIZED_PERSON') {
    if (product.manufacturerId !== manufacturerIdForUser) {
      throw new AppError('You can only upload documents for your own manufacturer products.', 403, 'FORBIDDEN');
    }
  }

  const docs = await Promise.all(
    files.map((file: any) =>
      prisma.document.create({
        data: {
          entityType: 'product',
          entityId: productId,
          docType,
          fileName: file.originalname,
          filePath: file.path,
          mimeType: file.mimetype,
          fileSize: file.size,
          uploadedBy: performedBy,
          productId,
          productSizeId: productSizeId ?? null,
        },
      }),
    ),
  );

  for (const doc of docs) {
    await createAuditLog({
      action: 'CREATE',
      entityType: 'document',
      entityId: doc.id,
      performedBy,
      performedByRole,
      newData: { id: doc.id, docType: doc.docType, fileName: doc.fileName },
      ipAddress: ip,
      userAgent,
    });
  }

  return { documents: docs, message: 'Documents uploaded.' };
}

export async function deleteProductDocument(
  productId: string,
  docId: string,
  performedBy: string,
  performedByRole: string,
  manufacturerIdForUser?: string | null,
  ip?: string,
  userAgent?: string,
) {
  const doc = await prisma.document.findFirst({
    where: {
      id: docId,
      deletedAt: null,
      productId,
    },
  });
  if (!doc) throw new AppError('Document not found.', 404, 'NOT_FOUND');

  const product = await prisma.product.findFirst({ where: { id: productId, ...notDeleted } });
  if (!product) throw new AppError('Product not found.', 404, 'NOT_FOUND');
  if (performedByRole === 'MANUFACTURER' || performedByRole === 'AUTHORIZED_PERSON') {
    if (product.manufacturerId !== manufacturerIdForUser) {
      throw new AppError('You can only delete documents for your own manufacturer products.', 403, 'FORBIDDEN');
    }
  }

  await prisma.document.update({
    where: { id: docId },
    data: { deletedAt: new Date(), deletedBy: performedBy },
  });

  await createAuditLog({
    action: 'DELETE',
    entityType: 'document',
    entityId: docId,
    performedBy,
    performedByRole,
    previousData: { id: doc.id, docType: doc.docType, fileName: doc.fileName },
    ipAddress: ip,
    userAgent,
  });

  return { message: 'Document deleted successfully.' };
}
