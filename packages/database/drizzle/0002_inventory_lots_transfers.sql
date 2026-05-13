-- ============================================
-- Smart ERP Next - Inventory Enhancement
-- Lot Tracking, Serial Numbers, Warehouse Transfers
-- ============================================

-- Product Lots (Batch/Lot Tracking)
CREATE TABLE IF NOT EXISTS product_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  lot_number TEXT NOT NULL,
  expiry_date DATE,
  quantity INTEGER NOT NULL DEFAULT 0,
  remaining_quantity INTEGER NOT NULL DEFAULT 0,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  received_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS product_lots_tenant_idx ON product_lots(tenant_id);
CREATE INDEX IF NOT EXISTS product_lots_product_idx ON product_lots(product_id);
CREATE INDEX IF NOT EXISTS product_lots_lot_number_idx ON product_lots(lot_number);
CREATE INDEX IF NOT EXISTS product_lots_expiry_idx ON product_lots(expiry_date);
CREATE INDEX IF NOT EXISTS product_lots_warehouse_idx ON product_lots(warehouse_id);

-- Product Serial Numbers
CREATE TABLE IF NOT EXISTS product_serials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  lot_id UUID REFERENCES product_lots(id) ON DELETE SET NULL,
  serial_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_stock',
  warranty_expiry DATE,
  sold_at TIMESTAMP,
  sold_to_customer_id UUID,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS product_serials_tenant_idx ON product_serials(tenant_id);
CREATE INDEX IF NOT EXISTS product_serials_product_idx ON product_serials(product_id);
CREATE INDEX IF NOT EXISTS product_serials_serial_idx ON product_serials(serial_number);
CREATE INDEX IF NOT EXISTS product_serials_lot_idx ON product_serials(lot_id);
CREATE INDEX IF NOT EXISTS product_serials_status_idx ON product_serials(status);

-- Warehouse Transfers
CREATE TABLE IF NOT EXISTS warehouse_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  transfer_code TEXT NOT NULL,
  from_warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  to_warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  requested_by UUID,
  approved_by UUID,
  shipped_at TIMESTAMP,
  received_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS warehouse_transfers_tenant_idx ON warehouse_transfers(tenant_id);
CREATE INDEX IF NOT EXISTS warehouse_transfers_from_idx ON warehouse_transfers(from_warehouse_id);
CREATE INDEX IF NOT EXISTS warehouse_transfers_to_idx ON warehouse_transfers(to_warehouse_id);
CREATE INDEX IF NOT EXISTS warehouse_transfers_status_idx ON warehouse_transfers(status);
CREATE INDEX IF NOT EXISTS warehouse_transfers_code_idx ON warehouse_transfers(transfer_code);

-- Warehouse Transfer Items
CREATE TABLE IF NOT EXISTS warehouse_transfer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES warehouse_transfers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  lot_id UUID,
  quantity_requested INTEGER NOT NULL,
  quantity_shipped INTEGER DEFAULT 0,
  quantity_received INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS warehouse_transfer_items_transfer_idx ON warehouse_transfer_items(transfer_id);
CREATE INDEX IF NOT EXISTS warehouse_transfer_items_product_idx ON warehouse_transfer_items(product_id);

-- ============================================
-- ENHANCED INVENTORY FEATURES
-- ============================================

-- FTS indexes for product search
CREATE INDEX IF NOT EXISTS products_name_search ON products USING gin(to_tsvector('simple', name || ' ' || COALESCE(sku, '')));
CREATE INDEX IF NOT EXISTS products_category_search ON products USING gin(to_tsvector('simple', COALESCE(category, '')));

-- Composite index for low stock alerts (performance)
CREATE INDEX IF NOT EXISTS products_low_stock_idx ON products(tenant_id, is_active, stock, min_stock)
  WHERE is_active = true;

-- Composite index for expiring lots
CREATE INDEX IF NOT EXISTS product_lots_expiring_idx ON product_lots(tenant_id, expiry_date)
  WHERE is_active = true AND expiry_date IS NOT NULL;