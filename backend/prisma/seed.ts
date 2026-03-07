import { PrismaClient } from './generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const SYSTEM_USER_ID = process.env.SYSTEM_USER_ID || '00000000-0000-0000-0000-000000000000';
const SUPER_ADMIN_PHONE = process.env.SUPER_ADMIN_PHONE || '9999999999';
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123';
const DEFAULT_PASSWORD = 'Password@123';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const hash = (pw: string) => bcrypt.hash(pw, 10);

async function main() {
  console.log('🌱 Seeding database...\n');

  // ─── 1. SYSTEM user ───────────────────────────────────────────────────────
  const existingSystem = await prisma.user.findUnique({ where: { id: SYSTEM_USER_ID } });
  if (!existingSystem) {
    await prisma.user.create({
      data: {
        id: SYSTEM_USER_ID,
        password: await hash(crypto.randomUUID()),
        name: 'System',
        role: 'SYSTEM',
        status: 'ACTIVE',
        createdBy: SYSTEM_USER_ID,
      },
    });
    await prisma.phone.create({ data: { userId: SYSTEM_USER_ID, number: '0000000000', isPrimary: true } });
    await prisma.auditLog.create({
      data: { action: 'CREATE', entityType: 'user', entityId: SYSTEM_USER_ID, performedBy: SYSTEM_USER_ID, performedByRole: 'SYSTEM', newData: { name: 'System' } },
    });
    await prisma.statusHistory.create({
      data: { entityType: 'user', entityId: SYSTEM_USER_ID, fromStatus: null, toStatus: 'ACTIVE', changedBy: SYSTEM_USER_ID, changedByRole: 'SYSTEM' },
    });
    console.log('  ✅ SYSTEM user');
  } else {
    console.log('  ⏭️  SYSTEM user exists');
  }

  // ─── 2. SuperAdmin ────────────────────────────────────────────────────────
  let superAdminId: string;
  const existingAdmin = await prisma.phone.findUnique({ where: { number: SUPER_ADMIN_PHONE } });
  if (!existingAdmin) {
    const admin = await prisma.user.create({
      data: { password: await hash(SUPER_ADMIN_PASSWORD), name: 'Super Admin', role: 'SUPER_ADMIN', status: 'ACTIVE', createdBy: SYSTEM_USER_ID },
    });
    await prisma.phone.create({ data: { userId: admin.id, number: SUPER_ADMIN_PHONE, isPrimary: true } });
    await prisma.email.create({ data: { userId: admin.id, address: 'admin@buchifin.com', isPrimary: true } });
    await prisma.auditLog.create({
      data: { action: 'CREATE', entityType: 'user', entityId: admin.id, performedBy: SYSTEM_USER_ID, performedByRole: 'SYSTEM', newData: { name: 'Super Admin' } },
    });
    await prisma.statusHistory.create({
      data: { entityType: 'user', entityId: admin.id, fromStatus: null, toStatus: 'ACTIVE', changedBy: SYSTEM_USER_ID, changedByRole: 'SYSTEM' },
    });
    superAdminId = admin.id;
    console.log('  ✅ SuperAdmin');
  } else {
    superAdminId = existingAdmin.userId;
    console.log('  ⏭️  SuperAdmin exists');
  }

  // Guard: skip sample data if already seeded
  const existingMfg = await prisma.manufacturer.findFirst({ where: { companyName: 'AgriChem Industries' } });
  if (existingMfg) {
    console.log('\n  ⏭️  Sample data already exists. Skipping.\n🌱 Done.');
    return;
  }

  const pw = await hash(DEFAULT_PASSWORD);

  // ─── Helper ───────────────────────────────────────────────────────────────
  async function createUser(name: string, role: string, phone: string, email: string, status = 'ACTIVE') {
    const user = await prisma.user.create({
      data: { name, password: pw, role: role as any, status: status as any, createdBy: superAdminId },
    });
    await prisma.phone.create({ data: { userId: user.id, number: phone, isPrimary: true } });
    await prisma.email.create({ data: { userId: user.id, address: email, isPrimary: true } });
    await prisma.statusHistory.create({
      data: { entityType: 'user', entityId: user.id, fromStatus: null, toStatus: status, changedBy: superAdminId, changedByRole: 'SUPER_ADMIN' },
    });
    return user;
  }

  async function createDirectorUser(name: string, phone: string, email: string | null, status = 'ACTIVE') {
    const user = await prisma.user.create({
      data: { name, password: null, role: 'DIRECTOR', status: status as any, createdBy: superAdminId },
    });
    await prisma.phone.create({ data: { userId: user.id, number: phone, isPrimary: true } });
    if (email) await prisma.email.create({ data: { userId: user.id, address: email, isPrimary: true } });
    return user;
  }

  async function createAPUser(name: string, phone: string, email: string | null, status = 'ACTIVE') {
    const user = await prisma.user.create({
      data: { name, password: pw, role: 'AUTHORIZED_PERSON', status: status as any, createdBy: superAdminId },
    });
    await prisma.phone.create({ data: { userId: user.id, number: phone, isPrimary: true } });
    if (email) await prisma.email.create({ data: { userId: user.id, address: email, isPrimary: true } });
    return user;
  }

  console.log('\n── Creating Manufacturers ──');

  // ─── 3. Manufacturer 1: AgriChem Industries ───────────────────────────────
  const mfg1User = await createUser('Rajesh Kumar', 'MANUFACTURER', '9876500001', 'rajesh@agrichem.in');
  const mfg1 = await prisma.manufacturer.create({
    data: {
      userId: mfg1User.id, companyName: 'AgriChem Industries', companyType: 'PVT_LTD',
      licenseNumber: 'MFG-PB-2024-001', licenseValidUpto: new Date('2028-03-31'),
      gstNumber: '03AABCA1234B1Z5', companyPan: 'AABCA1234B',
      canAddEditProducts: true, canManageBatch: true, createdBy: superAdminId,
    },
  });
  await prisma.address.create({
    data: { entityType: 'manufacturer', entityId: mfg1.id, address1: '45 Industrial Area, Phase-II', address2: 'Near NH-7 Crossing', city: 'Ludhiana', state: 'Punjab', pincode: '141003', createdBy: superAdminId },
  });
  await prisma.bankDetails.create({
    data: { entityType: 'manufacturer', entityId: mfg1.id, accountName: 'AgriChem Industries Pvt Ltd', accountNumber: '50100012345678', ifscCode: 'HDFC0001234', bankName: 'HDFC Bank', createdBy: superAdminId },
  });
  // Directors
  const dir1 = await createDirectorUser('Suresh Sharma', '9876500010', 'suresh@agrichem.in');
  await prisma.director.create({ data: { manufacturerId: mfg1.id, userId: dir1.id, type: 'DIRECTOR', designation: 'Managing Director', aadhaarNumber: '234567890123', panNumber: 'BPSS1234A', createdBy: superAdminId } });
  const dir2 = await createDirectorUser('Anita Verma', '9876500011', 'anita@agrichem.in');
  await prisma.director.create({ data: { manufacturerId: mfg1.id, userId: dir2.id, type: 'DIRECTOR', designation: 'Finance Director', aadhaarNumber: '345678901234', panNumber: 'CPAV5678B', createdBy: superAdminId } });
  // Authorized Person
  const ap1 = await createAPUser('Vikram Singh', '9876500012', 'vikram@agrichem.in');
  await prisma.authorizedPerson.create({ data: { manufacturerId: mfg1.id, userId: ap1.id, aadhaarNumber: '456789012345', createdBy: superAdminId } });
  console.log('  ✅ AgriChem Industries (2 directors, 1 AP)');

  // ─── 4. Manufacturer 2: GreenShield Agro ─────────────────────────────────
  const mfg2User = await createUser('Priya Patel', 'MANUFACTURER', '9876500002', 'priya@greenshield.in');
  const mfg2 = await prisma.manufacturer.create({
    data: {
      userId: mfg2User.id, companyName: 'GreenShield Agro Pvt Ltd', companyType: 'PVT_LTD',
      licenseNumber: 'MFG-GJ-2024-045', licenseValidUpto: new Date('2027-12-31'),
      gstNumber: '24AABCG5678D1Z3', companyPan: 'AABCG5678D',
      canAddEditProducts: true, canManageBatch: true, createdBy: superAdminId,
    },
  });
  await prisma.address.create({
    data: { entityType: 'manufacturer', entityId: mfg2.id, address1: '12 GIDC Estate, Vatva', address2: '', city: 'Ahmedabad', state: 'Gujarat', pincode: '382440', createdBy: superAdminId },
  });
  await prisma.bankDetails.create({
    data: { entityType: 'manufacturer', entityId: mfg2.id, accountName: 'GreenShield Agro Pvt Ltd', accountNumber: '91020034567890', ifscCode: 'ICIC0002345', bankName: 'ICICI Bank', createdBy: superAdminId },
  });
  const dir3 = await createDirectorUser('Kiran Patel', '9876500020', 'kiran@greenshield.in');
  await prisma.director.create({ data: { manufacturerId: mfg2.id, userId: dir3.id, type: 'DIRECTOR', designation: 'CEO', createdBy: superAdminId } });
  const ap2 = await createAPUser('Rohit Mehta', '9876500021', 'rohit@greenshield.in');
  await prisma.authorizedPerson.create({ data: { manufacturerId: mfg2.id, userId: ap2.id, aadhaarNumber: '567890123456', createdBy: superAdminId } });
  console.log('  ✅ GreenShield Agro (1 director, 1 AP)');

  // ─── 5. Manufacturer 3: BioHarvest ───────────────────────────────────────
  const mfg3User = await createUser('Amit Agarwal', 'MANUFACTURER', '9876500003', 'amit@bioharvest.in', 'PENDING');
  const mfg3 = await prisma.manufacturer.create({
    data: {
      userId: mfg3User.id, companyName: 'BioHarvest Organics', companyType: 'PROPRIETORSHIP',
      licenseNumber: 'MFG-UP-2025-102', licenseValidUpto: new Date('2029-06-30'),
      gstNumber: '09AABCB9012F1Z7', companyPan: 'AABCB9012F',
      createdBy: superAdminId,
    },
  });
  await prisma.address.create({
    data: { entityType: 'manufacturer', entityId: mfg3.id, address1: '789 Agri Park, Sector 62', city: 'Noida', state: 'Uttar Pradesh', pincode: '201301', createdBy: superAdminId },
  });
  const dir4 = await createDirectorUser('Amit Agarwal Sr.', '9876500030', null, 'PENDING');
  await prisma.director.create({ data: { manufacturerId: mfg3.id, userId: dir4.id, type: 'PROPRIETOR', designation: 'Proprietor', createdBy: superAdminId } });
  console.log('  ✅ BioHarvest Organics (1 proprietor, PENDING)');

  console.log('\n── Creating Retailers ──');

  // ─── 6. Retailer 1: Kisan Seeds & Fertilizers ────────────────────────────
  const ret1User = await createUser('Harpreet Kaur', 'RETAILER', '9876500004', 'harpreet@kisanseeds.in');
  const ret1 = await prisma.retailer.create({
    data: { userId: ret1User.id, companyName: 'Kisan Seeds & Fertilizers', companyType: 'PROPRIETORSHIP', gstNumber: '03AABCK3456G1Z2', companyPan: 'AABCK3456G', createdBy: superAdminId },
  });
  await prisma.address.create({
    data: { entityType: 'retailer', retailerId: ret1.id, address1: 'Main Market, GT Road', city: 'Jalandhar', state: 'Punjab', pincode: '144001', createdBy: superAdminId },
  });
  await prisma.bankDetails.create({
    data: { entityType: 'retailer', retailerId: ret1.id, accountName: 'Harpreet Kaur', accountNumber: '30100056789012', ifscCode: 'SBIN0003456', bankName: 'SBI', createdBy: superAdminId },
  });
  await prisma.retailerLicense.create({ data: { retailerId: ret1.id, category: 'SEEDS', licenseNumber: 'RET-PB-SEEDS-001', validUptoDate: new Date('2027-03-31') } });
  await prisma.retailerLicense.create({ data: { retailerId: ret1.id, category: 'INSECTICIDE', licenseNumber: 'RET-PB-INS-001', validUptoDate: new Date('2027-03-31') } });
  await prisma.retailerLicense.create({ data: { retailerId: ret1.id, category: 'FERTILIZER', licenseNumber: 'RET-PB-FERT-001', validUptoDate: new Date('2027-03-31') } });
  const retDir1 = await createDirectorUser('Gurpreet Singh', '9876500040', 'gurpreet@kisanseeds.in');
  await prisma.director.create({ data: { retailerId: ret1.id, userId: retDir1.id, type: 'PROPRIETOR', designation: 'Proprietor', createdBy: superAdminId } });
  const retAp1 = await createAPUser('Mandeep Kaur', '9876500041', 'mandeep@kisanseeds.in');
  await prisma.authorizedPerson.create({ data: { retailerId: ret1.id, userId: retAp1.id, aadhaarNumber: '678901234567', createdBy: superAdminId } });
  console.log('  ✅ Kisan Seeds & Fertilizers (3 licenses, 1 director, 1 AP)');

  // ─── 7. Retailer 2: FarmFirst Store ──────────────────────────────────────
  const ret2User = await createUser('Deepak Joshi', 'RETAILER', '9876500005', 'deepak@farmfirst.in');
  const ret2 = await prisma.retailer.create({
    data: { userId: ret2User.id, companyName: 'FarmFirst Agro Store', companyType: 'PARTNERSHIP', gstNumber: '06AABCF7890H1Z4', companyPan: 'AABCF7890H', createdBy: superAdminId },
  });
  await prisma.address.create({
    data: { entityType: 'retailer', retailerId: ret2.id, address1: '23 Mandi Road, Karnal', city: 'Karnal', state: 'Haryana', pincode: '132001', createdBy: superAdminId },
  });
  await prisma.retailerLicense.create({ data: { retailerId: ret2.id, category: 'INSECTICIDE', licenseNumber: 'RET-HR-INS-010', validUptoDate: new Date('2026-12-31') } });
  const retDir2a = await createDirectorUser('Deepak Joshi Sr.', '9876500050', null);
  await prisma.director.create({ data: { retailerId: ret2.id, userId: retDir2a.id, type: 'PARTNER', designation: 'Senior Partner', createdBy: superAdminId } });
  const retDir2b = await createDirectorUser('Neha Joshi', '9876500051', 'neha@farmfirst.in');
  await prisma.director.create({ data: { retailerId: ret2.id, userId: retDir2b.id, type: 'PARTNER', designation: 'Partner', createdBy: superAdminId } });
  console.log('  ✅ FarmFirst Agro Store (1 license, 2 partners)');

  console.log('\n── Creating Distributors ──');

  // ─── 8. Distributor 1: State-level under Manufacturer 1 ──────────────────
  const dist1User = await createUser('Naveen Reddy', 'DISTRIBUTOR', '9876500006', 'naveen@agridist.in');
  const dist1 = await prisma.distributor.create({
    data: {
      userId: dist1User.id, distributorType: 'STATE_DISTRIBUTOR', companyName: 'AgriDist Punjab',
      companyType: 'PVT_LTD', gstNumber: '03AABCD1234K1Z8', companyPan: 'AABCD1234K',
      licenseNumber: 'DIST-PB-2024-001', licenseValidUpto: new Date('2028-03-31'),
      manufacturerId: mfg1.id, createdBy: superAdminId,
    },
  });
  await prisma.address.create({
    data: { entityType: 'distributor', distributorId: dist1.id, address1: '56 Warehouse Complex, Focal Point', city: 'Ludhiana', state: 'Punjab', pincode: '141010', createdBy: superAdminId },
  });
  await prisma.bankDetails.create({
    data: { entityType: 'distributor', distributorId: dist1.id, accountName: 'AgriDist Punjab Pvt Ltd', accountNumber: '60200078901234', ifscCode: 'PUNB0004567', bankName: 'PNB', createdBy: superAdminId },
  });
  await prisma.distributorLicense.create({ data: { distributorId: dist1.id, category: 'INSECTICIDE', licenseNumber: 'DL-PB-INS-001', validUptoDate: new Date('2028-03-31') } });
  await prisma.distributorLicense.create({ data: { distributorId: dist1.id, category: 'FERTILIZER', licenseNumber: 'DL-PB-FERT-001', validUptoDate: new Date('2028-03-31') } });
  const distDir1 = await createDirectorUser('Sunil Reddy', '9876500060', 'sunil@agridist.in');
  await prisma.director.create({ data: { distributorId: dist1.id, userId: distDir1.id, type: 'DIRECTOR', designation: 'Managing Director', createdBy: superAdminId } });
  const distAp1 = await createAPUser('Ajay Kumar', '9876500061', 'ajay@agridist.in');
  await prisma.authorizedPerson.create({ data: { distributorId: dist1.id, userId: distAp1.id, aadhaarNumber: '789012345678', createdBy: superAdminId } });
  console.log('  ✅ AgriDist Punjab — state dist under AgriChem (2 licenses, 1 dir, 1 AP)');

  // ─── 9. Distributor 2: Under Retailer 1 ─────────────────────────────────
  const dist2User = await createUser('Pooja Sharma', 'DISTRIBUTOR', '9876500007', 'pooja@kisandist.in');
  const dist2 = await prisma.distributor.create({
    data: {
      userId: dist2User.id, distributorType: 'UNDER_RETAILER', companyName: 'Kisan Distribution Hub',
      companyType: 'PROPRIETORSHIP', retailerId: ret1.id, createdBy: superAdminId,
    },
  });
  await prisma.address.create({
    data: { entityType: 'distributor', distributorId: dist2.id, address1: '99 Grain Market', city: 'Jalandhar', state: 'Punjab', pincode: '144002', createdBy: superAdminId },
  });
  console.log('  ✅ Kisan Distribution Hub — under Kisan Seeds retailer');

  // ─── 10. Distributor 3: Under Manufacturer 2 ─────────────────────────────
  const dist3User = await createUser('Manoj Tiwari', 'DISTRIBUTOR', '9876500008', 'manoj@greendist.in', 'PENDING');
  const dist3 = await prisma.distributor.create({
    data: {
      userId: dist3User.id, distributorType: 'UNDER_MANUFACTURER', companyName: 'GreenDist Haryana',
      companyType: 'PARTNERSHIP', manufacturerId: mfg2.id,
      gstNumber: '06AABCG9999J1Z1', createdBy: superAdminId,
    },
  });
  await prisma.address.create({
    data: { entityType: 'distributor', distributorId: dist3.id, address1: '15 HSIIDC, Rai Industrial Area', city: 'Sonipat', state: 'Haryana', pincode: '131029', createdBy: superAdminId },
  });
  const distDir3a = await createDirectorUser('Manoj Tiwari Sr.', '9876500080', null, 'PENDING');
  await prisma.director.create({ data: { distributorId: dist3.id, userId: distDir3a.id, type: 'PARTNER', designation: 'Senior Partner', createdBy: superAdminId } });
  const distDir3b = await createDirectorUser('Sanjay Tiwari', '9876500081', null, 'PENDING');
  await prisma.director.create({ data: { distributorId: dist3.id, userId: distDir3b.id, type: 'PARTNER', designation: 'Partner', createdBy: superAdminId } });
  console.log('  ✅ GreenDist Haryana — under GreenShield (PENDING, 2 partners)');

  console.log('\n── Creating Products ──');

  // ─── Products for Manufacturer 1 (AgriChem) ──────────────────────────────
  const prod1 = await prisma.product.create({
    data: {
      manufacturerId: mfg1.id, manufacturedById: mfg1.id, productType: 'PESTICIDE',
      productName: 'AgriKill 505', technicalName: 'Chlorpyrifos 50% + Cypermethrin 5% EC',
      description: 'Broad-spectrum insecticide for controlling bollworm, aphids, and whitefly on cotton and vegetables.',
      gstPercentage: 18.00, hsnCode: '38089110', recommendedDose: '2 ml per litre', doseUnit: 'PER_ACRE',
      cirNumber: 'CIR-2024-PB-001', status: 'ACTIVE', createdBy: superAdminId,
    },
  });
  await prisma.productSize.create({ data: { productId: prod1.id, quantity: '250', unit: 'ML', bottlesPerCase: 40 } });
  await prisma.productSize.create({ data: { productId: prod1.id, quantity: '500', unit: 'ML', bottlesPerCase: 20 } });
  await prisma.productSize.create({ data: { productId: prod1.id, quantity: '1', unit: 'L', bottlesPerCase: 12 } });
  await prisma.productCrop.create({ data: { productId: prod1.id, cropName: 'Cotton' } });
  await prisma.productCrop.create({ data: { productId: prod1.id, cropName: 'Tomato' } });
  await prisma.productCrop.create({ data: { productId: prod1.id, cropName: 'Brinjal' } });
  console.log('  ✅ AgriKill 505 (3 sizes, 3 crops)');

  const prod2 = await prisma.product.create({
    data: {
      manufacturerId: mfg1.id, manufacturedById: mfg1.id, productType: 'FUNGICIDE',
      productName: 'FungiGuard Pro', technicalName: 'Mancozeb 75% WP',
      description: 'Contact fungicide for prevention of early blight, late blight, and downy mildew.',
      gstPercentage: 18.00, hsnCode: '38089290', recommendedDose: '2.5 g per litre', doseUnit: 'PER_ACRE',
      status: 'ACTIVE', createdBy: superAdminId,
    },
  });
  await prisma.productSize.create({ data: { productId: prod2.id, quantity: '500', unit: 'G', bottlesPerCase: 20 } });
  await prisma.productSize.create({ data: { productId: prod2.id, quantity: '1', unit: 'KG', bottlesPerCase: 10 } });
  await prisma.productCrop.create({ data: { productId: prod2.id, cropName: 'Potato' } });
  await prisma.productCrop.create({ data: { productId: prod2.id, cropName: 'Wheat' } });
  console.log('  ✅ FungiGuard Pro (2 sizes, 2 crops)');

  const prod3 = await prisma.product.create({
    data: {
      manufacturerId: mfg1.id, manufacturedById: mfg1.id, marketedById: mfg2.id, productType: 'NPK',
      productName: 'NutriGrow 19-19-19', technicalName: 'NPK 19:19:19 Water Soluble',
      description: 'Balanced water-soluble fertilizer for all stages of crop growth.',
      gstPercentage: 5.00, hsnCode: '31052000', recommendedDose: '5 kg per acre', doseUnit: 'PER_ACRE',
      status: 'ACTIVE', createdBy: superAdminId,
    },
  });
  await prisma.productSize.create({ data: { productId: prod3.id, quantity: '1', unit: 'KG', bottlesPerCase: 25 } });
  await prisma.productSize.create({ data: { productId: prod3.id, quantity: '5', unit: 'KG', bottlesPerCase: 5 } });
  await prisma.productSize.create({ data: { productId: prod3.id, quantity: '25', unit: 'KG', bottlesPerCase: 1 } });
  await prisma.productCrop.create({ data: { productId: prod3.id, cropName: 'Rice' } });
  await prisma.productCrop.create({ data: { productId: prod3.id, cropName: 'Wheat' } });
  await prisma.productCrop.create({ data: { productId: prod3.id, cropName: 'Cotton' } });
  await prisma.productCrop.create({ data: { productId: prod3.id, cropName: 'Sugarcane' } });
  console.log('  ✅ NutriGrow 19-19-19 (3 sizes, 4 crops, marketed by GreenShield)');

  // ─── Products for Manufacturer 2 (GreenShield) ───────────────────────────
  const prod4 = await prisma.product.create({
    data: {
      manufacturerId: mfg2.id, manufacturedById: mfg2.id, productType: 'BIO_PESTICIDE',
      productName: 'BioGuard Neem', technicalName: 'Azadirachtin 0.03% EC',
      description: 'Neem-based bio pesticide effective against sucking pests and leaf miners.',
      gstPercentage: 12.00, hsnCode: '38089910', recommendedDose: '3 ml per litre', doseUnit: 'PER_HECTARE',
      status: 'ACTIVE', createdBy: superAdminId,
    },
  });
  await prisma.productSize.create({ data: { productId: prod4.id, quantity: '250', unit: 'ML', bottlesPerCase: 40 } });
  await prisma.productSize.create({ data: { productId: prod4.id, quantity: '1', unit: 'L', bottlesPerCase: 12 } });
  await prisma.productCrop.create({ data: { productId: prod4.id, cropName: 'Paddy' } });
  await prisma.productCrop.create({ data: { productId: prod4.id, cropName: 'Vegetables', isCustom: true } });
  console.log('  ✅ BioGuard Neem (2 sizes, 2 crops)');

  const prod5 = await prisma.product.create({
    data: {
      manufacturerId: mfg2.id, manufacturedById: mfg2.id, productType: 'PGR',
      productName: 'GrowMax Plus', technicalName: 'Gibberellic Acid 0.001% L',
      description: 'Plant growth regulator to increase fruit size and yield in grapes and vegetables.',
      gstPercentage: 18.00, hsnCode: '38089930', recommendedDose: '1 ml per litre', doseUnit: 'PER_ACRE',
      status: 'PENDING', createdBy: superAdminId,
    },
  });
  await prisma.productSize.create({ data: { productId: prod5.id, quantity: '100', unit: 'ML', bottlesPerCase: 50 } });
  await prisma.productCrop.create({ data: { productId: prod5.id, cropName: 'Grapes' } });
  console.log('  ✅ GrowMax Plus (PENDING, 1 size, 1 crop)');

  // ─── Product for Manufacturer 3 (BioHarvest, draft) ──────────────────────
  const prod6 = await prisma.product.create({
    data: {
      manufacturerId: mfg3.id, manufacturedById: mfg3.id, productType: 'BIO_FERTILIZER',
      productName: 'RhizoBoost', technicalName: 'Rhizobium spp. CFU 1x10^8/ml',
      description: 'Bio-fertilizer for nitrogen fixation in leguminous crops.',
      gstPercentage: 5.00, hsnCode: '31010099', recommendedDose: '200 ml per acre', doseUnit: 'PER_ACRE',
      status: 'DRAFT', isDraft: true, createdBy: superAdminId,
    },
  });
  await prisma.productSize.create({ data: { productId: prod6.id, quantity: '500', unit: 'ML', bottlesPerCase: 20 } });
  await prisma.productCrop.create({ data: { productId: prod6.id, cropName: 'Soybean' } });
  await prisma.productCrop.create({ data: { productId: prod6.id, cropName: 'Groundnut' } });
  console.log('  ✅ RhizoBoost (DRAFT, 1 size, 2 crops)');

  console.log('\n── Creating Inventories ──');

  // ─── Inventories for Manufacturer 1 ──────────────────────────────────────
  const inv1 = await prisma.inventory.create({
    data: {
      ownerType: 'manufacturer', manufacturerId: mfg1.id,
      name: 'AgriChem Main Warehouse', type: 'WAREHOUSE',
      description: 'Primary warehouse for finished goods',
      address1: '45 Industrial Area, Phase-II', city: 'Ludhiana', state: 'Punjab', pincode: '141003',
      contactName: 'Rajesh Kumar', contactPhone: '9876500001', createdBy: superAdminId,
    },
  });
  await prisma.inventoryProduct.create({
    data: { inventoryId: inv1.id, productId: prod1.id, stock: 5000, price: 320.00, averageCost: 280.00, sourceType: 'MANUFACTURER', batchNumber: 'AK505-2026-001', mfgDate: new Date('2026-01-15'), expiryDate: new Date('2028-01-14'), unit: 'BOTTLE', lowStockThreshold: 500, createdBy: superAdminId },
  });
  await prisma.inventoryProduct.create({
    data: { inventoryId: inv1.id, productId: prod2.id, stock: 3000, price: 450.00, averageCost: 390.00, sourceType: 'MANUFACTURER', batchNumber: 'FGP-2026-001', mfgDate: new Date('2026-02-01'), expiryDate: new Date('2028-01-31'), unit: 'PACK', lowStockThreshold: 300, createdBy: superAdminId },
  });
  await prisma.inventoryProduct.create({
    data: { inventoryId: inv1.id, productId: prod3.id, stock: 10000, price: 180.00, averageCost: 150.00, sourceType: 'MANUFACTURER', batchNumber: 'NG19-2026-001', mfgDate: new Date('2026-01-01'), expiryDate: new Date('2028-12-31'), unit: 'BAG', lowStockThreshold: 1000, createdBy: superAdminId },
  });
  console.log('  ✅ AgriChem Warehouse (3 products stocked)');

  const inv2 = await prisma.inventory.create({
    data: {
      ownerType: 'manufacturer', manufacturerId: mfg1.id,
      name: 'AgriChem Godown Bathinda', type: 'GODOWN',
      description: 'Regional godown for Punjab south',
      address1: '12 Agri Market Complex', city: 'Bathinda', state: 'Punjab', pincode: '151001',
      contactName: 'Suresh Sharma', contactPhone: '9876500010', createdBy: superAdminId,
    },
  });
  await prisma.inventoryProduct.create({
    data: { inventoryId: inv2.id, productId: prod1.id, stock: 1200, price: 320.00, sourceType: 'MANUFACTURER', batchNumber: 'AK505-2026-002', mfgDate: new Date('2026-02-10'), expiryDate: new Date('2028-02-09'), unit: 'BOTTLE', lowStockThreshold: 200, createdBy: superAdminId },
  });
  console.log('  ✅ AgriChem Godown Bathinda (1 product)');

  // ─── Inventory for Distributor 1 ─────────────────────────────────────────
  const inv3 = await prisma.inventory.create({
    data: {
      ownerType: 'distributor', distributorId: dist1.id,
      name: 'AgriDist Distribution Center', type: 'DISTRIBUTION_CENTER',
      description: 'Main distribution hub for Punjab region',
      address1: '56 Warehouse Complex, Focal Point', city: 'Ludhiana', state: 'Punjab', pincode: '141010',
      contactName: 'Naveen Reddy', contactPhone: '9876500006', createdBy: superAdminId,
    },
  });
  await prisma.inventoryProduct.create({
    data: { inventoryId: inv3.id, productId: prod1.id, stock: 800, price: 350.00, averageCost: 320.00, sourceType: 'MANUFACTURER', batchNumber: 'AK505-2026-001', mfgDate: new Date('2026-01-15'), expiryDate: new Date('2028-01-14'), purchasedFrom: 'AgriChem Industries', unit: 'BOTTLE', lowStockThreshold: 100, createdBy: superAdminId },
  });
  await prisma.inventoryProduct.create({
    data: { inventoryId: inv3.id, productId: prod3.id, stock: 2000, price: 200.00, averageCost: 180.00, sourceType: 'MANUFACTURER', batchNumber: 'NG19-2026-001', mfgDate: new Date('2026-01-01'), expiryDate: new Date('2028-12-31'), purchasedFrom: 'AgriChem Industries', unit: 'BAG', lowStockThreshold: 200, createdBy: superAdminId },
  });
  console.log('  ✅ AgriDist Distribution Center (2 products)');

  // ─── Inventory for Retailer 1 ────────────────────────────────────────────
  const inv4 = await prisma.inventory.create({
    data: {
      ownerType: 'retailer', retailerId: ret1.id,
      name: 'Kisan Seeds Main Shop', type: 'SHOP',
      description: 'Retail shop at GT Road',
      address1: 'Main Market, GT Road', city: 'Jalandhar', state: 'Punjab', pincode: '144001',
      contactName: 'Harpreet Kaur', contactPhone: '9876500004', createdBy: superAdminId,
    },
  });
  await prisma.inventoryProduct.create({
    data: { inventoryId: inv4.id, productId: prod1.id, stock: 150, price: 380.00, averageCost: 350.00, sourceType: 'OTHER', batchNumber: 'AK505-2026-001', mfgDate: new Date('2026-01-15'), expiryDate: new Date('2028-01-14'), purchasedFrom: 'AgriDist Punjab', unit: 'BOTTLE', lowStockThreshold: 20, createdBy: superAdminId },
  });
  await prisma.inventoryProduct.create({
    data: { inventoryId: inv4.id, productId: prod4.id, stock: 60, price: 290.00, sourceType: 'OTHER', batchNumber: 'BGN-2026-001', mfgDate: new Date('2026-01-20'), expiryDate: new Date('2027-07-19'), purchasedFrom: 'GreenShield Agro', unit: 'BOTTLE', lowStockThreshold: 10, createdBy: superAdminId },
  });
  await prisma.inventoryProduct.create({
    data: { inventoryId: inv4.id, productId: prod3.id, stock: 300, price: 210.00, averageCost: 200.00, sourceType: 'OTHER', batchNumber: 'NG19-2026-001', purchasedFrom: 'AgriDist Punjab', unit: 'BAG', lowStockThreshold: 30, createdBy: superAdminId },
  });
  console.log('  ✅ Kisan Seeds Main Shop (3 products)');

  // ─── Inventory for Manufacturer 2 ────────────────────────────────────────
  const inv5 = await prisma.inventory.create({
    data: {
      ownerType: 'manufacturer', manufacturerId: mfg2.id,
      name: 'GreenShield Factory Store', type: 'WAREHOUSE',
      description: 'Factory warehouse in Vatva GIDC',
      address1: '12 GIDC Estate, Vatva', city: 'Ahmedabad', state: 'Gujarat', pincode: '382440',
      contactName: 'Priya Patel', contactPhone: '9876500002', createdBy: superAdminId,
    },
  });
  await prisma.inventoryProduct.create({
    data: { inventoryId: inv5.id, productId: prod4.id, stock: 8000, price: 250.00, averageCost: 200.00, sourceType: 'MANUFACTURER', batchNumber: 'BGN-2026-001', mfgDate: new Date('2026-01-20'), expiryDate: new Date('2027-07-19'), unit: 'BOTTLE', lowStockThreshold: 1000, createdBy: superAdminId },
  });
  await prisma.inventoryProduct.create({
    data: { inventoryId: inv5.id, productId: prod5.id, stock: 2000, price: 180.00, sourceType: 'MANUFACTURER', batchNumber: 'GMP-2026-001', mfgDate: new Date('2026-02-15'), expiryDate: new Date('2028-02-14'), unit: 'BOTTLE', lowStockThreshold: 200, createdBy: superAdminId },
  });
  console.log('  ✅ GreenShield Factory Store (2 products)');

  // ─── Summary ──────────────────────────────────────────────────────────────
  const counts = {
    users: await prisma.user.count(),
    manufacturers: await prisma.manufacturer.count(),
    retailers: await prisma.retailer.count(),
    distributors: await prisma.distributor.count(),
    directors: await prisma.director.count(),
    authorizedPersons: await prisma.authorizedPerson.count(),
    products: await prisma.product.count(),
    inventories: await prisma.inventory.count(),
    inventoryProducts: await prisma.inventoryProduct.count(),
  };
  console.log('\n📊 Final counts:');
  Object.entries(counts).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  console.log('\n🌱 Seeding complete.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
