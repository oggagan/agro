import bcrypt from 'bcryptjs';
import prisma from '../../config/database.js';
import { AppError } from '../../middleware/error.middleware.js';
import { createAuditLog, createStatusHistory } from '../../utils/audit.js';
import { notDeleted, softDeleteData } from '../../utils/soft-delete.js';
import { getPaginationParams, buildPaginationMeta } from '../../utils/pagination.js';
import * as inventoryService from '../inventory/inventory.service.js';

const distributorInclude = {
  user: {
    select: {
      id: true,
      name: true,
      role: true,
      status: true,
      createdAt: true,
      phones: true,
      emails: true,
    },
  },
  createdByUser: {
    select: { id: true, name: true },
  },
  manufacturer: { select: { id: true, companyName: true } },
  retailer: { select: { id: true, companyName: true } },
  addresses: true,
  bankDetails: { include: { documents: { where: { deletedAt: null } } } },
  licenses: { include: { documents: { where: { deletedAt: null } } } },
  directors: {
    where: { deletedAt: null },
    include: {
      documents: { where: { deletedAt: null } },
      user: {
        select: {
          id: true,
          name: true,
          status: true,
          phones: true,
          emails: true,
        },
      },
    },
  },
  authorizedPersons: {
    where: { deletedAt: null },
    include: {
      documents: { where: { deletedAt: null } },
      user: {
        select: {
          id: true,
          name: true,
          status: true,
          phones: true,
          emails: true,
        },
      },
    },
  },
  documents: { where: { deletedAt: null } },
};

// ─── Admin: Create distributor ─────────────────────────────────────────────────

export async function createDistributor(
  data: Record<string, any>,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const adminPhone = data.phone ?? data.phones?.[0]?.number;
  if (!adminPhone) throw new AppError('At least one phone is required for admin.', 400, 'VALIDATION_ERROR');
  const existingPhone = await prisma.phone.findUnique({ where: { number: adminPhone } });
  if (existingPhone) throw new AppError('A user with this phone already exists.', 409, 'USER_EXISTS');

  const authorizedPersons = data.authorizedPersons ?? [];
  for (const ap of authorizedPersons) {
    const apPhones = ap.phones ?? (ap.phone ? [{ number: ap.phone, isPrimary: true }] : []);
    const apFirstPhone = apPhones[0]?.number;
    if (apFirstPhone === adminPhone) {
      throw new AppError('Authorized person phone must be different from admin phone.', 400, 'VALIDATION_ERROR');
    }
    if (apFirstPhone) {
      const dup = await prisma.phone.findUnique({ where: { number: apFirstPhone } });
      if (dup) throw new AppError(`A user with phone ${apFirstPhone} already exists.`, 409, 'USER_EXISTS');
    }
  }

  const hashedPassword = await bcrypt.hash(data.password, 12);
  const userStatus = data.isDraft ? 'DRAFT' : 'PENDING';
  const distributorType = data.distributorType as 'STATE_DISTRIBUTOR' | 'UNDER_MANUFACTURER' | 'UNDER_RETAILER';

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: data.name,
        password: hashedPassword,
        role: 'DISTRIBUTOR',
        status: userStatus as any,
        createdBy: performedBy,
      },
    });

    const phones = data.phones ?? (data.phone ? [{ number: data.phone, isPrimary: true }] : []);
    if (phones.length === 0) throw new AppError('At least one phone is required for admin.', 400, 'VALIDATION_ERROR');
    for (let i = 0; i < phones.length; i++) {
      await tx.phone.create({
        data: { userId: user.id, number: phones[i].number, isPrimary: i === 0, label: phones[i].label ?? null },
      });
    }
    const emails = data.emails ?? (data.email ? [{ address: data.email, isPrimary: true }] : []);
    for (let i = 0; i < emails.length; i++) {
      await tx.email.create({
        data: { userId: user.id, address: emails[i].address, isPrimary: i === 0, label: emails[i].label ?? null },
      });
    }

    const distributorData: Record<string, any> = {
      userId: user.id,
      distributorType,
      gstNumber: data.gstNumber || null,
      isDraft: data.isDraft || false,
      createdBy: performedBy,
    };
    if (distributorType === 'STATE_DISTRIBUTOR' || distributorType === 'UNDER_MANUFACTURER') {
      distributorData.licenseNumber = data.licenseNumber || null;
      distributorData.licenseValidUpto = data.licenseValidUpto ? new Date(data.licenseValidUpto) : null;
    }
    if (distributorType === 'UNDER_MANUFACTURER') {
      distributorData.manufacturerId = data.manufacturerId || null;
    }
    if (distributorType === 'UNDER_RETAILER') {
      distributorData.retailerId = data.retailerId || null;
      distributorData.companyName = data.companyName || null;
      distributorData.companyType = data.companyType || null;
      distributorData.companyPan = data.companyPan || null;
    }

    const distributor = await tx.distributor.create({
      data: distributorData as any,
    });

    if (data.address) {
      await tx.address.create({
        data: {
          entityType: 'distributor',
          distributorId: distributor.id,
          ...data.address,
          createdBy: performedBy,
        },
      });
    }

    if (distributorType === 'UNDER_RETAILER' && data.bankDetails) {
      await tx.bankDetails.create({
        data: {
          entityType: 'distributor',
          distributorId: distributor.id,
          ...data.bankDetails,
          createdBy: performedBy,
        },
      });
    }

    if (distributorType === 'UNDER_RETAILER' && data.licenses?.length) {
      for (const lic of data.licenses) {
        await tx.distributorLicense.create({
          data: {
            distributorId: distributor.id,
            category: lic.category as any,
            licenseNumber: lic.licenseNumber || null,
            validUptoDate: lic.validUptoDate ? new Date(lic.validUptoDate) : null,
            createdBy: performedBy,
          },
        });
      }
    }

    if (distributorType === 'UNDER_RETAILER' && data.directors?.length) {
      for (const dir of data.directors) {
        const dirPhones = dir.phones ?? (dir.phone ? [{ number: dir.phone, isPrimary: true }] : []);
        if (!dir.name || dirPhones.length === 0)
          throw new AppError('Director must have name and at least one phone.', 400, 'VALIDATION_ERROR');
        const dirUser = await tx.user.create({
          data: {
            name: dir.name,
            password: null,
            role: 'DIRECTOR',
            status: userStatus as any,
            createdBy: performedBy,
          },
        });
        for (let i = 0; i < dirPhones.length; i++) {
          await tx.phone.create({
            data: {
              userId: dirUser.id,
              number: dirPhones[i].number,
              isPrimary: i === 0,
              label: dirPhones[i].label ?? null,
            },
          });
        }
        const dirEmails = dir.emails ?? (dir.email ? [{ address: dir.email, isPrimary: true }] : []);
        for (let i = 0; i < dirEmails.length; i++) {
          await tx.email.create({
            data: {
              userId: dirUser.id,
              address: dirEmails[i].address,
              isPrimary: i === 0,
              label: dirEmails[i].label ?? null,
            },
          });
        }
        await tx.director.create({
          data: {
            distributorId: distributor.id,
            userId: dirUser.id,
            type: dir.type as any,
            designation: dir.designation || null,
            aadhaarNumber: dir.aadhaarNumber || null,
            panNumber: dir.panNumber || null,
            createdBy: performedBy,
          },
        });
      }
    }

    for (const ap of authorizedPersons) {
      const apPhones = ap.phones ?? (ap.phone ? [{ number: ap.phone, isPrimary: true }] : []);
      if (!ap.name || apPhones.length === 0)
        throw new AppError('Authorized person must have name and at least one phone.', 400, 'VALIDATION_ERROR');
      const apHashedPassword = await bcrypt.hash(ap.password, 12);
      const apUser = await tx.user.create({
        data: {
          name: ap.name,
          password: apHashedPassword,
          role: 'AUTHORIZED_PERSON',
          status: userStatus as any,
          createdBy: performedBy,
        },
      });
      for (let i = 0; i < apPhones.length; i++) {
        await tx.phone.create({
          data: {
            userId: apUser.id,
            number: apPhones[i].number,
            isPrimary: i === 0,
            label: apPhones[i].label ?? null,
          },
        });
      }
      const apEmails = ap.emails ?? (ap.email ? [{ address: ap.email, isPrimary: true }] : []);
      for (let i = 0; i < apEmails.length; i++) {
        await tx.email.create({
          data: {
            userId: apUser.id,
            address: apEmails[i].address,
            isPrimary: i === 0,
            label: apEmails[i].label ?? null,
          },
        });
      }
      await tx.authorizedPerson.create({
        data: {
          distributorId: distributor.id,
          userId: apUser.id,
          aadhaarNumber: ap.aadhaarNumber || null,
          createdBy: performedBy,
        },
      });
    }

    return { user, distributor };
  });

  await createAuditLog({
    action: 'CREATE',
    entityType: 'user',
    entityId: result.user.id,
    performedBy,
    performedByRole,
    newData: { id: result.user.id, name: result.user.name, role: result.user.role },
    ipAddress: ip,
    userAgent,
  });

  await createAuditLog({
    action: 'CREATE',
    entityType: 'distributor',
    entityId: result.distributor.id,
    performedBy,
    performedByRole,
    newData: { id: result.distributor.id, distributorType: result.distributor.distributorType },
    ipAddress: ip,
    userAgent,
  });

  await createStatusHistory({
    entityType: 'user',
    entityId: result.user.id,
    fromStatus: null,
    toStatus: userStatus,
    changedBy: performedBy,
    changedByRole: performedByRole,
  });

  const full = await prisma.distributor.findUnique({
    where: { id: result.distributor.id },
    include: distributorInclude,
  });

  try {
    const addr = full?.addresses?.[0];
    const displayName = full!.companyName || (full as any)?.user?.name || 'Distributor';
    await inventoryService.createInventory(
      {
        ownerType: 'DISTRIBUTOR',
        distributorId: full!.id,
        name: `${displayName} Inventory`,
        type: 'DISTRIBUTION_CENTER',
        address1: addr?.address1 ?? 'To be updated',
        address2: addr?.address2 ?? null,
        city: addr?.city ?? 'To be updated',
        state: addr?.state ?? 'To be updated',
        pincode: addr?.pincode ?? '000000',
      },
      performedBy,
      performedByRole,
      ip,
      userAgent,
    );
  } catch (_err) {
    // Do not block distributor creation if auto-inventory fails
  }

  return full!;
}

// ─── Admin: List distributors ─────────────────────────────────────────────────

export async function listDistributors(query: Record<string, unknown>) {
  const { page, limit, skip } = getPaginationParams(query);
  const where: Record<string, unknown> = { ...notDeleted };

  if (query.status) {
    where.user = { status: query.status, ...notDeleted };
  } else {
    where.user = { ...notDeleted };
  }

  if (query.distributorType) {
    where.distributorType = query.distributorType;
  }

  if (query.search) {
    const search = query.search as string;
    where.OR = [
      { companyName: { contains: search, mode: 'insensitive' } },
      { user: { ...notDeleted, name: { contains: search, mode: 'insensitive' } } },
      { user: { ...notDeleted, phones: { some: { number: { contains: search } } } } },
      { user: { ...notDeleted, emails: { some: { address: { contains: search, mode: 'insensitive' } } } } },
    ];
  }

  const [distributors, total] = await Promise.all([
    prisma.distributor.findMany({
      where: where as any,
      include: distributorInclude,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.distributor.count({ where: where as any }),
  ]);

  return { data: distributors, meta: buildPaginationMeta(page, limit, total) };
}

// ─── Admin: Get distributor by ID ───────────────────────────────────────────

export async function getDistributorById(id: string) {
  const distributor = await prisma.distributor.findFirst({
    where: { id, ...notDeleted },
    include: distributorInclude,
  });
  if (!distributor) throw new AppError('Distributor not found.', 404, 'NOT_FOUND');
  return distributor;
}

// ─── Admin: Update distributor ───────────────────────────────────────────────

export async function updateDistributor(
  id: string,
  data: Record<string, any>,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const existing = await prisma.distributor.findFirst({
    where: { id, ...notDeleted },
    include: { addresses: true, bankDetails: true },
  });
  if (!existing) throw new AppError('Distributor not found.', 404, 'NOT_FOUND');

  const { address, bankDetails, ...companyData } = data;
  const previousData = { ...existing };

  await prisma.$transaction(async (tx) => {
    if (Object.keys(companyData).length > 0) {
      const updatePayload: Record<string, any> = { ...companyData, updatedBy: performedBy };
      if (companyData.licenseValidUpto !== undefined)
        updatePayload.licenseValidUpto = companyData.licenseValidUpto ? new Date(companyData.licenseValidUpto) : null;
      await tx.distributor.update({
        where: { id },
        data: updatePayload,
      });
    }

    if (address) {
      const existingAddr = existing.addresses[0];
      if (existingAddr) {
        await tx.address.update({
          where: { id: existingAddr.id },
          data: { ...address, updatedBy: performedBy },
        });
      } else {
        await tx.address.create({
          data: {
            entityType: 'distributor',
            distributorId: id,
            ...address,
            createdBy: performedBy,
          },
        });
      }
    }

    if (bankDetails) {
      const existingBank = existing.bankDetails[0];
      if (existingBank) {
        await tx.bankDetails.update({
          where: { id: existingBank.id },
          data: { ...bankDetails, updatedBy: performedBy },
        });
      } else {
        await tx.bankDetails.create({
          data: {
            entityType: 'distributor',
            distributorId: id,
            ...bankDetails,
            createdBy: performedBy,
          },
        });
      }
    }
  });

  await createAuditLog({
    action: 'UPDATE',
    entityType: 'distributor',
    entityId: id,
    performedBy,
    performedByRole,
    previousData: { distributorType: previousData.distributorType, companyName: previousData.companyName },
    newData: companyData,
    ipAddress: ip,
    userAgent,
  });

  return prisma.distributor.findUnique({
    where: { id },
    include: distributorInclude,
  });
}

// ─── Admin: Update distributor status ────────────────────────────────────────

export async function updateDistributorStatus(
  id: string,
  status: string,
  reason: string | undefined,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const distributor = await prisma.distributor.findFirst({
    where: { id, ...notDeleted },
    include: { user: true },
  });
  if (!distributor) throw new AppError('Distributor not found.', 404, 'NOT_FOUND');

  const previousStatus = distributor.user.status;

  await prisma.user.update({
    where: { id: distributor.userId },
    data: { status: status as any, updatedBy: performedBy },
  });

  await createAuditLog({
    action: 'STATUS_CHANGE',
    entityType: 'distributor',
    entityId: id,
    performedBy,
    performedByRole,
    previousData: { status: previousStatus },
    newData: { status },
    ipAddress: ip,
    userAgent,
  });

  await createStatusHistory({
    entityType: 'distributor',
    entityId: id,
    fromStatus: previousStatus,
    toStatus: status,
    reason,
    changedBy: performedBy,
    changedByRole: performedByRole,
  });

  return prisma.distributor.findUnique({
    where: { id },
    include: distributorInclude,
  });
}

// ─── Admin: Upload documents ─────────────────────────────────────────────────

export async function uploadDocuments(
  distributorId: string,
  files: Express.Multer.File[],
  docType: string,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const distributor = await prisma.distributor.findFirst({ where: { id: distributorId, ...notDeleted } });
  if (!distributor) throw new AppError('Distributor not found.', 404, 'NOT_FOUND');

  const docs = await Promise.all(
    files.map((file) =>
      prisma.document.create({
        data: {
          entityType: 'distributor',
          entityId: distributorId,
          docType,
          fileName: file.originalname,
          filePath: file.path,
          mimeType: file.mimetype,
          fileSize: file.size,
          uploadedBy: performedBy,
          distributorId,
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

  return docs;
}

// ─── Admin: Delete document ──────────────────────────────────────────────────

export async function deleteDocument(
  distributorId: string,
  docId: string,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const doc = await prisma.document.findFirst({
    where: {
      id: docId,
      deletedAt: null,
      OR: [
        { distributorId },
        { director: { distributorId } },
        { authorizedPerson: { distributorId } },
        { bankDetails: { distributorId } },
        { distributorLicense: { distributorId } },
      ],
    },
  });
  if (!doc) throw new AppError('Document not found.', 404, 'NOT_FOUND');

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

// ─── Admin: Add director ─────────────────────────────────────────────────────

export async function addDirector(
  distributorId: string,
  data: Record<string, any>,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const distributor = await prisma.distributor.findFirst({ where: { id: distributorId, ...notDeleted } });
  if (!distributor) throw new AppError('Distributor not found.', 404, 'NOT_FOUND');

  const phones = data.phones ?? (data.phone ? [{ number: data.phone, isPrimary: true }] : []);
  if (!data.name || phones.length === 0)
    throw new AppError('Director must have name and at least one phone.', 400, 'VALIDATION_ERROR');
  for (const p of phones) {
    const existing = await prisma.phone.findUnique({ where: { number: p.number } });
    if (existing) throw new AppError(`Phone ${p.number} is already registered.`, 409, 'USER_EXISTS');
  }
  const emails = data.emails ?? (data.email ? [{ address: data.email, isPrimary: true }] : []);
  for (const e of emails) {
    const existing = await prisma.email.findUnique({ where: { address: e.address } });
    if (existing) throw new AppError(`Email ${e.address} is already registered.`, 409, 'USER_EXISTS');
  }

  const director = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name: data.name, password: null, role: 'DIRECTOR', status: 'PENDING', createdBy: performedBy },
    });
    for (let i = 0; i < phones.length; i++) {
      await tx.phone.create({
        data: {
          userId: user.id,
          number: phones[i].number,
          isPrimary: i === 0,
          label: phones[i].label ?? null,
        },
      });
    }
    for (let i = 0; i < emails.length; i++) {
      await tx.email.create({
        data: {
          userId: user.id,
          address: emails[i].address,
          isPrimary: i === 0,
          label: emails[i].label ?? null,
        },
      });
    }
    return tx.director.create({
      data: {
        distributorId,
        userId: user.id,
        type: data.type as any,
        designation: data.designation || null,
        aadhaarNumber: data.aadhaarNumber || null,
        panNumber: data.panNumber || null,
        createdBy: performedBy,
      },
    });
  });

  await createAuditLog({
    action: 'CREATE',
    entityType: 'director',
    entityId: director.id,
    performedBy,
    performedByRole,
    newData: { id: director.id, type: director.type },
    ipAddress: ip,
    userAgent,
  });

  return director;
}

// ─── Admin: Update director ───────────────────────────────────────────────────

export async function updateDirector(
  distributorId: string,
  directorId: string,
  data: Record<string, any>,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const director = await prisma.director.findFirst({
    where: { id: directorId, distributorId, deletedAt: null },
    include: { user: { include: { phones: true, emails: true } } },
  });
  if (!director) throw new AppError('Director not found.', 404, 'NOT_FOUND');

  const previousData = {
    name: director.user?.name,
    designation: director.designation,
    phones: director.user?.phones?.map((p) => p.number),
    emails: director.user?.emails?.map((e) => e.address),
  };

  await prisma.$transaction(async (tx) => {
    if (director.userId && director.user) {
      if (data.name !== undefined) {
        await tx.user.update({
          where: { id: director.userId },
          data: { name: data.name, updatedBy: performedBy },
        });
      }
      if (data.phones !== undefined) {
        await tx.phone.deleteMany({ where: { userId: director.userId } });
        for (let i = 0; i < data.phones.length; i++) {
          await tx.phone.create({
            data: {
              userId: director.userId,
              number: data.phones[i].number,
              isPrimary: i === 0,
              label: data.phones[i].label ?? null,
            },
          });
        }
      }
      if (data.emails !== undefined) {
        await tx.email.deleteMany({ where: { userId: director.userId } });
        for (let i = 0; i < data.emails.length; i++) {
          await tx.email.create({
            data: {
              userId: director.userId,
              address: data.emails[i].address,
              isPrimary: i === 0,
              label: data.emails[i].label ?? null,
            },
          });
        }
      }
    }
    const directorUpdate: Record<string, any> = { updatedBy: performedBy };
    if (data.designation !== undefined) directorUpdate.designation = data.designation;
    if (data.aadhaarNumber !== undefined) directorUpdate.aadhaarNumber = data.aadhaarNumber ?? null;
    if (data.panNumber !== undefined) directorUpdate.panNumber = data.panNumber ?? null;
    await tx.director.update({ where: { id: directorId }, data: directorUpdate });
  });

  await createAuditLog({
    action: 'UPDATE',
    entityType: 'director',
    entityId: directorId,
    performedBy,
    performedByRole,
    previousData,
    newData: data,
    ipAddress: ip,
    userAgent,
  });

  return prisma.director.findUnique({
    where: { id: directorId },
    include: { user: { include: { phones: true, emails: true } } },
  });
}

// ─── Admin: Delete director ───────────────────────────────────────────────────

export async function deleteDirector(
  distributorId: string,
  directorId: string,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const director = await prisma.director.findFirst({
    where: { id: directorId, distributorId, deletedAt: null },
    include: { user: { select: { name: true } } },
  });
  if (!director) throw new AppError('Director not found.', 404, 'NOT_FOUND');

  await prisma.director.update({
    where: { id: directorId },
    data: softDeleteData(performedBy),
  });

  await createAuditLog({
    action: 'DELETE',
    entityType: 'director',
    entityId: directorId,
    performedBy,
    performedByRole,
    previousData: { id: director.id, name: director.user?.name },
    ipAddress: ip,
    userAgent,
  });

  return { message: 'Director deleted successfully.' };
}

// ─── Admin: Upload director documents ────────────────────────────────────────

export async function uploadDirectorDocuments(
  distributorId: string,
  directorId: string,
  files: Express.Multer.File[],
  docType: string,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const director = await prisma.director.findFirst({
    where: { id: directorId, distributorId, deletedAt: null },
  });
  if (!director) throw new AppError('Director not found.', 404, 'NOT_FOUND');

  const docs = await Promise.all(
    files.map((file) =>
      prisma.document.create({
        data: {
          entityType: 'director',
          entityId: directorId,
          docType,
          fileName: file.originalname,
          filePath: file.path,
          mimeType: file.mimetype,
          fileSize: file.size,
          uploadedBy: performedBy,
          directorId,
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
      newData: { id: doc.id, docType: doc.docType, fileName: doc.fileName, directorId },
      ipAddress: ip,
      userAgent,
    });
  }

  return docs;
}

// ─── Admin: Add authorized person ───────────────────────────────────────────

export async function addAuthorizedPerson(
  distributorId: string,
  data: Record<string, any>,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const distributor = await prisma.distributor.findFirst({
    where: { id: distributorId, ...notDeleted },
    include: { user: { include: { phones: true } } },
  });
  if (!distributor) throw new AppError('Distributor not found.', 404, 'NOT_FOUND');

  const phones = data.phones ?? (data.phone ? [{ number: data.phone, isPrimary: true }] : []);
  if (!data.name || phones.length === 0)
    throw new AppError('Authorized person must have name and at least one phone.', 400, 'VALIDATION_ERROR');
  const adminPhones = distributor.user?.phones?.map((p) => p.number) ?? [];
  if (phones.some((p: { number: string }) => adminPhones.includes(p.number))) {
    throw new AppError('Authorized person phone must be different from admin phone.', 400, 'VALIDATION_ERROR');
  }
  for (const p of phones) {
    const existing = await prisma.phone.findUnique({ where: { number: p.number } });
    if (existing) throw new AppError(`Phone ${p.number} is already registered.`, 409, 'USER_EXISTS');
  }
  const emails = data.emails ?? (data.email ? [{ address: data.email, isPrimary: true }] : []);
  for (const e of emails) {
    const existing = await prisma.email.findUnique({ where: { address: e.address } });
    if (existing) throw new AppError(`Email ${e.address} is already registered.`, 409, 'USER_EXISTS');
  }

  const distUser = await prisma.user.findUnique({ where: { id: distributor.userId }, select: { status: true } });
  const userStatus = (distUser?.status ?? 'PENDING') as any;
  const hashedPassword = await bcrypt.hash(data.password, 12);

  const result = await prisma.$transaction(async (tx) => {
    const apUser = await tx.user.create({
      data: {
        name: data.name,
        password: hashedPassword,
        role: 'AUTHORIZED_PERSON',
        status: userStatus,
        createdBy: performedBy,
      },
    });
    for (let i = 0; i < phones.length; i++) {
      await tx.phone.create({
        data: {
          userId: apUser.id,
          number: phones[i].number,
          isPrimary: i === 0,
          label: phones[i].label ?? null,
        },
      });
    }
    for (let i = 0; i < emails.length; i++) {
      await tx.email.create({
        data: {
          userId: apUser.id,
          address: emails[i].address,
          isPrimary: i === 0,
          label: emails[i].label ?? null,
        },
      });
    }
    return tx.authorizedPerson.create({
      data: {
        distributorId,
        userId: apUser.id,
        aadhaarNumber: data.aadhaarNumber || null,
        createdBy: performedBy,
      },
    });
  });

  await createAuditLog({
    action: 'CREATE',
    entityType: 'authorized_person',
    entityId: result.id,
    performedBy,
    performedByRole,
    newData: { id: result.id, userId: result.userId },
    ipAddress: ip,
    userAgent,
  });

  return result;
}

// ─── Admin: Update authorized person ─────────────────────────────────────────

export async function updateAuthorizedPerson(
  distributorId: string,
  authorizedPersonId: string,
  data: Record<string, any>,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const ap = await prisma.authorizedPerson.findFirst({
    where: { id: authorizedPersonId, distributorId, deletedAt: null },
    include: { user: { include: { phones: true, emails: true } } },
  });
  if (!ap) throw new AppError('Authorized person not found.', 404, 'NOT_FOUND');

  const previousData = {
    name: ap.user?.name,
    aadhaarNumber: ap.aadhaarNumber,
    phones: ap.user?.phones?.map((p) => p.number),
    emails: ap.user?.emails?.map((e) => e.address),
  };

  if (ap.userId && ap.user) {
    if (data.name !== undefined) {
      await prisma.user.update({
        where: { id: ap.userId },
        data: { name: data.name, updatedBy: performedBy },
      });
    }
    if (data.phones !== undefined) {
      await prisma.phone.deleteMany({ where: { userId: ap.userId } });
      for (let i = 0; i < data.phones.length; i++) {
        await prisma.phone.create({
          data: {
            userId: ap.userId,
            number: data.phones[i].number,
            isPrimary: i === 0,
            label: data.phones[i].label ?? null,
          },
        });
      }
    }
    if (data.emails !== undefined) {
      await prisma.email.deleteMany({ where: { userId: ap.userId } });
      for (let i = 0; i < data.emails.length; i++) {
        await prisma.email.create({
          data: {
            userId: ap.userId,
            address: data.emails[i].address,
            isPrimary: i === 0,
            label: data.emails[i].label ?? null,
          },
        });
      }
    }
  }

  await prisma.authorizedPerson.update({
    where: { id: authorizedPersonId },
    data: {
      ...(data.aadhaarNumber !== undefined && { aadhaarNumber: data.aadhaarNumber ?? null }),
      updatedBy: performedBy,
    },
  });

  await createAuditLog({
    action: 'UPDATE',
    entityType: 'authorized_person',
    entityId: authorizedPersonId,
    performedBy,
    performedByRole,
    previousData,
    newData: data,
    ipAddress: ip,
    userAgent,
  });

  return prisma.authorizedPerson.findUnique({
    where: { id: authorizedPersonId },
    include: { user: { include: { phones: true, emails: true } } },
  });
}

// ─── Admin: Remove authorized person ────────────────────────────────────────

export async function removeAuthorizedPerson(
  distributorId: string,
  authorizedPersonId: string,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const ap = await prisma.authorizedPerson.findFirst({
    where: { id: authorizedPersonId, distributorId, deletedAt: null },
    include: { user: { select: { id: true, name: true, phones: true } } },
  });
  if (!ap) throw new AppError('Authorized person not found.', 404, 'NOT_FOUND');

  await prisma.$transaction(async (tx) => {
    await tx.authorizedPerson.update({
      where: { id: authorizedPersonId },
      data: softDeleteData(performedBy),
    });
    await tx.user.update({
      where: { id: ap.userId },
      data: softDeleteData(performedBy),
    });
  });

  await createAuditLog({
    action: 'DELETE',
    entityType: 'authorized_person',
    entityId: authorizedPersonId,
    performedBy,
    performedByRole,
    previousData: { id: ap.id, name: ap.user?.name, phones: ap.user?.phones?.map((p) => p.number) },
    ipAddress: ip,
    userAgent,
  });

  return { message: 'Authorized person removed successfully.' };
}

// ─── Admin: Upload authorized person documents ───────────────────────────────

export async function uploadAuthorizedPersonDocuments(
  distributorId: string,
  authorizedPersonId: string,
  files: Express.Multer.File[],
  docType: string,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const ap = await prisma.authorizedPerson.findFirst({
    where: { id: authorizedPersonId, distributorId, deletedAt: null },
  });
  if (!ap) throw new AppError('Authorized person not found.', 404, 'NOT_FOUND');

  const docs = await Promise.all(
    files.map((file) =>
      prisma.document.create({
        data: {
          entityType: 'authorized_person',
          entityId: ap.id,
          docType,
          fileName: file.originalname,
          filePath: file.path,
          mimeType: file.mimetype,
          fileSize: file.size,
          uploadedBy: performedBy,
          authorizedPersonId: ap.id,
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
      newData: { id: doc.id, docType: doc.docType, fileName: doc.fileName, authorizedPersonId: ap.id },
      ipAddress: ip,
      userAgent,
    });
  }

  return docs;
}

// ─── Admin: Upsert bank details ─────────────────────────────────────────────

export async function upsertBankDetails(
  distributorId: string,
  data: Record<string, any>,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const distributor = await prisma.distributor.findFirst({ where: { id: distributorId, ...notDeleted } });
  if (!distributor) throw new AppError('Distributor not found.', 404, 'NOT_FOUND');

  const existing = await prisma.bankDetails.findFirst({
    where: { distributorId },
  });

  let result;
  if (existing) {
    result = await prisma.bankDetails.update({
      where: { id: existing.id },
      data: { ...data, updatedBy: performedBy },
    });

    await createAuditLog({
      action: 'UPDATE',
      entityType: 'bank_details',
      entityId: result.id,
      performedBy,
      performedByRole,
      previousData: { accountName: existing.accountName, bankName: existing.bankName },
      newData: data,
      ipAddress: ip,
      userAgent,
    });
  } else {
    result = await prisma.bankDetails.create({
      data: {
        entityType: 'distributor',
        distributorId,
        accountName: data.accountName,
        accountNumber: data.accountNumber,
        ifscCode: data.ifscCode,
        bankName: data.bankName,
        createdBy: performedBy,
      },
    });

    await createAuditLog({
      action: 'CREATE',
      entityType: 'bank_details',
      entityId: result.id,
      performedBy,
      performedByRole,
      newData: { id: result.id, bankName: result.bankName },
      ipAddress: ip,
      userAgent,
    });
  }

  return result;
}

// ─── Admin: Upload bank details documents ───────────────────────────────────

export async function uploadBankDetailsDocuments(
  distributorId: string,
  files: Express.Multer.File[],
  docType: string,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const bank = await prisma.bankDetails.findFirst({
    where: { distributorId },
  });
  if (!bank) throw new AppError('Bank details not found.', 404, 'NOT_FOUND');

  const docs = await Promise.all(
    files.map((file) =>
      prisma.document.create({
        data: {
          entityType: 'bank_details',
          entityId: bank.id,
          docType,
          fileName: file.originalname,
          filePath: file.path,
          mimeType: file.mimetype,
          fileSize: file.size,
          uploadedBy: performedBy,
          bankDetailsId: bank.id,
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
      newData: { id: doc.id, docType: doc.docType, fileName: doc.fileName, bankDetailsId: bank.id },
      ipAddress: ip,
      userAgent,
    });
  }

  return docs;
}

// ─── Admin: Add license ─────────────────────────────────────────────────────

export async function addLicense(
  distributorId: string,
  data: Record<string, any>,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const distributor = await prisma.distributor.findFirst({ where: { id: distributorId, ...notDeleted } });
  if (!distributor) throw new AppError('Distributor not found.', 404, 'NOT_FOUND');

  const existing = await prisma.distributorLicense.findUnique({
    where: { distributorId_category: { distributorId, category: data.category as any } },
  });
  if (existing) throw new AppError('A license for this category already exists.', 409, 'CONFLICT');

  const license = await prisma.distributorLicense.create({
    data: {
      distributorId,
      category: data.category as any,
      licenseNumber: data.licenseNumber || null,
      validUptoDate: data.validUptoDate ? new Date(data.validUptoDate) : null,
      createdBy: performedBy,
    },
  });

  await createAuditLog({
    action: 'CREATE',
    entityType: 'distributor_license',
    entityId: license.id,
    performedBy,
    performedByRole,
    newData: { id: license.id, category: license.category },
    ipAddress: ip,
    userAgent,
  });

  return license;
}

// ─── Admin: Update license ──────────────────────────────────────────────────

export async function updateLicense(
  distributorId: string,
  licenseId: string,
  data: Record<string, any>,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const license = await prisma.distributorLicense.findFirst({
    where: { id: licenseId, distributorId },
  });
  if (!license) throw new AppError('License not found.', 404, 'NOT_FOUND');

  const updateData: Record<string, any> = { updatedBy: performedBy };
  if (data.licenseNumber !== undefined) updateData.licenseNumber = data.licenseNumber;
  if (data.validUptoDate !== undefined) updateData.validUptoDate = data.validUptoDate ? new Date(data.validUptoDate) : null;

  const updated = await prisma.distributorLicense.update({
    where: { id: licenseId },
    data: updateData,
  });

  await createAuditLog({
    action: 'UPDATE',
    entityType: 'distributor_license',
    entityId: licenseId,
    performedBy,
    performedByRole,
    previousData: { category: license.category, licenseNumber: license.licenseNumber },
    newData: data,
    ipAddress: ip,
    userAgent,
  });

  return updated;
}

// ─── Admin: Delete license ───────────────────────────────────────────────────

export async function deleteLicense(
  distributorId: string,
  licenseId: string,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const license = await prisma.distributorLicense.findFirst({
    where: { id: licenseId, distributorId },
  });
  if (!license) throw new AppError('License not found.', 404, 'NOT_FOUND');

  await prisma.distributorLicense.delete({ where: { id: licenseId } });

  await createAuditLog({
    action: 'DELETE',
    entityType: 'distributor_license',
    entityId: licenseId,
    performedBy,
    performedByRole,
    previousData: { id: license.id, category: license.category },
    ipAddress: ip,
    userAgent,
  });

  return { message: 'License deleted successfully.' };
}

// ─── Admin: Upload license documents ─────────────────────────────────────────

export async function uploadLicenseDocuments(
  distributorId: string,
  licenseId: string,
  files: Express.Multer.File[],
  docType: string,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const license = await prisma.distributorLicense.findFirst({
    where: { id: licenseId, distributorId },
  });
  if (!license) throw new AppError('License not found.', 404, 'NOT_FOUND');

  const docs = await Promise.all(
    files.map((file) =>
      prisma.document.create({
        data: {
          entityType: 'distributor_license',
          entityId: licenseId,
          docType,
          fileName: file.originalname,
          filePath: file.path,
          mimeType: file.mimetype,
          fileSize: file.size,
          uploadedBy: performedBy,
          distributorLicenseId: licenseId,
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
      newData: { id: doc.id, docType: doc.docType, fileName: doc.fileName, distributorLicenseId: licenseId },
      ipAddress: ip,
      userAgent,
    });
  }

  return docs;
}
