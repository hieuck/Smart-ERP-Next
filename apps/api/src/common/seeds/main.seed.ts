import { db } from '@smart-erp/database';
import { tenants, users, products, warehouses } from '@smart-erp/database/schema';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function exec(rawSql: string) {
  const client = await pool.connect();
  try {
    return await client.query(rawSql);
  } finally {
    client.release();
  }
}

async function main() {
  console.log('🌱 Starting Golden Seed...');

  // 1. Create Tenant
  const [tenant] = await db.insert(tenants).values({
    name: 'Smart ERP Next Demo',
    slug: 'demo-erp',
  }).returning();
  console.log('  ✅ Tenant created');

  // 2. Create Users
  const hash = (pw: string) => {
    // Use bcrypt via Node crypto for speed
    const bcrypt = require('bcryptjs');
    return bcrypt.hash(pw, 10);
  };

  const adminHash = await hash('admin123');
  const [admin] = await db.insert(users).values({
    tenantId: tenant.id,
    email: 'admin@demo.vn',
    name: 'Quản trị viên',
    passwordHash: adminHash,
    role: 'admin',
  }).returning();

  // Seed admin@smarterp.vn for E2E Playwright tests
  const e2eAdminHash = await hash('admin123');
  await db.insert(users).values({
    tenantId: tenant.id,
    email: 'admin@smarterp.vn',
    name: 'E2E Admin User',
    passwordHash: e2eAdminHash,
    role: 'admin',
  });

  // Seed admin@demo.smarterp.vn for Web UI autofill demo button
  const demoAdminHash = await hash('demo123456');
  await db.insert(users).values({
    tenantId: tenant.id,
    email: 'admin@demo.smarterp.vn',
    name: 'Demo Admin User',
    passwordHash: demoAdminHash,
    role: 'admin',
  });

  const mgrHash = await hash('manager123');
  const [manager] = await db.insert(users).values({
    tenantId: tenant.id,
    email: 'manager@demo.vn',
    name: 'Nguyễn Văn Quản Lý',
    passwordHash: mgrHash,
    role: 'manager',
  }).returning();

  const staffHash = await hash('staff123');
  const [staff] = await db.insert(users).values({
    tenantId: tenant.id,
    email: 'staff@demo.vn',
    name: 'Trần Thị Nhân Viên',
    passwordHash: staffHash,
    role: 'user',
  }).returning();
  console.log('  ✅ Users created (admin, e2e admin, demo admin, manager, staff)');

  // 3. Create Warehouses
  const [wh1] = await db.insert(warehouses).values({
    tenantId: tenant.id,
    name: 'Kho Tổng Hà Nội',
    code: 'WH-HN-01',
    address: 'Cầu Giấy, Hà Nội',
    isDefault: true,
  }).returning();

  await db.insert(warehouses).values({
    tenantId: tenant.id,
    name: 'Kho TP. Hồ Chí Minh',
    code: 'WH-HCM-01',
    address: 'Quận 1, TP. Hồ Chí Minh',
  });
  console.log('  ✅ Warehouses created');

  // 4. Create Products (using Drizzle - schema matches DB now)
  const productData = [
    {
      tenantId: tenant.id, name: 'iPhone 15 Pro Max 256GB', sku: 'IP15-PM-256',
      description: 'Điện thoại Apple iPhone 15 Pro Max, 256GB bộ nhớ',
      category: 'Điện tử', price: '32000000', cost: '28000000',
      stock: 150, minStock: 20, reorderQuantity: 30, leadTimeDays: 14, safetyStock: 10,
    },
    {
      tenantId: tenant.id, name: 'MacBook Pro M3 14 inch', sku: 'MBP-M3-14',
      description: 'Laptop Apple MacBook Pro M3, 14 inch, 16GB RAM',
      category: 'Điện tử', price: '45000000', cost: '40000000',
      stock: 80, minStock: 10, reorderQuantity: 15, leadTimeDays: 21, safetyStock: 5,
    },
    {
      tenantId: tenant.id, name: 'AirPods Pro 2', sku: 'APP-PRO-2',
      description: 'Tai nghe Apple AirPods Pro thế hệ 2',
      category: 'Phụ kiện', price: '5990000', cost: '4500000',
      stock: 300, minStock: 50, reorderQuantity: 40, leadTimeDays: 7, safetyStock: 25,
    },
    {
      tenantId: tenant.id, name: 'Magic Keyboard', sku: 'MK-BLU-TCH',
      description: 'Bàn phím Apple Magic Keyboard có Touch ID',
      category: 'Phụ kiện', price: '3500000', cost: '2800000',
      stock: 200, minStock: 30, reorderQuantity: 25, leadTimeDays: 10, safetyStock: 15,
    },
    {
      tenantId: tenant.id, name: 'Máy in HP LaserJet Pro', sku: 'HP-LJ-P404',
      description: 'Máy in laser đen trắng HP LaserJet Pro 404dn',
      category: 'Thiết bị văn phòng', price: '8500000', cost: '7200000',
      stock: 45, minStock: 5, reorderQuantity: 8, leadTimeDays: 14, safetyStock: 3,
    },
    {
      tenantId: tenant.id, name: 'Màn hình Dell 27 inch 4K', sku: 'DELL-U2723QE',
      description: 'Màn hình Dell UltraSharp 27 inch, độ phân giải 4K',
      category: 'Điện tử', price: '12500000', cost: '10500000',
      stock: 60, minStock: 8, reorderQuantity: 10, leadTimeDays: 14, safetyStock: 5,
    },
  ];
  await db.insert(products).values(productData);
  console.log(`  ✅ ${productData.length} products created`);

  // 5. Create Customers (using raw SQL to match DB columns)
  await exec(`
    INSERT INTO customers (id, tenant_id, code, name, email, phone, address, tax_code, contact_person, customer_group, is_active)
    VALUES
      (gen_random_uuid(), '${tenant.id}', 'CUS-001', 'Công ty TNHH ABC', 'contact@abc.com.vn', '024-3888-0001', 'Ba Đình, Hà Nội', '0101234567', 'Ông A', 'VIP', true),
      (gen_random_uuid(), '${tenant.id}', 'CUS-002', 'Công ty Cổ phần XYZ', 'info@xyz.vn', '028-3999-0002', 'Quận 3, TP.HCM', '0309876543', 'Bà B', 'Regular', true),
      (gen_random_uuid(), '${tenant.id}', 'CUS-003', 'Lê Văn Minh', 'minh.lv@gmail.com', '0912-345-678', 'Đống Đa, Hà Nội', NULL, NULL, 'Regular', true),
      (gen_random_uuid(), '${tenant.id}', 'CUS-004', 'Nguyễn Thị Hương', 'huong.nt@outlook.com', '0987-654-321', 'Hải Châu, Đà Nẵng', NULL, NULL, 'New', true)
  `);
  console.log('  ✅ 4 customers created');

  // 6. Create Suppliers
  await exec(`
    INSERT INTO suppliers (id, tenant_id, code, name, email, phone, address, tax_code, contact_person, payment_term_days, is_active)
    VALUES
      (gen_random_uuid(), '${tenant.id}', 'SUP-001', 'Apple Việt Nam', 'supplier@apple.com.vn', '024-3777-0001', 'Hoàn Kiếm, Hà Nội', '0101234567', 'Mr. Tim', 30, true),
      (gen_random_uuid(), '${tenant.id}', 'SUP-002', 'Samsung Việt Nam', 'b2b@samsung.com.vn', '028-3666-0002', 'Bình Thạnh, TP.HCM', '0309876543', 'Ms. Kim', 45, true),
      (gen_random_uuid(), '${tenant.id}', 'SUP-003', 'Dell Technologies VN', 'enterprise@dell.com.vn', '024-3555-0003', 'Cầu Giấy, Hà Nội', '0105551234', 'Mr. Dell', 30, true)
  `);
  console.log('  ✅ 3 suppliers created');

  // 7. Create Orders (DB uses 'code' not 'order_number')
  const customerRows = await exec(
    `SELECT id FROM customers WHERE tenant_id = '${tenant.id}' ORDER BY name LIMIT 2`
  );
  const orderRows = await exec(`
    INSERT INTO orders (id, tenant_id, code, customer_id, warehouse_id, assigned_to, status, subtotal, tax_amount, total, notes)
    VALUES
      (gen_random_uuid(), '${tenant.id}', 'SO-2026-0001', '${customerRows.rows[0].id}', '${wh1.id}', '${admin.id}', 'completed', 37990000, 3799000, 41789000, 'Đơn hàng lô lớn'),
      (gen_random_uuid(), '${tenant.id}', 'SO-2026-0002', '${customerRows.rows[1].id}', '${wh1.id}', '${manager.id}', 'processing', 45000000, 4500000, 49500000, NULL),
      (gen_random_uuid(), '${tenant.id}', 'SO-2026-0003', '${customerRows.rows[0].id}', '${wh1.id}', '${staff.id}', 'pending', 12500000, 1250000, 13750000, 'Giao hàng nhanh')
    RETURNING id, code
  `);
  console.log('  ✅ 3 orders created');

  // 8. Create Payments (DB uses reference_type/reference_id instead of order_id)
  await exec(`
    INSERT INTO payments (id, tenant_id, code, type, reference_type, reference_id, party_type, party_id, amount, method, status, created_by)
    VALUES
      (gen_random_uuid(), '${tenant.id}', 'PAY-001', 'income', 'order', '${orderRows.rows[0].id}', 'customer', '${customerRows.rows[0].id}', 41789000, 'bank_transfer', 'completed', '${admin.id}'),
      (gen_random_uuid(), '${tenant.id}', 'PAY-002', 'income', 'order', '${orderRows.rows[1].id}', 'customer', '${customerRows.rows[1].id}', 25000000, 'bank_transfer', 'completed', '${manager.id}')
  `);
  console.log('  ✅ 2 payments created');

  // 9. Create Purchase Orders
  const supplierRows = await exec(
    `SELECT id FROM suppliers WHERE tenant_id = '${tenant.id}' LIMIT 1`
  );
  const purchaseRows = await exec(`
    INSERT INTO purchase_orders (id, tenant_id, code, supplier_id, warehouse_id, status, subtotal, tax_amount, total, created_by)
    VALUES
      (gen_random_uuid(), '${tenant.id}', 'PO-2026-0001', '${supplierRows.rows[0].id}', '${wh1.id}', 'approved', 140000000, 14000000, 154000000, '${admin.id}'),
      (gen_random_uuid(), '${tenant.id}', 'PO-2026-0002', '${supplierRows.rows[0].id}', '${wh1.id}', 'pending', 202500000, 20250000, 222750000, '${manager.id}')
    RETURNING id, code
  `);
  console.log('  ✅ 2 purchase orders created');

  // 10. Create Employees (DB uses 'code' not 'employee_code', no 'user_id'/'department')
  await exec(`
    INSERT INTO employees (id, tenant_id, code, name, email, phone, position, salary, hire_date, is_active)
    VALUES
      (gen_random_uuid(), '${tenant.id}', 'EMP-001', 'Quản trị viên', 'admin@demo.vn', '0901-000-001', 'Quản trị hệ thống', '50000000', '2024-01-15', true),
      (gen_random_uuid(), '${tenant.id}', 'EMP-002', 'Nguyễn Văn Quản Lý', 'manager@demo.vn', '0901-000-002', 'Trưởng phòng kinh doanh', '35000000', '2024-02-01', true),
      (gen_random_uuid(), '${tenant.id}', 'EMP-003', 'Trần Thị Nhân Viên', 'staff@demo.vn', '0901-000-003', 'Nhân viên kho', '12000000', '2024-03-15', true)
  `);
  console.log('  ✅ 3 employees created');

  // 11. Create Projects
  await exec(`
    INSERT INTO projects (id, tenant_id, name, description, status, budget, manager_id, start_date, end_date)
    VALUES
      (gen_random_uuid(), '${tenant.id}', 'Triển khai ERP 2026', 'Dự án triển khai hệ thống ERP cho doanh nghiệp', 'active', 500000000, '${admin.id}', '2026-01-01', '2026-06-30'),
      (gen_random_uuid(), '${tenant.id}', 'Nâng cấp Kho', 'Nâng cấp hệ thống quản lý kho tự động', 'planning', 200000000, '${manager.id}', '2026-03-01', '2026-08-31')
  `);
  console.log('  ✅ 2 projects created');

  // 12. Create Inventory Transactions
  const productRows = await exec(
    `SELECT id FROM products WHERE tenant_id = '${tenant.id}' LIMIT 3`
  );
  if (productRows.rows.length >= 2) {
    await exec(`
      INSERT INTO inventory_transactions (id, tenant_id, product_id, type, quantity, previous_stock, new_stock, reference, notes, created_by)
      VALUES
        (gen_random_uuid(), '${tenant.id}', '${productRows.rows[0].id}', 'in', 200, 0, 200, 'Nhập hàng đầu kỳ', 'Nhập hàng đầu kỳ', '${admin.id}'),
        (gen_random_uuid(), '${tenant.id}', '${productRows.rows[1].id}', 'in', 100, 0, 100, 'Nhập hàng đầu kỳ', 'Nhập hàng đầu kỳ', '${admin.id}'),
        (gen_random_uuid(), '${tenant.id}', '${productRows.rows[0].id}', 'out', 50, 200, 150, 'Xuất bán SO-2026-0001', 'Xuất bán SO-2026-0001', '${admin.id}'),
        (gen_random_uuid(), '${tenant.id}', '${productRows.rows[1].id}', 'out', 20, 100, 80, 'Xuất bán SO-2026-0002', 'Xuất bán SO-2026-0002', '${manager.id}')
    `);
    console.log('  ✅ 4 inventory transactions created');
  }

  // 13. Create Activity Logs
  await exec(`
    INSERT INTO activity_logs (id, tenant_id, user_id, action, entity_type, entity_id, details)
    VALUES
      (gen_random_uuid(), '${tenant.id}', '${admin.id}', 'created', 'tenant', '${tenant.id}', '{"name": "Smart ERP Next Demo"}'),
      (gen_random_uuid(), '${tenant.id}', '${admin.id}', 'created', 'product', '${productRows.rows[0].id}', '{"name": "iPhone 15 Pro Max 256GB"}'),
      (gen_random_uuid(), '${tenant.id}', '${admin.id}', 'approved', 'purchase_order', '${purchaseRows.rows[0].id}', '{"po_number": "PO-2026-0001"}')
  `);
  console.log('  ✅ 3 activity logs created');

  console.log('');
  console.log('✅ Golden Seed completed! Data is ready for end-users.');
  console.log('');
  console.log('📧 Login credentials:');
  console.log('   admin@demo.vn / admin123');
  console.log('   manager@demo.vn / manager123');
  console.log('   staff@demo.vn / staff123');

  await pool.end();
}

main().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
