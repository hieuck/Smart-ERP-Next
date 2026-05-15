-- Quality Management System (QMS) Module

CREATE TABLE IF NOT EXISTS qms_inspection_plans (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  product_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sampling_rule VARCHAR(50) DEFAULT 'AQL 1.0',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_qms_plans_tenant ON qms_inspection_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_qms_plans_product ON qms_inspection_plans(product_id);

CREATE TABLE IF NOT EXISTS qms_inspections (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  plan_id VARCHAR(36) NOT NULL,
  reference_type VARCHAR(50) NOT NULL,
  reference_id VARCHAR(36) NOT NULL,
  verdict VARCHAR(20) NOT NULL CHECK (verdict IN ('pass', 'fail', 'conditional')),
  notes TEXT,
  inspected_by VARCHAR(36) NOT NULL,
  inspection_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_qms_inspections_tenant ON qms_inspections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_qms_inspections_ref ON qms_inspections(reference_type, reference_id);

CREATE TABLE IF NOT EXISTS qms_ncrs (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  code VARCHAR(50) NOT NULL,
  production_order_id VARCHAR(36),
  product_id VARCHAR(36) NOT NULL,
  defect_code VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  root_cause TEXT,
  severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  reported_by VARCHAR(36) NOT NULL,
  reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_qms_ncrs_tenant ON qms_ncrs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_qms_ncrs_status ON qms_ncrs(status);

CREATE TABLE IF NOT EXISTS qms_capas (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  ncr_id VARCHAR(36) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('corrective', 'preventive')),
  action TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'verified')),
  assigned_to VARCHAR(36),
  target_date DATE,
  completed_at TIMESTAMP,
  completed_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_qms_capas_tenant ON qms_capas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_qms_capas_ncr ON qms_capas(ncr_id);

CREATE TABLE IF NOT EXISTS qms_defect_codes (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_qms_defect_codes_tenant ON qms_defect_codes(tenant_id);