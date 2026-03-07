import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../../config/database.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt.js';
import { AppError } from '../../middleware/error.middleware.js';
import { createAuditLog } from '../../utils/audit.js';
import { notDeleted } from '../../utils/soft-delete.js';
import { ROLES } from '../../utils/constants.js';

export async function registerService(
  phone: string,
  password: string,
  name: string,
  email?: string,
) {
  const existingPhone = await prisma.phone.findUnique({ where: { number: phone } });
  if (existingPhone) {
    throw new AppError('A user with this phone number already exists.', 409, 'USER_EXISTS');
  }
  if (email) {
    const existingEmail = await prisma.email.findUnique({ where: { address: email } });
    if (existingEmail) {
      throw new AppError('A user with this email already exists.', 409, 'USER_EXISTS');
    }
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      password: hashedPassword,
      role: 'MANUFACTURER',
      status: 'PENDING',
    },
  });

  await prisma.phone.create({
    data: { userId: user.id, number: phone, isPrimary: true },
  });
  if (email) {
    await prisma.email.create({
      data: { userId: user.id, address: email, isPrimary: true },
    });
  }

  await createAuditLog({
    action: 'CREATE',
    entityType: 'user',
    entityId: user.id,
    performedBy: user.id,
    performedByRole: user.role,
    newData: { id: user.id, name: user.name, role: user.role, status: user.status },
  });

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { phones: true, emails: true },
  });
  const primaryPhone = fullUser?.phones?.find((p) => p.isPrimary) ?? fullUser?.phones?.[0];
  const primaryEmail = fullUser?.emails?.find((e) => e.isPrimary) ?? fullUser?.emails?.[0];
  const { password: _, ...userWithoutPassword } = user;
  return {
    ...userWithoutPassword,
    phone: primaryPhone?.number ?? null,
    email: primaryEmail?.address ?? null,
  };
}

export async function loginService(
  payload: { phone?: string; email?: string; password: string },
  ip?: string,
  userAgent?: string,
) {
  let userId: string | null = null;
  if (payload.phone) {
    const phoneRow = await prisma.phone.findUnique({ where: { number: payload.phone } });
    userId = phoneRow?.userId ?? null;
  } else if (payload.email) {
    const emailRow = await prisma.email.findUnique({ where: { address: payload.email } });
    userId = emailRow?.userId ?? null;
  }
  if (!userId) {
    throw new AppError('Invalid credentials.', 401, 'INVALID_CREDENTIALS');
  }

  const user = await prisma.user.findFirst({ where: { id: userId, ...notDeleted } });
  if (!user) {
    throw new AppError('Invalid credentials.', 401, 'INVALID_CREDENTIALS');
  }

  if (user.role === ROLES.SYSTEM) {
    throw new AppError('System user cannot login.', 403, 'FORBIDDEN');
  }

  if (!user.password) {
    throw new AppError('This account does not have login enabled.', 403, 'LOGIN_DISABLED');
  }

  if (user.status !== 'ACTIVE') {
    throw new AppError(`Your account is ${user.status.toLowerCase()}. Please contact admin.`, 403, 'ACCOUNT_NOT_ACTIVE');
  }

  const validPassword = await bcrypt.compare(payload.password, user.password);
  if (!validPassword) {
    throw new AppError('Invalid credentials.', 401, 'INVALID_CREDENTIALS');
  }

  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  const refreshTokenValue = uuidv4();
  const hashedRefresh = await bcrypt.hash(refreshTokenValue, 10);

  await prisma.refreshToken.create({
    data: {
      token: hashedRefresh,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await createAuditLog({
    action: 'LOGIN',
    entityType: 'user',
    entityId: user.id,
    performedBy: user.id,
    performedByRole: user.role,
    ipAddress: ip,
    userAgent,
  });

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { phones: true, emails: true },
  });
  const primaryPhone = fullUser?.phones?.find((p) => p.isPrimary) ?? fullUser?.phones?.[0];
  const primaryEmail = fullUser?.emails?.find((e) => e.isPrimary) ?? fullUser?.emails?.[0];
  const { password: _, ...userWithoutPassword } = user;
  const userForClient = {
    ...userWithoutPassword,
    phone: primaryPhone?.number ?? null,
    email: primaryEmail?.address ?? null,
  };
  return {
    accessToken,
    refreshToken: refreshTokenValue,
    user: userForClient,
  };
}

export async function refreshService(refreshToken: string) {
  const tokens = await prisma.refreshToken.findMany({
    where: { expiresAt: { gte: new Date() } },
    include: { user: true },
  });

  let matchedToken: typeof tokens[0] | null = null;
  for (const t of tokens) {
    const isMatch = await bcrypt.compare(refreshToken, t.token);
    if (isMatch) {
      matchedToken = t;
      break;
    }
  }

  if (!matchedToken) {
    throw new AppError('Invalid or expired refresh token.', 401, 'INVALID_REFRESH_TOKEN');
  }

  // Delete old token (rotation)
  await prisma.refreshToken.delete({ where: { id: matchedToken.id } });

  const user = matchedToken.user;
  if (!user || user.deletedAt) {
    throw new AppError('User not found.', 401, 'USER_NOT_FOUND');
  }

  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  const newRefreshTokenValue = uuidv4();
  const hashedRefresh = await bcrypt.hash(newRefreshTokenValue, 10);

  await prisma.refreshToken.create({
    data: {
      token: hashedRefresh,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return { accessToken, refreshToken: newRefreshTokenValue };
}

export async function logoutService(userId: string, refreshToken: string, ip?: string, userAgent?: string) {
  const tokens = await prisma.refreshToken.findMany({
    where: { userId, expiresAt: { gte: new Date() } },
  });

  for (const t of tokens) {
    const isMatch = await bcrypt.compare(refreshToken, t.token);
    if (isMatch) {
      await prisma.refreshToken.delete({ where: { id: t.id } });
      break;
    }
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user) {
    await createAuditLog({
      action: 'LOGOUT',
      entityType: 'user',
      entityId: userId,
      performedBy: userId,
      performedByRole: user.role,
      ipAddress: ip,
      userAgent,
    });
  }

  return { message: 'Logged out successfully.' };
}
