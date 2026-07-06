import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { randomBytes, randomInt } from 'crypto';
import * as schema from './schema';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/smart_erp',
});

const db = drizzle(pool, { schema });

// Helper functions for fake data (use crypto instead of Math.random)
const ALPHANUMERIC = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const randomString = (length = 6) => {
  const bytes = randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += ALPHANUMERIC[bytes[i] % ALPHANUMERIC.length];
  }
  return result.toUpperCase();
};
const randomNumber = (min = 10, max = 1000) => randomInt(min, max + 1);
const randomElement = <T>(arr: T[]): T => arr[randomInt(0, arr.length)];
const firstNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng'];
const lastNames = ['Anh', 'Bình', 'Châu', 'Dũng', 'Em', 'Phong', 'Giang', 'Hải', 'Linh', 'Minh'];
const randomName = () => `${randomElement(firstNames)} ${randomElement(lastNames)}`;
const randomCompany = () => `${randomElement(['Công ty TNHH', 'Tập đoàn', 'Cửa hàng'])} ${randomName()}`;

const usedEmails = new Set<string>();
const randomEmail = () => {
  let email: string;
  do {
    email = `${randomString(5).toLowerCase()}@example.com`;
  } while (usedEmails.has(email));
  usedEmails.add(email);
  return email;
};

async function seed() {
  console.log('🌱 Starting Database Seeding (Native JS Version)...');

  try {
    // 1. Seed Tenant
    console.log('Seeding Tenants...');
    const [tenant] = await db.insert(schema.tenants).values({
      name: 'Smart ERP Corp',
    slug: 'smart-erp-corp-' + randomString().slice(0, 4).toLowerCase(),
    }).returning();
    const tenantId = tenant.id;

    // 2. Seed Users
    console.log('Seeding Users...');
    const { generateAdminPassword, logSeedAdminCredentials } = require('./seed-admin-passwords');

    const adminAccounts = [
      { email: 'admin@smarterp.vn', name: 'E2E Admin User', role: 'admin' },
      { email: 'admin@demo.smarterp.vn', name: 'Demo Admin User', role: 'admin' },
      { email: 'admin@demo.vn', name: 'Original Admin User', role: 'admin' },
    ];

    const usersToInsert = [];
    const adminCredentials: { email: string; password: string; role: string }[] = [];

    for (const account of adminAccounts) {
      const { password, hash } = generateAdminPassword();
      usersToInsert.push({
        tenantId,
        email: account.email,
        name: account.name,
        role: account.role,
        passwordHash: hash,
      });
      adminCredentials.push({ email: account.email, password, role: account.role });
    }

    for (let i = 0; i < 3; i++) {
      const { password, hash } = generateAdminPassword();
      const role = i === 0 ? 'manager' : 'user';
      const email = randomEmail();
      usersToInsert.push({
        tenantId,
        email,
        name: randomName(),
        role,
        passwordHash: hash,
      });
      // Only admin/manager accounts are useful to log as "seed admin credentials".
      // Regular user accounts are not privileged and should not be printed.
      if (role === 'manager') {
        adminCredentials.push({ email, password, role });
      }
    }
    const users = await db.insert(schema.users).values(usersToInsert).returning();
    logSeedAdminCredentials(adminCredentials);
    const adminUser = users[0];

    // 3. Seed Warehouses
    console.log('Seeding Warehouses...');
    const [warehouse1, warehouse2] = await db.insert(schema.warehouses).values([
      { tenantId, code: 'WH-' + randomString(4), name: 'Kho Trung Tâm Hà Nội', location: 'Hà Nội' },
      { tenantId, code: 'WH-' + randomString(4), name: 'Kho Miền Nam', location: 'Hồ Chí Minh' },
    ]).returning();

    // 4. Seed Products
    console.log('Seeding Products...');
    const productsToInsert = [];
    const categories = ['Electronics', 'Furniture', 'Office Supplies', 'Clothing'];
    
    for (let i = 0; i < 50; i++) {
      productsToInsert.push({
        tenantId,
        name: `Sản phẩm ${randomString(4)}`,
        sku: `SKU-${randomString(6)}`,
        category: randomElement(categories),
      price: randomNumber().toString(),
        cost: randomNumber(5, 500).toString(),
        stock: randomNumber(0, 1000),
      });
    }
    const products = await db.insert(schema.products).values(productsToInsert).returning();

    // 5. Seed Customers
    console.log('Seeding Customers...');
    const customersToInsert = [];
    for (let i = 0; i < 50; i++) {
      customersToInsert.push({
        tenantId,
        code: `CUS-${randomString(6)}`,
        name: randomCompany(),
        email: randomEmail(),
        phone: '09' + randomNumber(10000000, 99999999).toString(),
        type: randomElement(['individual', 'company']),
      });
    }
    const customers = await db.insert(schema.customers).values(customersToInsert).returning();

    // 6. Seed Orders
    console.log('Seeding Orders...');
    const ordersToInsert = [];
    for (let i = 0; i < 100; i++) {
      const customer = randomElement(customers);
      const warehouse = randomElement([warehouse1, warehouse2]);
      
      ordersToInsert.push({
        tenantId,
        code: `ORD-${randomString(8)}`,
        customerId: customer.id,
        warehouseId: warehouse.id,
        assignedTo: adminUser.id,
        status: randomElement(['draft', 'confirmed', 'processing', 'shipped', 'delivered']),
        subtotal: randomNumber(100, 5000).toString(),
        total: randomNumber(100, 5000).toString(),
        paymentStatus: randomElement(['unpaid', 'partial', 'paid']),
      });
    }
    await db.insert(schema.orders).values(ordersToInsert).returning();

    console.log('✅ Database Seeding Completed Successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
  } finally {
    await pool.end();
  }
}

seed();
