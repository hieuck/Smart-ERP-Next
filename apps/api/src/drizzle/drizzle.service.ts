import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { db } from '@smart-erp/database';
import * as schema from '@smart-erp/database/schema';
import { sql } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';

export type DrizzleDB = typeof db;

@Injectable()
export class DrizzleService implements OnModuleInit {
  private readonly logger = new Logger(DrizzleService.name);
  readonly db: DrizzleDB = db;

  async onModuleInit() {
    this.logger.log('Checking database connection & checking for seed requirements...');
    try {
      const [tenantCountResult] = await this.db.select({ count: sql<number>`count(*)` }).from(schema.tenants);
      
      if (tenantCountResult && Number(tenantCountResult.count) === 0) {
        this.logger.log('🌱 Database is empty! Starting auto-seed process...');
        await this.runAutoSeed();
      } else {
        this.logger.log('Database already populated. Skipping seed.');
      }
    } catch (e) {
      this.logger.error('Failed to check or seed database: ' + (e as any).message);
    }
  }

  private async runAutoSeed() {
    try {
      const randomString = (length = 6) => Math.random().toString(36).substring(2, 2 + length).toUpperCase();
      const randomNumber = (min = 10, max = 1000) => Math.floor(Math.random() * (max - min + 1)) + min;
      const randomElement = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
      
      const firstNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng'];
      const lastNames = ['Anh', 'Bình', 'Châu', 'Dũng', 'Em', 'Phong', 'Giang', 'Hải', 'Linh', 'Minh'];
      const randomName = () => `${randomElement(firstNames)} ${randomElement(lastNames)}`;
      const randomCompany = () => `${randomElement(['Công ty TNHH', 'Tập đoàn', 'Cửa hàng'])} ${randomName()}`;

      // 1. Tenant
      const [tenant] = await this.db.insert(schema.tenants).values({
        name: 'Smart ERP Corp',
        slug: 'smart-erp-corp-' + randomString().slice(0, 4).toLowerCase(),
      }).returning();
      const tenantId = tenant.id;

      // 2. Users
      const usersToInsert = [];
      const adminHash = await bcrypt.hash('admin123', 10);
      const demoHash = await bcrypt.hash('demo123456', 10);

      // Add E2E Admin
      usersToInsert.push({
        tenantId,
        email: 'admin@smarterp.vn',
        name: 'E2E Admin User',
        role: 'admin',
        passwordHash: adminHash,
      });

      // Add Demo Admin
      usersToInsert.push({
        tenantId,
        email: 'admin@demo.smarterp.vn',
        name: 'Demo Admin User',
        role: 'admin',
        passwordHash: demoHash,
      });

      // Add original admin
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
          email: `${randomString(5).toLowerCase()}@smarterp.vn`,
          name: randomName(),
          role: i === 0 ? 'manager' : 'user',
          passwordHash: adminHash,
        });
      }
      const users = await this.db.insert(schema.users).values(usersToInsert).returning();
      const adminUser = users[0];

      // 3. Warehouses
      // @ts-ignore
      const [warehouse1, warehouse2] = await this.db.insert(schema.warehouses).values([
        { tenantId, code: 'WH-' + randomString(4), name: 'Kho Trung Tâm Hà Nội', location: 'Hà Nội' },
        { tenantId, code: 'WH-' + randomString(4), name: 'Kho Miền Nam', location: 'Hồ Chí Minh' },
      ]).returning();

      // 4. Products
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
      const products = await this.db.insert(schema.products).values(productsToInsert).returning();

      // 5. Customers
      const customersToInsert = [];
      for (let i = 0; i < 50; i++) {
        customersToInsert.push({
          tenantId,
          code: `CUS-${randomString(6)}`,
          name: randomCompany(),
          email: `${randomString(5).toLowerCase()}@customer.com`,
          phone: '09' + randomNumber(10000000, 99999999).toString(),
          type: randomElement(['individual', 'company']),
        });
      }
      const customers = await this.db.insert(schema.customers).values(customersToInsert).returning();

      // 6. Orders
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
      await this.db.insert(schema.orders).values(ordersToInsert).returning();

      this.logger.log('✅ Auto-seed completed! System is fully populated with real-looking data.');
    } catch (e) {
      this.logger.error('Error during auto-seed: ' + (e as any).message);
    }
  }
}
