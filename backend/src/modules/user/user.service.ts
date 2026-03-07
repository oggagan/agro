import bcrypt from 'bcryptjs';
import prisma from '../../config/database.js';
import { AppError } from '../../middleware/error.middleware.js';
import { createAuditLog, createStatusHistory } from '../../utils/audit.js';
import { notDeleted, softDeleteData } from '../../utils/soft-delete.js';
import { getPaginationParams, buildPaginationMeta } from '../../utils/pagination.js';
import { ROLES } from '../../utils/constants.js';

const userSelect = {
  id: true,
  name: true,
  role: true,
  status: true,
  createdBy: true,
  updatedBy: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  phones: true,
  emails: true,
};

export async function listUsers(
  query: Record<string, unknown>,
  performedBy: string,
  performedByRole: string,
) {
  const { page, limit, skip } = getPaginationParams(query);
  const where: Record<string, unknown> = { ...notDeleted, role: { not: ROLES.SYSTEM } };

  if (query.role) where.role = query.role;
  if (query.status) where.status = query.status;
  if (query.search) {
    const search = query.search as string;
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phones: { some: { number: { contains: search } } } },
      { emails: { some: { address: { contains: search, mode: 'insensitive' } } } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: where as any,
      select: userSelect,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where: where as any }),
  ]);

  return { data: users, meta: buildPaginationMeta(page, limit, total) };
}

export async function getUserById(id: string) {
  const user = await prisma.user.findFirst({
    where: { id, ...notDeleted },
    select: userSelect,
  });
  if (!user) throw new AppError('User not found.', 404, 'NOT_FOUND');
  return user;
}

export async function updateUserStatus(
  id: string,
  status: string,
  reason: string | undefined,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const user = await prisma.user.findFirst({ where: { id, ...notDeleted } });
  if (!user) throw new AppError('User not found.', 404, 'NOT_FOUND');

  const previousStatus = user.status;

  const updated = await prisma.user.update({
    where: { id },
    data: { status: status as any, updatedBy: performedBy },
    select: userSelect,
  });

  await createAuditLog({
    action: 'STATUS_CHANGE',
    entityType: 'user',
    entityId: id,
    performedBy,
    performedByRole,
    previousData: { status: previousStatus },
    newData: { status },
    ipAddress: ip,
    userAgent,
  });

  await createStatusHistory({
    entityType: 'user',
    entityId: id,
    fromStatus: previousStatus,
    toStatus: status,
    reason,
    changedBy: performedBy,
    changedByRole: performedByRole,
  });

  return updated;
}

export async function softDeleteUser(
  id: string,
  performedBy: string,
  performedByRole: string,
  ip?: string,
  userAgent?: string,
) {
  const user = await prisma.user.findFirst({ where: { id, ...notDeleted } });
  if (!user) throw new AppError('User not found.', 404, 'NOT_FOUND');
  if (user.role === ROLES.SUPER_ADMIN) {
    throw new AppError('Cannot delete a SuperAdmin user.', 403, 'FORBIDDEN');
  }

  await prisma.user.update({
    where: { id },
    data: softDeleteData(performedBy),
  });

  await createAuditLog({
    action: 'DELETE',
    entityType: 'user',
    entityId: id,
    performedBy,
    performedByRole,
    previousData: { id: user.id, name: user.name, role: user.role },
    ipAddress: ip,
    userAgent,
  });

  return { message: 'User deleted successfully.' };
}

export async function getOwnProfile(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, ...notDeleted },
    select: userSelect,
  });
  if (!user) throw new AppError('User not found.', 404, 'NOT_FOUND');
  return user;
}

export async function updateOwnProfile(
  userId: string,
  data: { name?: string; phones?: { number: string; isPrimary?: boolean; label?: string }[]; emails?: { address: string; isPrimary?: boolean; label?: string }[] },
  ip?: string,
  userAgent?: string,
) {
  const user = await prisma.user.findFirst({
    where: { id: userId, ...notDeleted },
    include: { phones: true, emails: true },
  });
  if (!user) throw new AppError('User not found.', 404, 'NOT_FOUND');

  const previousData = { name: user.name, phones: user.phones?.map((p) => p.number), emails: user.emails?.map((e) => e.address) };

  if (data.name !== undefined) {
    await prisma.user.update({ where: { id: userId }, data: { name: data.name, updatedBy: userId } });
  }
  if (data.phones !== undefined) {
    await prisma.phone.deleteMany({ where: { userId } });
    for (let i = 0; i < data.phones.length; i++) {
      await prisma.phone.create({
        data: { userId, number: data.phones[i].number, isPrimary: i === 0, label: data.phones[i].label ?? null },
      });
    }
  }
  if (data.emails !== undefined) {
    await prisma.email.deleteMany({ where: { userId } });
    for (let i = 0; i < data.emails.length; i++) {
      await prisma.email.create({
        data: { userId, address: data.emails[i].address, isPrimary: i === 0, label: data.emails[i].label ?? null },
      });
    }
  }

  const updated = await prisma.user.findFirst({
    where: { id: userId },
    select: userSelect,
  });
  if (!updated) throw new AppError('User not found.', 404, 'NOT_FOUND');

  await createAuditLog({
    action: 'UPDATE',
    entityType: 'user',
    entityId: userId,
    performedBy: userId,
    performedByRole: user.role,
    previousData,
    newData: data,
    ipAddress: ip,
    userAgent,
  });

  return updated;
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  ip?: string,
  userAgent?: string,
) {
  const user = await prisma.user.findFirst({ where: { id: userId, ...notDeleted } });
  if (!user) throw new AppError('User not found.', 404, 'NOT_FOUND');
  if (!user.password) throw new AppError('This account does not have a password set.', 400, 'NO_PASSWORD');

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) throw new AppError('Current password is incorrect.', 400, 'INVALID_PASSWORD');

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed, updatedBy: userId },
  });

  await createAuditLog({
    action: 'UPDATE',
    entityType: 'user',
    entityId: userId,
    performedBy: userId,
    performedByRole: user.role,
    previousData: null,
    newData: { passwordChanged: true },
    ipAddress: ip,
    userAgent,
  });

  return { message: 'Password changed successfully.' };
}
