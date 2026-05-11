-- Quality Management System (QMS)
-- Inspection plans
CREATE TABLE qms_inspection_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(30) NOT NULL, -- incoming, in_process, final
    sampling_plan VARCHAR(30) DEFAULT 'normal', -- normal, tight, reduced
    aql DECIMAL(5,2), -- acceptable quality level
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, product_id, type)
);

-- Inspection characteristics (checklist items)
CREATE TABLE qms_inspection_characteristics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES qms_inspection_plans(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    specification_min DECIMAL(15,6),
    specification_max DECIMAL(15,6),
    unit VARCHAR(50),
    measurement_method TEXT,
    is_critical BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0
);

-- Inspection records (results)
CREATE TABLE qms_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES qms_inspection_plans(id),
    reference_type VARCHAR(30) NOT NULL, -- purchase_order, work_order, inventory_adjustment
    reference_id UUID NOT NULL,
    batch_number VARCHAR(100),
    inspector_id UUID,
    inspection_date DATE NOT NULL,
    verdict VARCHAR(20) NOT NULL, -- pass, fail, conditional
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Inspection results per characteristic
CREATE TABLE qms_inspection_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID NOT NULL REFERENCES qms_inspections(id) ON DELETE CASCADE,
    characteristic_id UUID NOT NULL REFERENCES qms_inspection_characteristics(id),
    measured_value DECIMAL(15,6),
    is_pass BOOLEAN NOT NULL,
    defect_code VARCHAR(50),
    comment TEXT
);

-- Defect codes catalog
CREATE TABLE qms_defect_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    severity VARCHAR(20) DEFAULT 'minor', -- critical, major, minor
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(tenant_id, code)
);

-- Indexes
CREATE INDEX idx_qms_plans_tenant ON qms_inspection_plans(tenant_id);
CREATE INDEX idx_qms_inspections_tenant ON qms_inspections(tenant_id);
CREATE INDEX idx_qms_inspections_reference ON qms_inspections(reference_type, reference_id);
CREATE INDEX idx_qms_defect_codes_tenant ON qms_defect_codes(tenant_id);
