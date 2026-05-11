-- Customer Lifetime Value predictions (stores computed CLV per customer per run)
CREATE TABLE customer_lifetime_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    run_date DATE NOT NULL,
    total_spent DECIMAL(15,2) NOT NULL,
    avg_order_value DECIMAL(15,2) NOT NULL,
    purchase_frequency DECIMAL(8,2) NOT NULL,      -- orders per month
    recency_days INTEGER NOT NULL,                 -- days since last purchase
    predicted_clv DECIMAL(15,2) NOT NULL,
    segment VARCHAR(30) NOT NULL,                  -- vip, high, medium, low, at_risk
    confidence_score DECIMAL(5,2),                 -- 0-100
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, customer_id, run_date)
);

CREATE INDEX idx_clv_tenant_run ON customer_lifetime_values(tenant_id, run_date);
CREATE INDEX idx_clv_customer ON customer_lifetime_values(customer_id);
CREATE INDEX idx_clv_segment ON customer_lifetime_values(segment);
