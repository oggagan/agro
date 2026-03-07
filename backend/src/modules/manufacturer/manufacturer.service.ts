import bcrypt from 'bcryptjs';
import prisma from '../../config/database.js';
import { AppError } from '../../middleware/error.middleware.js';
import { createAuditLog, createStatusHistory } from '../../utils/audit.js';
import { notDeleted, softDeleteData } from '../../utils/soft-delete.js';
import { getPaginationParams, buildPaginationMeta } from '../../utils/pagination.js';

const manufacturerInclude = {
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
  addresses: true,
  bankDetails: { include: { documents: { where: { deletedAt: null } } } },
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

/** Resolves manufacturer for a user (admin or authorized person). */
export async function getManufacturerForUser(userId: string) {
  const asAdmin = await prisma.manufacturer.findFirst({
    where: { userId, ...notDeleted },
    include: manufacturerInclude,
  });
  if (asAdmin) return asAdmin;
  const ap = await prisma.authorizedPerson.findFirst({
    where: { userId, deletedAt: null, manufacturer: { ...notDeleted } },
    include: { manufacturer: { include: manufacturerInclude } },
  });
  return ap?.manufacturer ?? null;
}

// ─── Admin: Create manufacturer (creates User + Manufacturer + nested) ───────

export async function createManufacturer(
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

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: data.name,
        password: hashedPassword,
        role: 'MANUFACTURER',
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

    const manufacturer = await tx.manufacturer.create({
      data: {
        userId: user.id,
        companyName: data.companyName,
        companyType: data.companyType as any,
        licenseNumber: data.licenseNumber || null,
        licenseValidUpto: data.licenseValidUpto ? new Date(data.licenseValidUpto) : null,
        gstNumber: data.gstNumber || null,
        udyogAadhaar: data.udyogAadhaar || null,
        companyPan: data.companyPan || null,
        isDraft: data.isDraft || false,
        createdBy: performedBy,
      },
    });

    if (data.address) {
      await tx.address.create({
        data: {
          entityType: 'manufacturer',
          entityId: manufacturer.id,
          ...data.address,
          createdBy: performedBy,
        },
      });
    }

    if (data.bankDetails) {
      await tx.bankDetails.create({
        data: {
          entityType: 'manufacturer',
          entityId: manufacturer.id,
          ...data.bankDetails,
          createdBy: performedBy,
        },
      });
    }

    if (data.directors?.length) {
      for (const dir of data.directors) {
        const dirPhones = dir.phones ?? (dir.phone ? [{ number: dir.phone, isPrimary: true }] : []);
        if (!dir.name || dirPhones.length === 0) throw new AppError('Director must have name and at least one phone.', 400, 'VALIDATION_ERROR');
        const dirUser = await tx.user.create({
          data: { name: dir.name, password: null, role: 'DIRECTOR', status: userStatus as any, createdBy: performedBy },
        });
        for (let i = 0; i < dirPhones.length; i++) {
          await tx.phone.create({
            data: { userId: dirUser.id, number: dirPhones[i].number, isPrimary: i === 0, label: dirPhones[i].label ?? null },
          });
        }
        const dirEmails = dir.emails ?? (dir.email ? [{ address: dir.email, isPrimary: true }] : []);
        for (let i = 0; i < dirEmails.length; i++) {
          await tx.email.create({
            data: { userId: dirUser.id, address: dirEmails[i].address, isPrimary: i === 0, label: dirEmails[i].label ?? null },
          });
        }
        await tx.director.create({
          data: {
            manufacturerId: manufacturer.id,
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
      if (!ap.name || apPhones.length === 0) throw new AppError('Authorized person must have name and at least one phone.', 400, 'VALIDATION_ERROR');
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
          data: { userId: apUser.id, number: apPhones[i].number, isPrimary: i === 0, label: apPhones[i].label ?? null },
        });
      }
      const apEmails = ap.emails ?? (ap.email ? [{ address: ap.email, isPrimary: true }] : []);
      for (let i = 0; i < apEmails.length; i++) {
        await tx.email.create({
          data: { userId: apUser.id, address: apEmails[i].address, isPrimary: i === 0, label: apEmails[i].label ?? null },
        });
      }
      await tx.authorizedPerson.create({
        data: {
          manufacturerId: manufacturer.id,
          userId: apUser.id,
          aadhaarNumber: ap.aadhaarNumber || null,
          createdBy: performedBy,
        },
      });
    }

    return { user, manufacturer };
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
    entityType: 'manufacturer',
    entityId: result.manufacturer.id,
    performedBy,
    performedByRole,
    newData: { id: result.manufacturer.id, companyName: result.manufacturer.companyName },
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

  const full = await prisma.manufacturer.findUnique({
    where: { id: result.manufacturer.id },
    include: manufacturerInclude,
  });

  return full;
}

// ─── Admin: List manufacturers ───────────────────────────────────────────────

export async function listManufacturers(query: Record<string, unknown>) {
  const { page, limit, skip } = getPaginationParams(query);
  const where: Record<string, unknown> = { ...notDeleted };

  if (query.status) {
    where.user = { status: query.status, ...notDeleted };
  } else {
    where.user = { ...notDeleted };
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

  const [manufacturers, total] = await Promise.all([
    prisma.manufacturer.findMany({
      where: where as any,
      include: manufacturerInclude,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.manufacturer.count({ where: where as any }),
  ]);

  return { data: manufacturers, meta: buildPaginationMeta(page, limit, total) };
}

// ─── Admin: Get manufacturer by ID ──────────────────────────────────────────

export async function getManufacturerById(id: string) {
  const manufacturer = await prisma.manufacturer.findFirst({
    where: { id, ...notDeleted },
    include: manufacturerInclude,
  });
  if (!manufacturer) throw new AppError('Manufacturer not found.', 404, 'NOT_FOUND');
  return manufacturer;
}

// ─── Admin: Update manufacturer ──────────────────────────────────────────────

export async function updateManufacturer(
  id: string,
  data: Record<string, any>,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const existing = await prisma.manufacturer.findFirst({
    where: { id, ...notDeleted },
    include: { addresses: true, bankDetails: true },
  });
  if (!existing) throw new AppError('Manufacturer not found.', 404, 'NOT_FOUND');

  const { address, bankDetails, ...companyData } = data;
  const previousData = { ...existing };

  await prisma.$transaction(async (tx) => {
    if (Object.keys(companyData).length > 0) {
      const updateData: Record<string, any> = { ...companyData, updatedBy: performedBy };
      if (updateData.licenseValidUpto) {
        updateData.licenseValidUpto = new Date(updateData.licenseValidUpto);
      }
      await tx.manufacturer.update({ where: { id }, data: updateData });
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
            entityType: 'manufacturer',
            entityId: id,
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
            entityType: 'manufacturer',
            entityId: id,
            ...bankDetails,
            createdBy: performedBy,
          },
        });
      }
    }
  });

  await createAuditLog({
    action: 'UPDATE',
    entityType: 'manufacturer',
    entityId: id,
    performedBy,
    performedByRole,
    previousData: { companyName: previousData.companyName, companyType: previousData.companyType },
    newData: companyData,
    ipAddress: ip,
    userAgent,
  });

  return prisma.manufacturer.findUnique({
    where: { id },
    include: manufacturerInclude,
  });
}

// ─── Admin: Update manufacturer status ───────────────────────────────────────

export async function updateManufacturerStatus(
  id: string,
  status: string,
  reason: string | undefined,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const manufacturer = await prisma.manufacturer.findFirst({
    where: { id, ...notDeleted },
    include: { user: true },
  });
  if (!manufacturer) throw new AppError('Manufacturer not found.', 404, 'NOT_FOUND');

  const previousStatus = manufacturer.user.status;

  await prisma.user.update({
    where: { id: manufacturer.userId },
    data: { status: status as any, updatedBy: performedBy },
  });

  await createAuditLog({
    action: 'STATUS_CHANGE',
    entityType: 'manufacturer',
    entityId: id,
    performedBy,
    performedByRole,
    previousData: { status: previousStatus },
    newData: { status },
    ipAddress: ip,
    userAgent,
  });

  await createStatusHistory({
    entityType: 'manufacturer',
    entityId: id,
    fromStatus: previousStatus,
    toStatus: status,
    reason,
    changedBy: performedBy,
    changedByRole: performedByRole,
  });

  return prisma.manufacturer.findUnique({
    where: { id },
    include: manufacturerInclude,
  });
}

// ─── Admin: Upload documents ─────────────────────────────────────────────────

export async function uploadDocuments(
  manufacturerId: string,
  files: Express.Multer.File[],
  docType: string,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const manufacturer = await prisma.manufacturer.findFirst({ where: { id: manufacturerId, ...notDeleted } });
  if (!manufacturer) throw new AppError('Manufacturer not found.', 404, 'NOT_FOUND');

  const docs = await Promise.all(
    files.map((file) =>
      prisma.document.create({
        data: {
          entityType: 'manufacturer',
          entityId: manufacturerId,
          docType,
          fileName: file.originalname,
          filePath: file.path,
          mimeType: file.mimetype,
          fileSize: file.size,
          uploadedBy: performedBy,
          manufacturerId,
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

// ─── Admin: Delete document (supports manufacturer + sub-entity docs) ───────

export async function deleteDocument(
  manufacturerId: string,
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
        { manufacturerId },
        { director: { manufacturerId } },
        { authorizedPerson: { manufacturerId } },
        { bankDetails: { entityType: 'manufacturer', entityId: manufacturerId } },
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

// ─── Admin: Upload director documents ───────────────────────────────────────

export async function uploadDirectorDocuments(
  manufacturerId: string,
  directorId: string,
  files: Express.Multer.File[],
  docType: string,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const director = await prisma.director.findFirst({
    where: { id: directorId, manufacturerId, deletedAt: null },
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

// ─── Admin: Upload authorized person documents ──────────────────────────────

export async function uploadAuthorizedPersonDocuments(
  manufacturerId: string,
  authorizedPersonId: string,
  files: Express.Multer.File[],
  docType: string,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const ap = await prisma.authorizedPerson.findFirst({
    where: { id: authorizedPersonId, manufacturerId, deletedAt: null },
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

// ─── Admin: Upload bank details documents ───────────────────────────────────

export async function uploadBankDetailsDocuments(
  manufacturerId: string,
  files: Express.Multer.File[],
  docType: string,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const bank = await prisma.bankDetails.findFirst({
    where: { entityType: 'manufacturer', entityId: manufacturerId },
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

// ─── Admin: Add director ─────────────────────────────────────────────────────

export async function addDirector(
  manufacturerId: string,
  data: Record<string, any>,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const manufacturer = await prisma.manufacturer.findFirst({ where: { id: manufacturerId, ...notDeleted } });
  if (!manufacturer) throw new AppError('Manufacturer not found.', 404, 'NOT_FOUND');

  const phones = data.phones ?? (data.phone ? [{ number: data.phone, isPrimary: true }] : []);
  if (!data.name || phones.length === 0) throw new AppError('Director must have name and at least one phone.', 400, 'VALIDATION_ERROR');
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
        data: { userId: user.id, number: phones[i].number, isPrimary: i === 0, label: phones[i].label ?? null },
      });
    }
    for (let i = 0; i < emails.length; i++) {
      await tx.email.create({
        data: { userId: user.id, address: emails[i].address, isPrimary: i === 0, label: emails[i].label ?? null },
      });
    }
    return tx.director.create({
      data: {
        manufacturerId,
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

// ─── Admin: Update director ──────────────────────────────────────────────────

export async function updateDirector(
  manufacturerId: string,
  directorId: string,
  data: Record<string, any>,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const director = await prisma.director.findFirst({
    where: { id: directorId, manufacturerId, deletedAt: null },
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
        await tx.user.update({ where: { id: director.userId }, data: { name: data.name, updatedBy: performedBy } });
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

// ─── Admin: Delete director ──────────────────────────────────────────────────

export async function deleteDirector(
  manufacturerId: string,
  directorId: string,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const director = await prisma.director.findFirst({
    where: { id: directorId, manufacturerId, deletedAt: null },
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

// ─── Admin: Add authorized person ───────────────────────────────────────────

export async function addAuthorizedPerson(
  manufacturerId: string,
  data: Record<string, any>,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const manufacturer = await prisma.manufacturer.findFirst({
    where: { id: manufacturerId, ...notDeleted },
    include: { user: { include: { phones: true } } },
  });
  if (!manufacturer) throw new AppError('Manufacturer not found.', 404, 'NOT_FOUND');

  const phones = data.phones ?? (data.phone ? [{ number: data.phone, isPrimary: true }] : []);
  if (!data.name || phones.length === 0) throw new AppError('Authorized person must have name and at least one phone.', 400, 'VALIDATION_ERROR');
  const adminPhones = manufacturer.user?.phones?.map((p) => p.number) ?? [];
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

  const mfrUser = await prisma.user.findUnique({ where: { id: manufacturer.userId }, select: { status: true } });
  const userStatus = (mfrUser?.status ?? 'PENDING') as any;
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
        data: { userId: apUser.id, number: phones[i].number, isPrimary: i === 0, label: phones[i].label ?? null },
      });
    }
    for (let i = 0; i < emails.length; i++) {
      await tx.email.create({
        data: { userId: apUser.id, address: emails[i].address, isPrimary: i === 0, label: emails[i].label ?? null },
      });
    }
    return tx.authorizedPerson.create({
      data: {
        manufacturerId,
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

// ─── Admin: Update authorized person ────────────────────────────────────────

export async function updateAuthorizedPerson(
  manufacturerId: string,
  authorizedPersonId: string,
  data: Record<string, any>,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const ap = await prisma.authorizedPerson.findFirst({
    where: { id: authorizedPersonId, manufacturerId, deletedAt: null },
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

  const result = await prisma.authorizedPerson.update({
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

  return result;
}

// ─── Admin: Remove authorized person ────────────────────────────────────────

export async function removeAuthorizedPerson(
  manufacturerId: string,
  authorizedPersonId: string,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const ap = await prisma.authorizedPerson.findFirst({
    where: { id: authorizedPersonId, manufacturerId, deletedAt: null },
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

// ─── Admin: Legacy upsert single authorized person (backward compatibility) ───

export async function upsertAuthorizedPersonLegacy(
  manufacturerId: string,
  data: Record<string, any>,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const manufacturer = await prisma.manufacturer.findFirst({
    where: { id: manufacturerId, ...notDeleted },
    include: { authorizedPersons: { where: { deletedAt: null } } },
  });
  if (!manufacturer) throw new AppError('Manufacturer not found.', 404, 'NOT_FOUND');

  const list = manufacturer.authorizedPersons ?? [];
  if (list.length === 0) {
    return addAuthorizedPerson(manufacturerId, data, performedBy, performedByRole, ip, userAgent);
  }
  if (list.length === 1) {
    return updateAuthorizedPerson(manufacturerId, list[0].id, data, performedBy, performedByRole, ip, userAgent);
  }
  throw new AppError(
    'This manufacturer has multiple authorized persons. Use PUT /manufacturers/:id/authorized-persons/:apId to update a specific one.',
    400,
    'USE_APID',
  );
}

// ─── Admin: Set/Update bank details ──────────────────────────────────────────

export async function upsertBankDetails(
  manufacturerId: string,
  data: Record<string, any>,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const manufacturer = await prisma.manufacturer.findFirst({ where: { id: manufacturerId, ...notDeleted } });
  if (!manufacturer) throw new AppError('Manufacturer not found.', 404, 'NOT_FOUND');

  const existing = await prisma.bankDetails.findFirst({
    where: { entityType: 'manufacturer', entityId: manufacturerId },
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
        entityType: 'manufacturer',
        entityId: manufacturerId,
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

// ─── Self-service: Get own manufacturer profile ──────────────────────────────

export async function getOwnManufacturerProfile(userId: string) {
  const manufacturer = await getManufacturerForUser(userId);
  if (!manufacturer) throw new AppError('Manufacturer profile not found.', 404, 'NOT_FOUND');
  return manufacturer;
}

// ─── Self-service: Update own manufacturer ───────────────────────────────────

export async function updateOwnManufacturer(
  userId: string,
  data: Record<string, any>,
  ip?: string,
  userAgent?: string,
) {
  const manufacturer = await getManufacturerForUser(userId);
  if (!manufacturer) throw new AppError('Manufacturer profile not found.', 404, 'NOT_FOUND');

  return updateManufacturer(manufacturer.id, data, userId, 'MANUFACTURER', ip, userAgent);
}

// ─── Self-service: Upload own documents ──────────────────────────────────────

export async function uploadOwnDocuments(
  userId: string,
  files: Express.Multer.File[],
  docType: string,
  ip?: string,
  userAgent?: string,
) {
  const manufacturer = await getManufacturerForUser(userId);
  if (!manufacturer) throw new AppError('Manufacturer profile not found.', 404, 'NOT_FOUND');
  return uploadDocuments(manufacturer.id, files, docType, userId, 'MANUFACTURER', ip, userAgent);
}

// ─── Self-service: Update own bank details ───────────────────────────────────

export async function updateOwnBankDetails(
  userId: string,
  data: Record<string, any>,
  ip?: string,
  userAgent?: string,
) {
  const manufacturer = await getManufacturerForUser(userId);
  if (!manufacturer) throw new AppError('Manufacturer profile not found.', 404, 'NOT_FOUND');
  return upsertBankDetails(manufacturer.id, data, userId, 'MANUFACTURER', ip, userAgent);
}

// ─── Self-service: Update own director ───────────────────────────────────────

export async function updateOwnDirector(
  userId: string,
  directorId: string,
  data: Record<string, any>,
  ip?: string,
  userAgent?: string,
) {
  const manufacturer = await getManufacturerForUser(userId);
  if (!manufacturer) throw new AppError('Manufacturer profile not found.', 404, 'NOT_FOUND');
  return updateDirector(manufacturer.id, directorId, data, userId, 'MANUFACTURER', ip, userAgent);
}

// ─── Self-service: Update own authorized person ──────────────────────────────

export async function updateOwnAuthorizedPerson(
  userId: string,
  authorizedPersonId: string,
  data: Record<string, any>,
  ip?: string,
  userAgent?: string,
) {
  const manufacturer = await getManufacturerForUser(userId);
  if (!manufacturer) throw new AppError('Manufacturer profile not found.', 404, 'NOT_FOUND');
  return updateAuthorizedPerson(manufacturer.id, authorizedPersonId, data, userId, 'MANUFACTURER', ip, userAgent);
}
