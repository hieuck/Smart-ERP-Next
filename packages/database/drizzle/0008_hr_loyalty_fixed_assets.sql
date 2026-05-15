-- HR/Payroll Module
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  position VARCHAR(100),
  salary DECIMAL(12,2) DEFAULT 0,
  hire_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, code)
);

CREATE INDEX idx_employees_tenant ON employees(tenant_id);
CREATE INDEX idx_employees_code ON employees(tenant_id, code);

CREATE TABLE IF NOT EXISTS payrolls (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  month VARCHAR(2) NOT NULL,
  year INTEGER NOT NULL,
  base_salary DECIMAL(12,2) DEFAULT 0,
  allowances DECIMAL(12,2) DEFAULT 0,
  deductions DECIMAL(12,2) DEFAULT 0,
  net_salary DECIMAL(12,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, employee_id, month, year)
);

CREATE INDEX idx_payrolls_tenant ON payrolls(tenant_id);
CREATE INDEX idx_payrolls_employee ON payrolls(employee_id);

-- Loyalty Program Module
CREATE TABLE IF NOT EXISTS loyalty_cards (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  customer_id INTEGER NOT NULL,
  points INTEGER DEFAULT 0,
  tier VARCHAR(20) DEFAULT 'bronze',
  expiry_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, customer_id)
);

CREATE INDEX idx_loyalty_cards_tenant ON loyalty_cards(tenant_id);
CREATE INDEX idx_loyalty_cards_customer ON loyalty_cards(customer_id);

CREATE TABLE IF NOT EXISTS loyalty_rewards (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  points_required INTEGER NOT NULL,
  description TEXT,
  image_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_loyalty_rewards_tenant ON loyalty_rewards(tenant_id);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id SERIAL PRIMARY KEY,
  loyalty_card_id INTEGER NOT NULL REFERENCES loyalty_cards(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('earn', 'redeem', 'expire')),
  reference_id VARCHAR(100),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_loyalty_transactions_card ON loyalty_transactions(loyalty_card_id);
CREATE INDEX idx_loyalty_transactions_created ON loyalty_transactions(created_at);

-- Fixed Assets Module
CREATE TABLE IF NOT EXISTS fixed_assets (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  purchase_cost DECIMAL(12,2) NOT NULL,
  residual_value DECIMAL(12,2) DEFAULT 0,
  useful_life_months INTEGER NOT NULL,
  accumulated_depreciation DECIMAL(12,2) DEFAULT 0,
  purchase_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'disposed', 'maintenance')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, code)
);

CREATE INDEX idx_fixed_assets_tenant ON fixed_assets(tenant_id);
CREATE INDEX idx_fixed_assets_code ON fixed_assets(tenant_id, code);
CREATE INDEX idx_fixed_assets_status ON fixed_assets(tenant_id, status);
