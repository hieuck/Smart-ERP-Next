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

  // 14. Create CRM Leads
  await exec(`
    INSERT INTO crm_leads (id, tenant_id, first_name, last_name, email, phone, company, source, status, lead_score, industry, description, assigned_to_id)
    VALUES
      (gen_random_uuid(), '${tenant.id}', 'Minh', 'Nguyễn', 'minh.nguyen@techcorp.vn', '0908-111-222', 'TechCorp Việt Nam', 'website', 'new', 85, 'IT', 'Quan tâm đến giải pháp ERP tổng thể', '${admin.id}'),
      (gen_random_uuid(), '${tenant.id}', 'Hương', 'Trần', 'huong.tran@retailco.vn', '0908-333-444', 'RetailCo', 'referral', 'contacted', 72, 'Retail', 'Cần giải pháp quản lý bán hàng đa kênh', '${manager.id}'),
      (gen_random_uuid(), '${tenant.id}', 'Tuấn', 'Lê', 'tuan.le@logistics.vn', '0908-555-666', 'LogisticsVN', 'website', 'qualified', 91, 'Logistics', 'Đã demo, rất quan tâm đến module kho vận', '${admin.id}')
  `);
  console.log('  ✅ 3 CRM leads created');

  // 15. Create Chart of Accounts
  await exec(`
    INSERT INTO chart_of_accounts (id, tenant_id, account_code, account_name, account_type, is_active)
    VALUES
      (gen_random_uuid(), '${tenant.id}', '1', 'Tài sản', 'asset', true),
      (gen_random_uuid(), '${tenant.id}', '2', 'Nợ phải trả', 'liability', true),
      (gen_random_uuid(), '${tenant.id}', '3', 'Vốn chủ sở hữu', 'equity', true),
      (gen_random_uuid(), '${tenant.id}', '4', 'Doanh thu', 'revenue', true),
      (gen_random_uuid(), '${tenant.id}', '5', 'Chi phí', 'expense', true)
  `);
  console.log('  ✅ 5 chart of accounts created');

  // 16. Create Work Shifts
  await exec(`
    INSERT INTO work_shifts (id, tenant_id, name, code, start_time, end_time, work_hours)
    VALUES
      (gen_random_uuid(), '${tenant.id}', 'Ca hành chính', 'SHIFT-OFFICE', '08:00', '17:00', 8),
      (gen_random_uuid(), '${tenant.id}', 'Ca sáng', 'SHIFT-MORNING', '06:00', '14:00', 8),
      (gen_random_uuid(), '${tenant.id}', 'Ca tối', 'SHIFT-NIGHT', '14:00', '22:00', 8)
  `);
  console.log('  ✅ 3 work shifts created');

  // 17. Create Fixed Assets
  await exec(`
    INSERT INTO fixed_assets (id, tenant_id, code, name, category, purchase_date, purchase_cost, useful_life_months, residual_value, status)
    VALUES
      (gen_random_uuid(), '${tenant.id}', 'FA-001', 'Máy chủ Dell PowerEdge', 'IT Equipment', '2025-06-01', 250000000, 60, 25000000, 'active'),
      (gen_random_uuid(), '${tenant.id}', 'FA-002', 'Toyota Fortuner 2025', 'Vehicle', '2025-03-15', 1200000000, 120, 120000000, 'active'),
      (gen_random_uuid(), '${tenant.id}', 'FA-003', 'Máy lạnh Daikin 2.0HP', 'Office Equipment', '2025-05-01', 18000000, 96, 1800000, 'active')
  `);
  console.log('  ✅ 3 fixed assets created');

  // 18. Create Approval Rules
  await exec(`
    INSERT INTO approval_rules (id, tenant_id, name, document_type, min_amount, priority, is_active)
    VALUES
      (gen_random_uuid(), '${tenant.id}', 'PO trên 50 triệu', 'purchase_order', 50000000, 1, true),
      (gen_random_uuid(), '${tenant.id}', 'PO trên 200 triệu', 'purchase_order', 200000000, 2, true),
      (gen_random_uuid(), '${tenant.id}', 'Chi tiêu trên 10 triệu', 'expense', 10000000, 1, true)
  `);
  console.log('  ✅ 3 approval rules created');

  // 19. Create E-Invoice drafts
  await exec(`
    INSERT INTO e_invoices (id, tenant_id, order_id, customer_id, buyer_name, invoice_series, invoice_template, status, currency, provider, notes, total_amount, vat_rate)
    VALUES
      (gen_random_uuid(), '${tenant.id}', '${orderRows.rows[0].id}', '${customerRows.rows[0].id}', 'Công ty TNHH ABC', 'E2E-001', '01GTKT0/001', 'draft', 'VND', 'vnpt', 'Hóa đơn demo SO-2026-0001', 41789000, 10)
  `);
  console.log('  ✅ 1 e-invoice draft created');

  // 20. Create KPI Definitions
  const kpi1Id = (await exec(`
    INSERT INTO kpi_definitions (id, tenant_id, name, type, target_value, unit, period)
    VALUES (gen_random_uuid(), '${tenant.id}', 'Doanh số bán hàng', 'quantity', 100000000, 'VND', 'monthly')
    RETURNING id
  `)).rows[0].id;
  const kpi2Id = (await exec(`
    INSERT INTO kpi_definitions (id, tenant_id, name, type, target_value, unit, period)
    VALUES (gen_random_uuid(), '${tenant.id}', 'Số đơn hàng xử lý', 'quantity', 200, 'đơn', 'monthly')
    RETURNING id
  `)).rows[0].id;

  const emp1Id = (await exec(`SELECT id FROM employees WHERE tenant_id = '${tenant.id}' LIMIT 1`)).rows[0].id;
  const emp2Id = (await exec(`SELECT id FROM employees WHERE tenant_id = '${tenant.id}' LIMIT 1 OFFSET 1`)).rows[0].id;

  await exec(`
    INSERT INTO employee_kpi_targets (id, tenant_id, employee_id, kpi_id, target_value, actual_value, period, score, notes)
    VALUES
      (gen_random_uuid(), '${tenant.id}', '${emp1Id}', '${kpi1Id}', 100000000, 85000000, '2026-06', 85, 'Đạt 85% chỉ tiêu tháng 6'),
      (gen_random_uuid(), '${tenant.id}', '${emp2Id}', '${kpi2Id}', 200, 180, '2026-06', 90, 'Xử lý 180/200 đơn hàng')
  `);
  console.log('  ✅ 2 KPI definitions + targets created');

  // 21. Create Attendance Records (last 30 days for each employee)
  const today21 = new Date();
  const empRows = await exec(`SELECT id FROM employees WHERE tenant_id = '${tenant.id}'`);
  const shiftRows = await exec(`SELECT id FROM work_shifts WHERE tenant_id = '${tenant.id}'`);
  if (empRows.rows.length > 0 && shiftRows.rows.length > 0) {
    for (let d = 30; d >= 0; d--) {
      const date = new Date(today21);
      date.setDate(date.getDate() - d);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0) continue; // skip Sunday
      for (const emp of empRows.rows) {
        const status = dayOfWeek === 6 ? 'present' : (Math.random() > 0.1 ? 'present' : 'late');
        const ot = Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : 0;
        await exec(`
          INSERT INTO attendance_records (id, tenant_id, employee_id, shift_id, work_date, check_in_at, check_out_at, status, overtime_hours, late_minutes)
          VALUES (gen_random_uuid(), '${tenant.id}', '${emp.id}', '${shiftRows.rows[0].id}', '${dateStr}', '08:00', '17:00', '${status}', ${ot}, ${status === 'late' ? Math.floor(Math.random() * 30) + 5 : 0})
        `);
      }
    }
    console.log('  ✅ Attendance records created (~80 records for 30 days)');
  }

  // 22. Create Leave Requests
  if (empRows.rows.length >= 2) {
    const futureDate = new Date(today21.getTime() + 14 * 86400000).toISOString().split('T')[0];
    await exec(`
      INSERT INTO leave_requests (id, tenant_id, employee_id, leave_type, start_date, end_date, reason, status)
      VALUES
        (gen_random_uuid(), '${tenant.id}', '${empRows.rows[0].id}', 'annual', '${futureDate}', '${futureDate}', 'Nghỉ phép năm', 'pending'),
        (gen_random_uuid(), '${tenant.id}', '${empRows.rows[1].id}', 'sick', '${futureDate}', '${futureDate}', 'Khám sức khỏe', 'approved')
    `);
    console.log('  ✅ 2 leave requests created');
  }

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
