import prisma from '../../config/database.js';
import { AppError } from '../../middleware/error.middleware.js';
import { createAuditLog } from '../../utils/audit.js';
import { notDeleted, softDeleteData } from '../../utils/soft-delete.js';
import { getPaginationParams, buildPaginationMeta } from '../../utils/pagination.js';

const inventoryInclude = {
  manufacturer: { select: { id: true, companyName: true } },
  retailer: { select: { id: true, companyName: true } },
  distributor: { select: { id: true, companyName: true } },
};

function parseOptionalDate(s: string | null | undefined): Date | null {
  if (s == null || s === '') return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export async function createInventory(
  data: Record<string, any>,
  performedBy: string,
  _performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const manufacturerId = data.ownerType === 'MANUFACTURER' ? data.manufacturerId : null;
  const retailerId = data.ownerType === 'RETAILER' ? data.retailerId : null;
  const distributorId = data.ownerType === 'DISTRIBUTOR' ? data.distributorId : null;

  if (manufacturerId) {
    const m = await prisma.manufacturer.findFirst({ where: { id: manufacturerId, ...notDeleted } });
    if (!m) throw new AppError('Manufacturer not found.', 404, 'NOT_FOUND');
  }
  if (retailerId) {
    const r = await prisma.retailer.findFirst({ where: { id: retailerId, ...notDeleted } });
    if (!r) throw new AppError('Retailer not found.', 404, 'NOT_FOUND');
  }
  if (distributorId) {
    const d = await prisma.distributor.findFirst({ where: { id: distributorId, ...notDeleted } });
    if (!d) throw new AppError('Distributor not found.', 404, 'NOT_FOUND');
  }

  const inventory = await prisma.inventory.create({
    data: {
      ownerType: data.ownerType,
      manufacturerId,
      retailerId,
      distributorId,
      name: data.name,
      type: data.type,
      description: data.description ?? null,
      status: (data.status ?? 'ACTIVE') as any,
      address1: data.address1,
      address2: data.address2 ?? null,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      contactName: data.contactName ?? null,
      contactPhone: data.contactPhone ?? null,
      contactEmail: data.contactEmail ?? null,
      createdBy: performedBy,
    },
  });

  await createAuditLog({
    action: 'CREATE',
    entityType: 'inventory',
    entityId: inventory.id,
    performedBy,
    performedByRole: _performedByRole,
    newData: { id: inventory.id, name: inventory.name, type: inventory.type },
    ipAddress: ip,
    userAgent,
  });

  return prisma.inventory.findUnique({
    where: { id: inventory.id },
    include: inventoryInclude,
  });
}

export async function listInventories(query: Record<string, unknown>) {
  const { page, limit, skip } = getPaginationParams(query);
  const where: Record<string, any> = { ...notDeleted };

  if (query.status) where.status = query.status;
  if (query.ownerType) where.ownerType = query.ownerType;
  if (query.type) where.type = query.type;

  if (query.search) {
    const search = query.search as string;
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } },
      { state: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [inventories, total] = await Promise.all([
    prisma.inventory.findMany({
      where,
      include: {
        ...inventoryInclude,
        _count: { select: { products: true } },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.inventory.count({ where }),
  ]);

  const withCounts = await Promise.all(
    inventories.map(async (inv) => {
      const products = await prisma.inventoryProduct.findMany({
        where: { inventoryId: inv.id, ...notDeleted },
        select: { stock: true, lowStockThreshold: true },
      });
      let lowStockCount = 0;
      let outOfStockCount = 0;
      for (const p of products) {
        if (p.stock === 0) outOfStockCount++;
        else if (p.stock <= p.lowStockThreshold) lowStockCount++;
      }
      return { ...inv, lowStockCount, outOfStockCount };
    }),
  );

  return { data: withCounts, meta: buildPaginationMeta(page, limit, total) };
}

export async function getInventoryById(id: string) {
  const inventory = await prisma.inventory.findFirst({
    where: { id, ...notDeleted },
    include: {
      ...inventoryInclude,
      _count: { select: { products: true } },
    },
  });
  if (!inventory) throw new AppError('Inventory not found.', 404, 'NOT_FOUND');
  return inventory;
}

export async function updateInventory(
  id: string,
  data: Record<string, any>,
  performedBy: string,
  _performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const existing = await prisma.inventory.findFirst({ where: { id, ...notDeleted } });
  if (!existing) throw new AppError('Inventory not found.', 404, 'NOT_FOUND');

  const updateData: Record<string, any> = { ...data, updatedBy: performedBy };
  await prisma.inventory.update({ where: { id }, data: updateData });

  await createAuditLog({
    action: 'UPDATE',
    entityType: 'inventory',
    entityId: id,
    performedBy,
    performedByRole: _performedByRole,
    newData: { id, name: data.name ?? existing.name },
    ipAddress: ip,
    userAgent,
  });

  return prisma.inventory.findUnique({
    where: { id },
    include: inventoryInclude,
  });
}

export async function deleteInventory(id: string, performedBy: string, _performedByRole: string, ip?: string, userAgent?: string) {
  const existing = await prisma.inventory.findFirst({ where: { id, ...notDeleted } });
  if (!existing) throw new AppError('Inventory not found.', 404, 'NOT_FOUND');

  await prisma.inventory.update({
    where: { id },
    data: softDeleteData(performedBy),
  });

  await createAuditLog({
    action: 'DELETE',
    entityType: 'inventory',
    entityId: id,
    performedBy,
    performedByRole: _performedByRole,
    previousData: { id, name: existing.name },
    ipAddress: ip,
    userAgent,
  });

  return { message: 'Inventory deleted successfully.' };
}

export async function getInventoryStats() {
  const [inventories, inventoryProducts] = await Promise.all([
    prisma.inventory.count({ where: notDeleted }),
    prisma.inventoryProduct.findMany({
      where: notDeleted,
      select: { stock: true, price: true, lowStockThreshold: true },
    }),
  ]);

  const totalProducts = inventoryProducts.length;
  let lowStockItems = 0;
  let totalValue = 0;
  for (const p of inventoryProducts) {
    const value = Number(p.price) * p.stock;
    totalValue += value;
    if (p.stock > 0 && p.stock <= p.lowStockThreshold) lowStockItems++;
  }

  return {
    totalInventories: inventories,
    totalProducts,
    lowStockItems,
    totalValue,
  };
}

export async function addProductToInventory(
  inventoryId: string,
  data: Record<string, any>,
  performedBy: string,
  _performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const inventory = await prisma.inventory.findFirst({ where: { id: inventoryId, ...notDeleted } });
  if (!inventory) throw new AppError('Inventory not found.', 404, 'NOT_FOUND');

  const product = await prisma.product.findFirst({ where: { id: data.productId, ...notDeleted } });
  if (!product) throw new AppError('Product not found.', 404, 'NOT_FOUND');

  const batchKey = (data.batchNumber ?? '').trim() || null;
  const existing = await prisma.inventoryProduct.findFirst({
    where: {
      inventoryId,
      productId: data.productId,
      ...notDeleted,
      batchNumber: batchKey,
    },
  });

  const mfgDate = parseOptionalDate(data.mfgDate);
  const expiryDate = parseOptionalDate(data.expiryDate);

  if (existing) {
    const existingQty = existing.stock;
    const existingAvg = existing.averageCost ? Number(existing.averageCost) : Number(existing.price);
    const newQty = data.stock;
    const newPrice = data.price;
    const totalQty = existingQty + newQty;
    const newAvgCost = (existingAvg * existingQty + newPrice * newQty) / totalQty;

    await prisma.inventoryProduct.update({
      where: { id: existing.id },
      data: {
        stock: totalQty,
        averageCost: newAvgCost,
        updatedBy: performedBy,
      },
    });

    await createAuditLog({
      action: 'UPDATE',
      entityType: 'inventory_product',
      entityId: existing.id,
      performedBy,
      performedByRole: _performedByRole,
      newData: { stock: totalQty, averageCost: newAvgCost },
      ipAddress: ip,
      userAgent,
    });

    return prisma.inventoryProduct.findUnique({
      where: { id: existing.id },
      include: {
        product: {
          select: {
            id: true,
            productName: true,
            technicalName: true,
            manufacturer: { select: { companyName: true } },
          },
        },
      },
    });
  }

  const created = await prisma.inventoryProduct.create({
    data: {
      inventoryId,
      productId: data.productId,
      productSizeId: data.productSizeId ?? null,
      stock: data.stock,
      price: data.price,
      averageCost: data.price,
      sourceType: data.sourceType,
      batchNumber: batchKey,
      mfgDate,
      expiryDate,
      purchasedFrom: data.purchasedFrom ?? null,
      mrp: data.mrp != null ? data.mrp : null,
      sellingPrice: data.sellingPrice != null ? data.sellingPrice : null,
      gstInclusive: data.gstInclusive === true,
      invoiceNumber: data.invoiceNumber ?? null,
      invoiceDate: data.invoiceDate != null ? parseOptionalDate(data.invoiceDate) : null,
      discount: data.discount != null ? data.discount : null,
      unit: data.unit,
      lowStockThreshold: data.lowStockThreshold ?? 10,
      createdBy: performedBy,
    },
    include: {
      product: {
        select: {
          id: true,
          productName: true,
          technicalName: true,
          manufacturer: { select: { companyName: true } },
        },
      },
    },
  });

  await createAuditLog({
    action: 'CREATE',
    entityType: 'inventory_product',
    entityId: created.id,
    performedBy,
    performedByRole: _performedByRole,
    newData: { id: created.id, productId: data.productId, stock: data.stock },
    ipAddress: ip,
    userAgent,
  });

  return created;
}

export async function addProductBatch(
  inventoryId: string,
  data: Record<string, any>,
  performedBy: string,
  _performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const inventory = await prisma.inventory.findFirst({ where: { id: inventoryId, ...notDeleted } });
  if (!inventory) throw new AppError('Inventory not found.', 404, 'NOT_FOUND');

  const product = await prisma.product.findFirst({ where: { id: data.productId, ...notDeleted } });
  if (!product) throw new AppError('Product not found.', 404, 'NOT_FOUND');

  const invoiceDate = data.invoiceDate != null ? parseOptionalDate(data.invoiceDate) : null;
  const batches = data.batches as Array<{
    batchNumber: string;
    mfgDate?: string | null;
    expiryDate?: string | null;
    stock: number;
    unit: string;
    price: number;
    gstInclusive?: boolean;
    discount?: number | null;
  }>;

  const created = await prisma.$transaction(async (tx) => {
    const entries: Awaited<ReturnType<typeof tx.inventoryProduct.create>>[] = [];
    for (const b of batches) {
      const mfgDate = parseOptionalDate(b.mfgDate);
      const expiryDate = parseOptionalDate(b.expiryDate);
      const entry = await tx.inventoryProduct.create({
        data: {
          inventoryId,
          productId: data.productId,
          productSizeId: data.productSizeId ?? null,
          stock: b.stock,
          price: b.price,
          averageCost: b.price,
          sourceType: data.sourceType,
          batchNumber: (b.batchNumber ?? '').trim() || null,
          mfgDate,
          expiryDate,
          purchasedFrom: data.purchasedFrom ?? null,
          mrp: data.mrp != null ? data.mrp : null,
          sellingPrice: data.sellingPrice != null ? data.sellingPrice : null,
          gstInclusive: b.gstInclusive === true,
          invoiceNumber: data.invoiceNumber ?? null,
          invoiceDate,
          discount: b.discount != null ? b.discount : null,
          unit: b.unit as 'KG' | 'G' | 'L' | 'ML' | 'PACK' | 'BAG' | 'BOTTLE' | 'QUANTAL',
          lowStockThreshold: data.lowStockThreshold ?? 10,
          createdBy: performedBy,
        },
        include: {
          product: {
            select: {
              id: true,
              productName: true,
              technicalName: true,
              manufacturer: { select: { companyName: true } },
            },
          },
        },
      });
      entries.push(entry);
    }
    return entries;
  });

  let totalQuantity = 0;
  let totalValue = 0;
  for (const e of created) {
    totalQuantity += e.stock;
    totalValue += Number(e.price) * e.stock;
  }

  await createAuditLog({
    action: 'CREATE',
    entityType: 'inventory_product',
    entityId: created[0]?.id ?? inventoryId,
    performedBy,
    performedByRole: _performedByRole,
    newData: { batchCount: created.length, totalQuantity, totalValue },
    ipAddress: ip,
    userAgent,
  });

  return { entries: created, totalQuantity, totalValue };
}

export async function listInventoryProducts(inventoryId: string, query: Record<string, unknown>) {
  const { page, limit, skip } = getPaginationParams(query);
  const where: Record<string, any> = { inventoryId, ...notDeleted };

  if (query.search) {
    const search = query.search as string;
    where.product = {
      ...notDeleted,
      OR: [
        { productName: { contains: search, mode: 'insensitive' } },
        { technicalName: { contains: search, mode: 'insensitive' } },
        { manufacturer: { companyName: { contains: search, mode: 'insensitive' } } },
      ],
    };
  }
  if (query.company) {
    where.product = {
      ...(where.product as object),
      ...notDeleted,
      manufacturer: { companyName: { contains: query.company as string, mode: 'insensitive' } },
    };
  }

  if (query.status === 'outOfStock') {
    where.stock = 0;
  }

  const includeProduct = {
    product: {
      select: {
        id: true,
        productName: true,
        technicalName: true,
        manufacturer: { select: { companyName: true } },
      },
    },
  };

  if (query.status === 'inStock' || query.status === 'lowStock') {
    const allItems = await prisma.inventoryProduct.findMany({
      where,
      include: includeProduct,
      orderBy: { createdAt: 'desc' },
    });
    const withStatus = allItems.map((ip) => {
      const computedStatus =
        ip.stock === 0 ? 'OUT_OF_STOCK' : ip.stock <= ip.lowStockThreshold ? 'LOW_STOCK' : 'IN_STOCK';
      return { ...ip, computedStatus };
    });
    const filtered = withStatus.filter(
      (ip) =>
        (query.status === 'inStock' && ip.computedStatus === 'IN_STOCK') ||
        (query.status === 'lowStock' && ip.computedStatus === 'LOW_STOCK'),
    );
    const total = filtered.length;
    const data = filtered.slice(skip, skip + limit);
    return { data, meta: buildPaginationMeta(page, limit, total) };
  }

  const [items, total] = await Promise.all([
    prisma.inventoryProduct.findMany({
      where,
      include: includeProduct,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.inventoryProduct.count({ where }),
  ]);

  const withStatus = items.map((ip) => {
    const computedStatus =
      ip.stock === 0 ? 'OUT_OF_STOCK' : ip.stock <= ip.lowStockThreshold ? 'LOW_STOCK' : 'IN_STOCK';
    return { ...ip, computedStatus };
  });

  return { data: withStatus, meta: buildPaginationMeta(page, limit, total) };
}

export async function updateInventoryProduct(
  inventoryId: string,
  inventoryProductId: string,
  data: Record<string, any>,
  performedBy: string,
  _performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const existing = await prisma.inventoryProduct.findFirst({
    where: { id: inventoryProductId, inventoryId, ...notDeleted },
  });
  if (!existing) throw new AppError('Inventory product entry not found.', 404, 'NOT_FOUND');

  const updateData: Record<string, any> = { updatedBy: performedBy };
  if (data.stock !== undefined) updateData.stock = data.stock;
  if (data.price !== undefined) updateData.price = data.price;
  if (data.unit !== undefined) updateData.unit = data.unit;
  if (data.sourceType !== undefined) updateData.sourceType = data.sourceType;
  if (data.batchNumber !== undefined) updateData.batchNumber = data.batchNumber ?? null;
  if (data.mfgDate !== undefined) updateData.mfgDate = parseOptionalDate(data.mfgDate);
  if (data.expiryDate !== undefined) updateData.expiryDate = parseOptionalDate(data.expiryDate);
  if (data.purchasedFrom !== undefined) updateData.purchasedFrom = data.purchasedFrom ?? null;
  if (data.mrp !== undefined) updateData.mrp = data.mrp;
  if (data.sellingPrice !== undefined) updateData.sellingPrice = data.sellingPrice;
  if (data.gstInclusive !== undefined) updateData.gstInclusive = data.gstInclusive;
  if (data.invoiceNumber !== undefined) updateData.invoiceNumber = data.invoiceNumber ?? null;
  if (data.invoiceDate !== undefined) updateData.invoiceDate = parseOptionalDate(data.invoiceDate);
  if (data.discount !== undefined) updateData.discount = data.discount;
  if (data.lowStockThreshold !== undefined) updateData.lowStockThreshold = data.lowStockThreshold;

  await prisma.inventoryProduct.update({
    where: { id: inventoryProductId },
    data: updateData,
  });

  await createAuditLog({
    action: 'UPDATE',
    entityType: 'inventory_product',
    entityId: inventoryProductId,
    performedBy,
    performedByRole: _performedByRole,
    newData: updateData,
    ipAddress: ip,
    userAgent,
  });

  return prisma.inventoryProduct.findUnique({
    where: { id: inventoryProductId },
    include: {
      product: {
        select: {
          id: true,
          productName: true,
          technicalName: true,
          manufacturer: { select: { companyName: true } },
        },
      },
    },
  });
}

export async function deleteInventoryProduct(
  inventoryId: string,
  inventoryProductId: string,
  performedBy: string,
  _performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const existing = await prisma.inventoryProduct.findFirst({
    where: { id: inventoryProductId, inventoryId, ...notDeleted },
  });
  if (!existing) throw new AppError('Inventory product entry not found.', 404, 'NOT_FOUND');

  await prisma.inventoryProduct.update({
    where: { id: inventoryProductId },
    data: softDeleteData(performedBy),
  });

  await createAuditLog({
    action: 'DELETE',
    entityType: 'inventory_product',
    entityId: inventoryProductId,
    performedBy,
    performedByRole: _performedByRole,
    previousData: { id: inventoryProductId, productId: existing.productId },
    ipAddress: ip,
    userAgent,
  });

  return { message: 'Inventory product entry deleted successfully.' };
}
