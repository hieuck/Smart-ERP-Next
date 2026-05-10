CREATE TABLE IF NOT EXISTS sync_benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  client_id text NOT NULL,
  endpoint text NOT NULL,
  status text NOT NULL,
  duration_ms integer NOT NULL,
  changes_count integer DEFAULT 0,
  size_bytes integer DEFAULT 0,
  created_at timestamp DEFAULT now()
);

CREATE INDEX idx_sync_benchmarks_tenant_created ON sync_benchmarks(tenant_id, created_at);
