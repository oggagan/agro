/**
 * E2E test: Manufacturer & Authorized Person flows (API + DB assertions).
 * Prerequisite: Backend running (e.g. npm run dev), DB migrated and seeded.
 * Run: npx tsx scripts/e2e-manufacturer-ap.ts (from backend root)
 */

import dotenv from 'dotenv';
import { PrismaClient } from '../prisma/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

dotenv.config();

const API_BASE = process.env.API_BASE_URL || 'http://localhost:5000';
const API_V1 = `${API_BASE}/api/v1`;
const SUPER_ADMIN_PHONE = process.env.SUPER_ADMIN_PHONE || '9999999999';
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123';
const RUN_OPTIONAL = process.env.RUN_OPTIONAL === 'true';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

type Result = { name: string; passed: boolean; detail?: string };
const results: Result[] = [];

function assert(condition: boolean, name: string, detail?: string): void {
  results.push({ name, passed: condition, detail });
}

async function api(
  method: string,
  path: string,
  body?: object,
  token?: string
): Promise<{ status: number; data?: any; success?: boolean; error?: { message?: string } }> {
  const url = path.startsWith('http') ? path : `${API_V1}${path}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return {
    status: res.status,
    data: data.data ?? data,
    success: data.success,
    error: data.error,
  };
}

type TableSnapshot = Record<
  string,
  { total: number; active?: number; softDeleted?: number }
>;

async function snapshotTables(): Promise<TableSnapshot> {
  const [users, usersDeleted, phones, emails, manufacturers, aps, apsDeleted, directors, directorsDeleted, addresses, bankDetails, auditLogs, statusHistories] =
    await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { NOT: { deletedAt: null } } }),
      prisma.phone.count(),
      prisma.email.count(),
      prisma.manufacturer.count({ where: { deletedAt: null } }),
      prisma.authorizedPerson.count({ where: { deletedAt: null } }),
      prisma.authorizedPerson.count({ where: { NOT: { deletedAt: null } } }),
      prisma.director.count({ where: { deletedAt: null } }),
      prisma.director.count({ where: { NOT: { deletedAt: null } } }),
      prisma.address.count(),
      prisma.bankDetails.count(),
      prisma.auditLog.count(),
      prisma.statusHistory.count(),
    ]);

  return {
    users: { total: users + usersDeleted, active: users, softDeleted: usersDeleted },
    phones: { total: phones },
    emails: { total: emails },
    manufacturers: { total: manufacturers },
    authorized_persons: {
      total: aps + apsDeleted,
      active: aps,
      softDeleted: apsDeleted,
    },
    directors: {
      total: directors + directorsDeleted,
      active: directors,
      softDeleted: directorsDeleted,
    },
    addresses: { total: addresses },
    bank_details: { total: bankDetails },
    audit_logs: { total: auditLogs },
    status_histories: { total: statusHistories },
  };
}

function formatSnapshot(s: TableSnapshot): string {
  const lines: string[] = [];
  for (const [table, v] of Object.entries(s)) {
    if (v.active !== undefined && v.softDeleted !== undefined) {
      lines.push(`  ${table}: ${v.total} (active: ${v.active}, soft-deleted: ${v.softDeleted})`);
    } else {
      lines.push(`  ${table}: ${v.total}`);
    }
  }
  return lines.join('\n');
}

async function main() {
  console.log('========== E2E: Manufacturer & Authorized Persons ==========\n');

  const snapshotBefore = await snapshotTables();

  let adminToken: string = '';
  let manufacturerId: string = '';
  let adminUserId: string = '';
  const apIds: string[] = [];
  const apPhones: string[] = [];
  const apPasswords: string[] = [];
  const apUserIds: string[] = [];

  const ts = Date.now();
  const suffix = String(ts).slice(-6).padStart(6, '0');
  const adminPhone = `8888${suffix}`;
  const companyName = `E2E Test Corp ${ts}`;
  const ap1Phone = `7777${suffix}`;
  const ap2Phone = `7666${suffix}`;
  const ap3Phone = `7555${suffix}`;
  const apPassword = 'Ap@12345678';

  // ─── 1. Setup: SuperAdmin login ───────────────────────────────────────
  console.log('1. SuperAdmin login...');
  let r = await api('POST', '/auth/login', {
    phone: SUPER_ADMIN_PHONE,
    password: SUPER_ADMIN_PASSWORD,
  });
  assert(r.success === true && r.data?.accessToken, 'Login SuperAdmin', r.error?.message);
  adminToken = r.data?.accessToken || '';

  // ─── 2. Create manufacturer with 1 AP ──────────────────────────────────
  console.log('2. Create manufacturer with 1 AP...');
  const createPayload = {
    name: 'Mfg Admin',
    phone: adminPhone,
    email: `mfg${ts}@e2e.test`,
    password: 'Mfg@12345678',
    companyName,
    companyType: 'PVT_LTD',
    gstNumber: '22AAAAA0000A1Z5',
    isDraft: false,
    address: {
      address1: '123 E2E Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
    },
    authorizedPersons: [
      { name: 'AP One', phone: ap1Phone, password: apPassword },
    ],
  };

  r = await api('POST', '/manufacturers', createPayload, adminToken);
  assert(r.success === true && r.data?.id, 'POST /manufacturers', r.error?.message);
  manufacturerId = r.data?.id || '';
  adminUserId = r.data?.userId || '';

  const mfgFromApi = r.data;
  const firstAp = Array.isArray(mfgFromApi?.authorizedPersons)
    ? mfgFromApi.authorizedPersons[0]
    : null;
  if (firstAp?.id) apIds.push(firstAp.id);
  if (firstAp?.userId) apUserIds.push(firstAp.userId);
  apPhones.push(ap1Phone);
  apPasswords.push(apPassword);

  const usersAfterCreate = await prisma.user.count({ where: { deletedAt: null } });
  const mfgCount = await prisma.manufacturer.count({ where: { deletedAt: null } });
  const apCount = await prisma.authorizedPerson.count({ where: { deletedAt: null } });
  assert(
    mfgCount >= 1,
    'DB: at least 1 manufacturer after create',
    `count=${mfgCount}`
  );
  assert(
    apCount >= 1,
    'DB: at least 1 authorized_person (deletedAt null) after create',
    `count=${apCount}`
  );
  assert(
    usersAfterCreate >= 2,
    'DB: at least 2 users (admin + 1 AP) after create',
    `count=${usersAfterCreate}`
  );

  const ap1UserId = apUserIds[0];
  const ap1User =
    ap1UserId ?
      await prisma.user.findUnique({
        where: { id: ap1UserId },
        include: { phones: true, emails: true },
      })
    : null;
  assert(
    !!ap1User && ap1User.phones.some((p) => p.number === ap1Phone),
    'DB: AP user has phone row',
    ap1User ? '' : 'no AUTHORIZED_PERSON user found'
  );

  // Activate manufacturer (sets admin user status to ACTIVE so admin can log in later)
  r = await api(
    'PATCH',
    `/manufacturers/${manufacturerId}/status`,
    { status: 'ACTIVE', reason: 'E2E test' },
    adminToken
  );
  assert(r.success === true, 'PATCH manufacturer status ACTIVE', r.error?.message);

  // Set first AP user to ACTIVE so AP can log in (backend may not expose this; required for E2E)
  if (apUserIds[0]) {
    await prisma.user.update({
      where: { id: apUserIds[0] },
      data: { status: 'ACTIVE' },
    });
  }

  // ─── 3. Add second AP ─────────────────────────────────────────────────
  console.log('3. Add second AP...');
  r = await api(
    'POST',
    `/manufacturers/${manufacturerId}/authorized-persons`,
    {
      name: 'AP Two',
      phone: ap2Phone,
      email: `ap2-${ts}@e2e.test`,
      password: apPassword,
    },
    adminToken
  );
  assert(r.success === true && r.data?.id, 'POST add AP 2', r.error?.message || JSON.stringify(r.data));
  apIds[1] = r.data?.id ?? '';
  if (r.data?.userId) apUserIds[1] = r.data.userId;
  apPhones.push(ap2Phone);
  apPasswords.push(apPassword);

  const apCountAfter2 = await prisma.authorizedPerson.count({ where: { deletedAt: null } });
  assert(
    apCountAfter2 >= 2,
    'DB: 2 active APs after add second',
    `count=${apCountAfter2}`
  );

  // ─── 4. Add third AP ───────────────────────────────────────────────────
  console.log('4. Add third AP...');
  r = await api(
    'POST',
    `/manufacturers/${manufacturerId}/authorized-persons`,
    {
      name: 'AP Three',
      phone: ap3Phone,
      password: apPassword,
    },
    adminToken
  );
  assert(r.success === true && r.data?.id, 'POST add AP 3', r.error?.message || JSON.stringify(r.data));
  apIds[2] = r.data?.id ?? '';
  if (r.data?.userId) apUserIds[2] = r.data.userId;
  apPhones.push(ap3Phone);
  apPasswords.push(apPassword);

  const apCountAfter3 = await prisma.authorizedPerson.count({ where: { deletedAt: null } });
  assert(
    apCountAfter3 >= 3,
    'DB: 3 active APs after add third',
    `count=${apCountAfter3}`
  );

  // ─── 5. List manufacturers ─────────────────────────────────────────────
  console.log('5. List manufacturers...');
  r = await api('GET', '/manufacturers', undefined, adminToken);
  assert(r.success === true && Array.isArray(r.data), 'GET /manufacturers list', r.error?.message);
  const listData = Array.isArray(r.data) ? r.data : [];
  const ourMfg = listData.find((m: any) => m.id === manufacturerId);
  assert(
    !!ourMfg && Array.isArray(ourMfg.authorizedPersons) && ourMfg.authorizedPersons.length === 3,
    'Response: manufacturer has 3 authorized persons',
    ourMfg ? `authorizedPersons.length=${ourMfg.authorizedPersons?.length}` : 'manufacturer not in list'
  );
  if (ourMfg?.authorizedPersons?.length >= 2 && !apIds[1]) {
    apIds[1] = ourMfg.authorizedPersons[1]?.id ?? '';
  }
  if (ourMfg?.authorizedPersons?.length >= 3 && !apIds[2]) {
    apIds[2] = ourMfg.authorizedPersons[2]?.id ?? '';
  }

  // ─── 6. Delete second AP ───────────────────────────────────────────────
  const ap2Id = apIds[1];
  assert(!!ap2Id && ap2Id.length > 10, 'Have valid second AP id for delete', `ap2Id=${ap2Id}`);
  console.log('6. Delete second AP...');
  r = await api(
    'DELETE',
    `/manufacturers/${manufacturerId}/authorized-persons/${ap2Id}`,
    undefined,
    adminToken
  );
  assert(r.success === true, 'DELETE authorized person', r.error?.message);

  const deletedApRow = ap2Id
    ? await prisma.authorizedPerson.findUnique({
        where: { id: ap2Id },
      })
    : null;
  assert(
    !!deletedApRow && deletedApRow.deletedAt !== null && deletedApRow.deletedBy !== null,
    'DB: authorized_persons row has deletedAt and deletedBy set',
    deletedApRow
      ? `deletedAt=${deletedApRow.deletedAt}, deletedBy=${deletedApRow.deletedBy}`
      : 'row not found'
  );

  const ap2UserId = deletedApRow?.userId ?? apUserIds[1];
  const deletedUser =
    ap2UserId ?
      await prisma.user.findUnique({
        where: { id: ap2UserId },
      })
    : null;
  assert(
    !!deletedUser && deletedUser.deletedAt !== null && deletedUser.deletedBy !== null,
    'DB: user row for deleted AP has deletedAt and deletedBy set',
    deletedUser
      ? `userId=${ap2UserId}, deletedAt=${deletedUser.deletedAt}`
      : `user ${ap2UserId || 'unknown'} not found`
  );

  // ─── 7. Login with deleted AP (expect fail) ─────────────────────────────
  console.log('7. Login with deleted AP (expect fail)...');
  r = await api('POST', '/auth/login', {
    phone: ap2Phone,
    password: apPasswords[1],
  });
  assert(
    r.status === 401 || (r.success === false && /invalid|credentials|not found/i.test(String(r.error?.message || r.data?.message || ''))),
    'Login with deleted AP returns 401 or invalid credentials',
    `status=${r.status}, message=${r.error?.message || r.data?.message}`
  );

  // ─── 8. Get manufacturer by ID (should show 2 APs) ──────────────────────
  console.log('8. Get manufacturer by ID...');
  r = await api('GET', `/manufacturers/${manufacturerId}`, undefined, adminToken);
  assert(r.success === true && r.data?.id === manufacturerId, 'GET /manufacturers/:id', r.error?.message);
  const apsInGet = r.data?.authorizedPersons ?? [];
  assert(
    apsInGet.length === 2,
    'Response: manufacturer has 2 authorized persons after delete',
    `length=${apsInGet.length}`
  );

  // ─── 9. Login as first AP ───────────────────────────────────────────────
  console.log('9. Login as first AP...');
  r = await api('POST', '/auth/login', {
    phone: ap1Phone,
    password: apPasswords[0],
  });
  assert(r.success === true && r.data?.accessToken, 'Login as first AP', r.error?.message);
  const ap1Token = r.data?.accessToken || '';

  // ─── 10. Manufacturer self-service as AP ───────────────────────────────
  console.log('10. GET /manufacturers/me as AP...');
  r = await api('GET', '/manufacturers/me', undefined, ap1Token);
  assert(
    r.success === true && r.data?.id === manufacturerId,
    'GET /manufacturers/me as AP returns same manufacturer',
    r.data?.id ? '' : r.error?.message
  );

  // ─── 11. Login as manufacturer admin ────────────────────────────────────
  console.log('11. Login as manufacturer admin...');
  r = await api('POST', '/auth/login', {
    phone: adminPhone,
    password: 'Mfg@12345678',
  });
  assert(r.success === true && r.data?.accessToken, 'Login as manufacturer admin', r.error?.message);
  const mfgAdminToken = r.data?.accessToken || '';

  // ─── 12. Manufacturer self-service as admin ─────────────────────────────
  console.log('12. GET /manufacturers/me as admin...');
  r = await api('GET', '/manufacturers/me', undefined, mfgAdminToken);
  assert(
    r.success === true && r.data?.id === manufacturerId,
    'GET /manufacturers/me as admin returns same manufacturer',
    r.data?.id ? '' : r.error?.message
  );

  // Optional 13: Update remaining AP
  if (RUN_OPTIONAL && apIds[0]) {
    console.log('13. (Optional) Update AP...');
    r = await api(
      'PUT',
      `/manufacturers/${manufacturerId}/authorized-persons/${apIds[0]}`,
      { name: 'AP One Updated' },
      adminToken
    );
    assert(r.success === true, 'PUT update AP', r.error?.message);
  }

  // Optional 14: Add director then soft-delete
  if (RUN_OPTIONAL) {
    console.log('14. (Optional) Add director then delete...');
    r = await api(
      'POST',
      `/manufacturers/${manufacturerId}/directors`,
      {
        type: 'DIRECTOR',
        name: 'Dir E2E',
        phone: '8888111999',
        email: 'dir@e2e.test',
      },
      adminToken
    );
    const dirId = r.data?.id;
    if (r.success && dirId) {
      r = await api(
        'DELETE',
        `/manufacturers/${manufacturerId}/directors/${dirId}`,
        undefined,
        adminToken
      );
      assert(r.success === true, 'DELETE director', r.error?.message);
      const dirRow = await prisma.director.findUnique({ where: { id: dirId } });
      assert(
        !!dirRow && dirRow.deletedAt !== null,
        'DB: director row soft-deleted',
        dirRow ? `deletedAt=${dirRow.deletedAt}` : ''
      );
    }
  }

  const snapshotAfter = await snapshotTables();

  // ─── Final report ──────────────────────────────────────────────────────
  const passed = results.filter((x) => x.passed).length;
  const failed = results.filter((x) => !x.passed);

  console.log('\n========== E2E Report: Manufacturer & Authorized Persons ==========');
  console.log(`Result: ${passed} passed, ${failed.length} failed\n`);

  console.log('--- Table state (before → after) ---');
  const tables = Object.keys(snapshotBefore);
  for (const t of tables) {
    const b = snapshotBefore[t];
    const a = snapshotAfter[t];
    if (b.active !== undefined && a.active !== undefined) {
      console.log(
        `  ${t}: ${b.total} → ${a.total}  (active: ${b.active} → ${a.active}; soft-deleted: ${b.softDeleted ?? 0} → ${a.softDeleted ?? 0})`
      );
    } else {
      console.log(`  ${t}: ${b.total} → ${a.total}`);
    }
  }

  if (failed.length > 0) {
    console.log('\n--- Failed assertions ---');
    failed.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.name}${f.detail ? ` – ${f.detail}` : ''}`);
    });
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log('\n--- All assertions passed ---');
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('E2E error:', err);
  process.exit(1);
});
