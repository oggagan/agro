import bcrypt from 'bcryptjs';
import prisma from '../../config/database.js';
import { AppError } from '../../middleware/error.middleware.js';
import { createAuditLog, createStatusHistory } from '../../utils/audit.js';
import { notDeleted, softDeleteData } from '../../utils/soft-delete.js';
import { getPaginationParams, buildPaginationMeta } from '../../utils/pagination.js';

const retailerInclude = {
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

// ─── Admin: Create retailer ───────────────────────────────────────────────────

export async function createRetailer(
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
        role: 'RETAILER',
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

    const retailer = await tx.retailer.create({
      data: {
        userId: user.id,
        companyName: data.companyName,
        companyType: data.companyType as any,
        gstNumber: data.gstNumber || null,
        companyPan: data.companyPan || null,
        isDraft: data.isDraft || false,
        createdBy: performedBy,
      },
    });

    if (data.address) {
      await tx.address.create({
        data: {
          entityType: 'retailer',
          retailerId: retailer.id,
          ...data.address,
          createdBy: performedBy,
        },
      });
    }

    if (data.bankDetails) {
      await tx.bankDetails.create({
        data: {
          entityType: 'retailer',
          retailerId: retailer.id,
          ...data.bankDetails,
          createdBy: performedBy,
        },
      });
    }

    const licenses = data.licenses ?? [];
    for (const lic of licenses) {
      await tx.retailerLicense.create({
        data: {
          retailerId: retailer.id,
          category: lic.category as any,
          licenseNumber: lic.licenseNumber || null,
          validUptoDate: lic.validUptoDate ? new Date(lic.validUptoDate) : null,
          createdBy: performedBy,
        },
      });
    }

    if (data.directors?.length) {
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
            retailerId: retailer.id,
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
          retailerId: retailer.id,
          userId: apUser.id,
          aadhaarNumber: ap.aadhaarNumber || null,
          createdBy: performedBy,
        },
      });
    }

    return { user, retailer };
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
    entityType: 'retailer',
    entityId: result.retailer.id,
    performedBy,
    performedByRole,
    newData: { id: result.retailer.id, companyName: result.retailer.companyName },
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

  const full = await prisma.retailer.findUnique({
    where: { id: result.retailer.id },
    include: retailerInclude,
  });

  return full;
}

// ─── Admin: List retailers ───────────────────────────────────────────────────

export async function listRetailers(query: Record<string, unknown>) {
  const { page, limit, skip } = getPaginationParams(query);
  const where: Record<string, unknown> = { ...notDeleted };

  if (query.status) {
    where.user = { status: query.status, ...notDeleted };
  } else {
    where.user = { ...notDeleted };
  }

  if (query.companyType) {
    where.companyType = query.companyType;
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

  const [retailers, total] = await Promise.all([
    prisma.retailer.findMany({
      where: where as any,
      include: retailerInclude,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.retailer.count({ where: where as any }),
  ]);

  return { data: retailers, meta: buildPaginationMeta(page, limit, total) };
}

// ─── Admin: Get retailer by ID ──────────────────────────────────────────────

export async function getRetailerById(id: string) {
  const retailer = await prisma.retailer.findFirst({
    where: { id, ...notDeleted },
    include: retailerInclude,
  });
  if (!retailer) throw new AppError('Retailer not found.', 404, 'NOT_FOUND');
  return retailer;
}

// ─── Admin: Update retailer ──────────────────────────────────────────────────

export async function updateRetailer(
  id: string,
  data: Record<string, any>,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const existing = await prisma.retailer.findFirst({
    where: { id, ...notDeleted },
    include: { addresses: true, bankDetails: true },
  });
  if (!existing) throw new AppError('Retailer not found.', 404, 'NOT_FOUND');

  const { address, bankDetails, ...companyData } = data;
  const previousData = { ...existing };

  await prisma.$transaction(async (tx) => {
    if (Object.keys(companyData).length > 0) {
      await tx.retailer.update({
        where: { id },
        data: { ...companyData, updatedBy: performedBy },
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
            entityType: 'retailer',
            retailerId: id,
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
            entityType: 'retailer',
            retailerId: id,
            ...bankDetails,
            createdBy: performedBy,
          },
        });
      }
    }
  });

  await createAuditLog({
    action: 'UPDATE',
    entityType: 'retailer',
    entityId: id,
    performedBy,
    performedByRole,
    previousData: { companyName: previousData.companyName, companyType: previousData.companyType },
    newData: companyData,
    ipAddress: ip,
    userAgent,
  });

  return prisma.retailer.findUnique({
    where: { id },
    include: retailerInclude,
  });
}

// ─── Admin: Update retailer status ───────────────────────────────────────────

export async function updateRetailerStatus(
  id: string,
  status: string,
  reason: string | undefined,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const retailer = await prisma.retailer.findFirst({
    where: { id, ...notDeleted },
    include: { user: true },
  });
  if (!retailer) throw new AppError('Retailer not found.', 404, 'NOT_FOUND');

  const previousStatus = retailer.user.status;

  await prisma.user.update({
    where: { id: retailer.userId },
    data: { status: status as any, updatedBy: performedBy },
  });

  await createAuditLog({
    action: 'STATUS_CHANGE',
    entityType: 'retailer',
    entityId: id,
    performedBy,
    performedByRole,
    previousData: { status: previousStatus },
    newData: { status },
    ipAddress: ip,
    userAgent,
  });

  await createStatusHistory({
    entityType: 'retailer',
    entityId: id,
    fromStatus: previousStatus,
    toStatus: status,
    reason,
    changedBy: performedBy,
    changedByRole: performedByRole,
  });

  return prisma.retailer.findUnique({
    where: { id },
    include: retailerInclude,
  });
}

// ─── Admin: Upload documents ─────────────────────────────────────────────────

export async function uploadDocuments(
  retailerId: string,
  files: Express.Multer.File[],
  docType: string,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const retailer = await prisma.retailer.findFirst({ where: { id: retailerId, ...notDeleted } });
  if (!retailer) throw new AppError('Retailer not found.', 404, 'NOT_FOUND');

  const docs = await Promise.all(
    files.map((file) =>
      prisma.document.create({
        data: {
          entityType: 'retailer',
          entityId: retailerId,
          docType,
          fileName: file.originalname,
          filePath: file.path,
          mimeType: file.mimetype,
          fileSize: file.size,
          uploadedBy: performedBy,
          retailerId,
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
  retailerId: string,
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
        { retailerId },
        { director: { retailerId } },
        { authorizedPerson: { retailerId } },
        { bankDetails: { retailerId } },
        { retailerLicense: { retailerId } },
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
  retailerId: string,
  data: Record<string, any>,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const retailer = await prisma.retailer.findFirst({ where: { id: retailerId, ...notDeleted } });
  if (!retailer) throw new AppError('Retailer not found.', 404, 'NOT_FOUND');

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
        retailerId,
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
  retailerId: string,
  directorId: string,
  data: Record<string, any>,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const director = await prisma.director.findFirst({
    where: { id: directorId, retailerId, deletedAt: null },
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
  retailerId: string,
  directorId: string,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const director = await prisma.director.findFirst({
    where: { id: directorId, retailerId, deletedAt: null },
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
  retailerId: string,
  directorId: string,
  files: Express.Multer.File[],
  docType: string,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const director = await prisma.director.findFirst({
    where: { id: directorId, retailerId, deletedAt: null },
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
  retailerId: string,
  data: Record<string, any>,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const retailer = await prisma.retailer.findFirst({
    where: { id: retailerId, ...notDeleted },
    include: { user: { include: { phones: true } } },
  });
  if (!retailer) throw new AppError('Retailer not found.', 404, 'NOT_FOUND');

  const phones = data.phones ?? (data.phone ? [{ number: data.phone, isPrimary: true }] : []);
  if (!data.name || phones.length === 0)
    throw new AppError('Authorized person must have name and at least one phone.', 400, 'VALIDATION_ERROR');
  const adminPhones = retailer.user?.phones?.map((p) => p.number) ?? [];
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

  const retUser = await prisma.user.findUnique({ where: { id: retailer.userId }, select: { status: true } });
  const userStatus = (retUser?.status ?? 'PENDING') as any;
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
        retailerId,
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
  retailerId: string,
  authorizedPersonId: string,
  data: Record<string, any>,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const ap = await prisma.authorizedPerson.findFirst({
    where: { id: authorizedPersonId, retailerId, deletedAt: null },
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
  retailerId: string,
  authorizedPersonId: string,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const ap = await prisma.authorizedPerson.findFirst({
    where: { id: authorizedPersonId, retailerId, deletedAt: null },
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
  retailerId: string,
  authorizedPersonId: string,
  files: Express.Multer.File[],
  docType: string,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const ap = await prisma.authorizedPerson.findFirst({
    where: { id: authorizedPersonId, retailerId, deletedAt: null },
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
  retailerId: string,
  data: Record<string, any>,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const retailer = await prisma.retailer.findFirst({ where: { id: retailerId, ...notDeleted } });
  if (!retailer) throw new AppError('Retailer not found.', 404, 'NOT_FOUND');

  const existing = await prisma.bankDetails.findFirst({
    where: { retailerId },
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
        entityType: 'retailer',
        retailerId,
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
  retailerId: string,
  files: Express.Multer.File[],
  docType: string,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const bank = await prisma.bankDetails.findFirst({
    where: { retailerId },
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
  retailerId: string,
  data: Record<string, any>,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const retailer = await prisma.retailer.findFirst({ where: { id: retailerId, ...notDeleted } });
  if (!retailer) throw new AppError('Retailer not found.', 404, 'NOT_FOUND');

  const existing = await prisma.retailerLicense.findUnique({
    where: { retailerId_category: { retailerId, category: data.category as any } },
  });
  if (existing) throw new AppError('A license for this category already exists.', 409, 'CONFLICT');

  const license = await prisma.retailerLicense.create({
    data: {
      retailerId,
      category: data.category as any,
      licenseNumber: data.licenseNumber || null,
      validUptoDate: data.validUptoDate ? new Date(data.validUptoDate) : null,
      createdBy: performedBy,
    },
  });

  await createAuditLog({
    action: 'CREATE',
    entityType: 'retailer_license',
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
  retailerId: string,
  licenseId: string,
  data: Record<string, any>,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const license = await prisma.retailerLicense.findFirst({
    where: { id: licenseId, retailerId },
  });
  if (!license) throw new AppError('License not found.', 404, 'NOT_FOUND');

  const updateData: Record<string, any> = { updatedBy: performedBy };
  if (data.licenseNumber !== undefined) updateData.licenseNumber = data.licenseNumber;
  if (data.validUptoDate !== undefined) updateData.validUptoDate = data.validUptoDate ? new Date(data.validUptoDate) : null;

  const updated = await prisma.retailerLicense.update({
    where: { id: licenseId },
    data: updateData,
  });

  await createAuditLog({
    action: 'UPDATE',
    entityType: 'retailer_license',
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
  retailerId: string,
  licenseId: string,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const license = await prisma.retailerLicense.findFirst({
    where: { id: licenseId, retailerId },
  });
  if (!license) throw new AppError('License not found.', 404, 'NOT_FOUND');

  await prisma.retailerLicense.delete({ where: { id: licenseId } });

  await createAuditLog({
    action: 'DELETE',
    entityType: 'retailer_license',
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
  retailerId: string,
  licenseId: string,
  files: Express.Multer.File[],
  docType: string,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const license = await prisma.retailerLicense.findFirst({
    where: { id: licenseId, retailerId },
  });
  if (!license) throw new AppError('License not found.', 404, 'NOT_FOUND');

  const docs = await Promise.all(
    files.map((file) =>
      prisma.document.create({
        data: {
          entityType: 'retailer_license',
          entityId: licenseId,
          docType,
          fileName: file.originalname,
          filePath: file.path,
          mimeType: file.mimetype,
          fileSize: file.size,
          uploadedBy: performedBy,
          retailerLicenseId: licenseId,
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
      newData: { id: doc.id, docType: doc.docType, fileName: doc.fileName, retailerLicenseId: licenseId },
      ipAddress: ip,
      userAgent,
    });
  }

  return docs;
}
