-- V15: High performance composite indexes for dashboard aggregations and date filtering

-- Payment date ranges and multi-store revenue queries
CREATE INDEX IF NOT EXISTS idx_payments_store_created_at ON payments(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- Repair ticket dashboard metrics, ready-pickup, and day-end delivery audits
CREATE INDEX IF NOT EXISTS idx_repair_tickets_store_created_at ON repair_tickets(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_repair_tickets_created_at ON repair_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_repair_tickets_delivered_at ON repair_tickets(delivered_at DESC) WHERE delivered_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_repair_tickets_status_store ON repair_tickets(status, store_id);

-- Accessory sales reporting and day-end audit queries
CREATE INDEX IF NOT EXISTS idx_accessory_sales_store_sold_at ON accessory_sales(store_id, sold_at DESC);
CREATE INDEX IF NOT EXISTS idx_accessory_sales_status_sold_at ON accessory_sales(status, sold_at DESC);

-- Refresh token lookup and lifecycle cleanup
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_revoked ON refresh_tokens(expires_at, revoked);
