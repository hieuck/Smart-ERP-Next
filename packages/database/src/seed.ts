import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/smart_erp',
});

const db = drizzle(pool, { schema });

// Helper functions for fake data
const randomString = (length = 6) => Math.random().toString(36).substring(2, 2 + length).toUpperCase();
const randomNumber = (min = 10, max = 1000) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomElement = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
const firstNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng'];
const lastNames = ['Anh', 'Bình', 'Châu', 'Dũng', 'Em', 'Phong', 'Giang', 'Hải', 'Linh', 'Minh'];
const randomName = () => `${randomElement(firstNames)} ${randomElement(lastNames)}`;
const randomCompany = () => `${randomElement(['Công ty TNHH', 'Tập đoàn', 'Cửa hàng'])} ${randomName()}`;
const randomEmail = () => `${randomString(5).toLowerCase()}@example.com`;

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
    const bcrypt = require('bcryptjs');
    const adminHash = bcrypt.hashSync('admin123', 10);
    const demoHash = bcrypt.hashSync('demo123456', 10);

    const usersToInsert = [];
    
    // Seed admin@smarterp.vn for E2E
    usersToInsert.push({
      tenantId,
      email: 'admin@smarterp.vn',
      name: 'E2E Admin User',
      role: 'admin',
      passwordHash: adminHash,
    });

    // Seed admin@demo.smarterp.vn for UI Demo
    usersToInsert.push({
      tenantId,
      email: 'admin@demo.smarterp.vn',
      name: 'Demo Admin User',
      role: 'admin',
      passwordHash: demoHash,
    });

    // Seed admin@demo.vn for original default
    usersToInsert.push({
      tenantId,
      email: 'admin@demo.vn',
      name: 'Original Admin User',
      role: 'admin',
      passwordHash: adminHash,
    });

    for (let i = 0; i < 3; i++) {
      usersToInsert.push({
        tenantId,
        email: randomEmail(),
        name: randomName(),
        role: i === 0 ? 'manager' : 'user',
        passwordHash: adminHash,
      });
    }
    const users = await db.insert(schema.users).values(usersToInsert).returning();
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
