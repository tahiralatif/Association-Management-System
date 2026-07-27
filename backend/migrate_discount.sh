#!/bin/bash
# Create discount_codes table in PostgreSQL
PGPASSWORD=assochub psql -U assochub -d assochub -h localhost -c "
CREATE TABLE IF NOT EXISTS discount_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL,
    code VARCHAR(50) NOT NULL,
    discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage',
    value NUMERIC(10,2) NOT NULL,
    max_uses INTEGER,
    used_count INTEGER NOT NULL DEFAULT 0,
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ,
    applicable_to VARCHAR(20) NOT NULL DEFAULT 'both',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_discount_codes_tenant_id ON discount_codes (tenant_id);
CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes (tenant_id, code);
"
echo "Migration complete: $?"
