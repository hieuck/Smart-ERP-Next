/**
 * Create all database tables by importing schema and using drizzle-orm.
 * Bypasses drizzle-kit version mismatch.
 * Run: npx tsx scripts/create-tables.ts
 */
import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://smart_erp:secret_password@localhost:5432/smart_erp';

const CREATE_TABLES_SQL = `
-- Tenants
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  tenant_id UUID REFERENCES tenants(id),
  avatar VARCHAR(500),
  phone VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Product categories
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  barcode VARCHAR(100),
  description TEXT,
  price DECIMAL(15,2) DEFAULT 0,
  cost DECIMAL(15,2) DEFAULT 0,
  quantity INTEGER DEFAULT 0,
  min_quantity INTEGER DEFAULT 0,
  unit VARCHAR(50) DEFAULT 'pcs',
  category_id UUID REFERENCES product_categories(id),
  image VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  company VARCHAR(255),
  tax_code VARCHAR(50),
  notes TEXT,
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  company VARCHAR(255),
  tax_code VARCHAR(50),
  contact_person VARCHAR(255),
  notes TEXT,
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  status VARCHAR(50) DEFAULT 'pending',
  payment_status VARCHAR(50) DEFAULT 'unpaid',
  subtotal DECIMAL(15,2) DEFAULT 0,
  tax DECIMAL(15,2) DEFAULT 0,
  discount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  tenant_id UUID REFERENCES tenants(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Order items
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(255),
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(15,2) DEFAULT 0,
  discount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  amount DECIMAL(15,2) NOT NULL,
  method VARCHAR(50) DEFAULT 'cash',
  status VARCHAR(50) DEFAULT 'completed',
  reference VARCHAR(255),
  notes TEXT,
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Inventory transactions
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  type VARCHAR(50) NOT NULL,
  quantity INTEGER NOT NULL,
  reference_id UUID,
  reference_type VARCHAR(50),
  notes TEXT,
  tenant_id UUID REFERENCES tenants(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Warehouses
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  address TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Purchase orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number VARCHAR(50) UNIQUE NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),
  status VARCHAR(50) DEFAULT 'draft',
  subtotal DECIMAL(15,2) DEFAULT 0,
  tax DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  expected_date DATE,
  notes TEXT,
  tenant_id UUID REFERENCES tenants(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Purchase order items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(255),
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  received_quantity INTEGER DEFAULT 0,
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  message TEXT,
  type VARCHAR(50) DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  link VARCHAR(500),
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Activity logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  details JSONB,
  ip_address VARCHAR(50),
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Messages (chat)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES users(id),
  receiver_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  entity_type VARCHAR(100),
  entity_id UUID,
  content TEXT NOT NULL,
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMP DEFAULT NOW()
);
`;

const SEED_SQL = `
-- Seed tenant
INSERT INTO tenants (id, name, slug) VALUES 
  ('a0000000-0000-0000-0000-000000000001', 'Smart ERP Demo', 'demo')
ON CONFLICT (slug) DO NOTHING;

-- Seed admin user (password: admin123 hashed with bcrypt)
INSERT INTO users (id, email, password, name, role, tenant_id) VALUES 
  ('b0000000-0000-0000-0000-000000000001', 'admin@smarterp.vn', 
   '$2b$10$rQZSBNWpFzOQzLbJkq8UeODpYAnkJmSbS5K1x5K9K0YP5xXJKQXO2', 
   'Admin User', 'admin', 'a0000000-0000-0000-0000-000000000001')
ON CONFLICT (email) DO NOTHING;

-- Seed product categories
INSERT INTO product_categories (id, name, description, tenant_id) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Điện tử', 'Thiết bị điện tử, máy tính', 'a0000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000002', 'Văn phòng phẩm', 'Đồ dùng văn phòng', 'a0000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000003', 'Nội thất', 'Bàn ghế, tủ kệ', 'a0000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Seed products
INSERT INTO products (id, name, sku, price, cost, quantity, unit, category_id, tenant_id) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'Laptop Dell XPS 15', 'DELL-XPS15', 35000000, 30000000, 50, 'pcs', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'),
  ('d0000000-0000-0000-0000-000000000002', 'iPhone 16 Pro Max', 'IP16PM', 34990000, 29000000, 100, 'pcs', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'),
  ('d0000000-0000-0000-0000-000000000003', 'Bút bi Thiên Long', 'TL-089', 5000, 3000, 5000, 'pcs', 'c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001'),
  ('d0000000-0000-0000-0000-000000000004', 'Ghế xoay văn phòng', 'GH-VP01', 2500000, 1800000, 200, 'pcs', 'c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001'),
  ('d0000000-0000-0000-0000-000000000005', 'Màn hình Samsung 27"', 'SS-27M', 6500000, 5200000, 80, 'pcs', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Seed customers
INSERT INTO customers (id, name, email, phone, company, tenant_id) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'Nguyễn Văn An', 'an.nguyen@gmail.com', '0901234567', 'Công ty TNHH ABC', 'a0000000-0000-0000-0000-000000000001'),
  ('e0000000-0000-0000-0000-000000000002', 'Trần Thị Bình', 'binh.tran@outlook.com', '0912345678', 'Tập đoàn XYZ', 'a0000000-0000-0000-0000-000000000001'),
  ('e0000000-0000-0000-0000-000000000003', 'Lê Hoàng Cường', 'cuong.le@company.vn', '0923456789', 'Cty CP Đại Phát', 'a0000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Seed suppliers
INSERT INTO suppliers (id, name, email, phone, company, contact_person, tenant_id) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'Dell Technologies VN', 'supplier@dell.vn', '02812345678', 'Dell Vietnam', 'Phạm Minh Tuấn', 'a0000000-0000-0000-0000-000000000001'),
  ('f0000000-0000-0000-0000-000000000002', 'Apple Vietnam', 'orders@apple.vn', '02887654321', 'Apple VN Distribution', 'Ngô Thanh Hà', 'a0000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Seed orders
INSERT INTO orders (id, order_number, customer_id, status, payment_status, subtotal, tax, total, tenant_id, created_by) VALUES
  ('10000000-0000-0000-0000-000000000001', 'ORD-2026-0001', 'e0000000-0000-0000-0000-000000000001', 'confirmed', 'paid', 70000000, 7000000, 77000000, 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002', 'ORD-2026-0002', 'e0000000-0000-0000-0000-000000000002', 'pending', 'unpaid', 34990000, 3499000, 38489000, 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000003', 'ORD-2026-0003', 'e0000000-0000-0000-0000-000000000003', 'shipped', 'partial', 9000000, 900000, 9900000, 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001')
ON CONFLICT (order_number) DO NOTHING;

-- Seed order items
INSERT INTO order_items (id, order_id, product_id, product_name, quantity, unit_price, total, tenant_id) VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Laptop Dell XPS 15', 2, 35000000, 70000000, 'a0000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'iPhone 16 Pro Max', 1, 34990000, 34990000, 'a0000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000004', 'Ghế xoay văn phòng', 3, 2500000, 7500000, 'a0000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', 'Bút bi Thiên Long', 300, 5000, 1500000, 'a0000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Seed warehouses
INSERT INTO warehouses (id, name, code, address, is_default, tenant_id) VALUES
  ('30000000-0000-0000-0000-000000000001', 'Kho chính HCM', 'WH-HCM', '123 Nguyễn Huệ, Q1, TP.HCM', true, 'a0000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000002', 'Kho Hà Nội', 'WH-HN', '456 Hoàng Diệu, Ba Đình, Hà Nội', false, 'a0000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Seed payments
INSERT INTO payments (id, order_id, amount, method, status, tenant_id) VALUES
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 77000000, 'bank_transfer', 'completed', 'a0000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 5000000, 'cash', 'completed', 'a0000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;
`;

async function main() {
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  
  try {
    console.log('🔌 Connecting to PostgreSQL...');
    const client = await pool.connect();
    console.log('✅ Connected!');
    
    console.log('📋 Creating tables...');
    await client.query(CREATE_TABLES_SQL);
    console.log('✅ All tables created!');
    
    console.log('🌱 Seeding data...');
    await client.query(SEED_SQL);
    console.log('✅ Data seeded!');
    
    // Verify
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' ORDER BY table_name
    `);
    console.log(`\n📊 Total tables: ${tables.rows.length}`);
    tables.rows.forEach(r => console.log(`   - ${r.table_name}`));
    
    const userCount = await client.query('SELECT count(*) FROM users');
    const productCount = await client.query('SELECT count(*) FROM products');
    const orderCount = await client.query('SELECT count(*) FROM orders');
    const customerCount = await client.query('SELECT count(*) FROM customers');
    
    console.log(`\n📈 Data summary:`);
    console.log(`   Users: ${userCount.rows[0].count}`);
    console.log(`   Products: ${productCount.rows[0].count}`);
    console.log(`   Orders: ${orderCount.rows[0].count}`);
    console.log(`   Customers: ${customerCount.rows[0].count}`);
    
    client.release();
  } finally {
    await pool.end();
  }
}

main().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
