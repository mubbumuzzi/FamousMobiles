-- Support for voiding / cancelling accessory sales with audit trail
ALTER TABLE accessory_sales ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED';
ALTER TABLE accessory_sales ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE accessory_sales ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE accessory_sales ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_accessory_sales_status ON accessory_sales(status);
