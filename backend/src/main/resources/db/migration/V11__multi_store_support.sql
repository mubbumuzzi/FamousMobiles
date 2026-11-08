-- V11: Multi-store branch support with shared staff and branch-specific tracking/receipts

CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    alternate_mobile VARCHAR(20),
    owner_name VARCHAR(255) NOT NULL,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    pincode VARCHAR(20),
    terms JSONB NOT NULL DEFAULT '[]',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Store 1 (Main Branch - Manikonda) and Store 2 (New Famous)
INSERT INTO stores (
    code, name, display_name, mobile, alternate_mobile, owner_name,
    address_line1, address_line2, city, pincode, terms, active
) VALUES (
    'FM1',
    'Famous Mobiles (Main Branch - Manikonda)',
    'Manikonda',
    '9063786751',
    NULL,
    'Basheer Uddin',
    'Opp Friends Colony Bus Stop, Shaikpet Main Road',
    'Manikonda',
    'Hyderabad',
    '500089',
    '["Delivery should be collected within 21 days; otherwise we are not responsible.", "Please bring this bill when collecting your device."]'::jsonb,
    TRUE
), (
    'FM2',
    'New Famous',
    'New Famous',
    '9063786751',
    NULL,
    'Basheer Uddin',
    'Shaikpet Main Road',
    'Shaikpet',
    'Hyderabad',
    '500008',
    '["Delivery should be collected within 21 days; otherwise we are not responsible.", "Please bring this bill when collecting your device."]'::jsonb,
    TRUE
);

-- Store tracking sequences for per-branch tracking IDs (FM1-YYYY-000001, FM2-YYYY-000001)
CREATE TABLE store_tracking_sequences (
    store_code VARCHAR(10) NOT NULL,
    year INTEGER NOT NULL,
    last_value BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (store_code, year)
);

-- Initialize sequence for Store 1 from existing tracking sequence if available
INSERT INTO store_tracking_sequences (store_code, year, last_value)
SELECT 'FM1', year, last_value FROM tracking_number_sequences
ON CONFLICT (store_code, year) DO NOTHING;

-- Associate repair_tickets, payments, stock_orders, and users with stores
ALTER TABLE repair_tickets ADD COLUMN store_id UUID REFERENCES stores(id);
ALTER TABLE payments ADD COLUMN store_id UUID REFERENCES stores(id);
ALTER TABLE stock_orders ADD COLUMN store_id UUID REFERENCES stores(id);
ALTER TABLE users ADD COLUMN default_store_id UUID REFERENCES stores(id);

-- Backfill all existing records to Store 1
UPDATE repair_tickets
SET store_id = (SELECT id FROM stores WHERE code = 'FM1')
WHERE store_id IS NULL;

UPDATE payments
SET store_id = (SELECT id FROM stores WHERE code = 'FM1')
WHERE store_id IS NULL;

UPDATE stock_orders
SET store_id = (SELECT id FROM stores WHERE code = 'FM1')
WHERE store_id IS NULL;

UPDATE users
SET default_store_id = (SELECT id FROM stores WHERE code = 'FM1')
WHERE default_store_id IS NULL;

-- Indexes for performance
CREATE INDEX idx_repair_tickets_store_id ON repair_tickets(store_id);
CREATE INDEX idx_payments_store_id ON payments(store_id);
CREATE INDEX idx_stock_orders_store_id ON stock_orders(store_id);
