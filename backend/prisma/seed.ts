import { PrismaClient } from './generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const SYSTEM_USER_ID = process.env.SYSTEM_USER_ID || '00000000-0000-0000-0000-000000000000';
const SUPER_ADMIN_PHONE = process.env.SUPER_ADMIN_PHONE || '9999999999';
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create SYSTEM user
  const existingSystem = await prisma.user.findUnique({ where: { id: SYSTEM_USER_ID } });
  if (!existingSystem) {
    const randomHash = await bcrypt.hash(crypto.randomUUID(), 12);
    await prisma.user.create({
      data: {
        id: SYSTEM_USER_ID,
        password: randomHash,
        name: 'System',
        role: 'SYSTEM',
        status: 'ACTIVE',
        createdBy: SYSTEM_USER_ID,
      },
    });
    await prisma.phone.create({
      data: { userId: SYSTEM_USER_ID, number: '0000000000', isPrimary: true },
    });

    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entityType: 'user',
        entityId: SYSTEM_USER_ID,
        performedBy: SYSTEM_USER_ID,
        performedByRole: 'SYSTEM',
        newData: { id: SYSTEM_USER_ID, name: 'System', role: 'SYSTEM' },
      },
    });

    await prisma.statusHistory.create({
      data: {
        entityType: 'user',
        entityId: SYSTEM_USER_ID,
        fromStatus: null,
        toStatus: 'ACTIVE',
        changedBy: SYSTEM_USER_ID,
        changedByRole: 'SYSTEM',
      },
    });

    console.log('  ✅ SYSTEM user created');
  } else {
    console.log('  ⏭️  SYSTEM user already exists');
  }

  // 2. Create SuperAdmin user
  const existingAdminPhone = await prisma.phone.findUnique({ where: { number: SUPER_ADMIN_PHONE } });
  if (!existingAdminPhone) {
    const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 12);
    const admin = await prisma.user.create({
      data: {
        password: hashedPassword,
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        createdBy: SYSTEM_USER_ID,
      },
    });
    await prisma.phone.create({
      data: { userId: admin.id, number: SUPER_ADMIN_PHONE, isPrimary: true },
    });

    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entityType: 'user',
        entityId: admin.id,
        performedBy: SYSTEM_USER_ID,
        performedByRole: 'SYSTEM',
        newData: { id: admin.id, name: 'Super Admin', role: 'SUPER_ADMIN' },
      },
    });

    await prisma.statusHistory.create({
      data: {
        entityType: 'user',
        entityId: admin.id,
        fromStatus: null,
        toStatus: 'ACTIVE',
        changedBy: SYSTEM_USER_ID,
        changedByRole: 'SYSTEM',
      },
    });

    console.log('  ✅ SuperAdmin user created');
  } else {
    console.log('  ⏭️  SuperAdmin user already exists');
  }

  console.log('🌱 Seeding complete.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
