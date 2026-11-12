-- V16: Enhance accessory sales with quantity, unit price, discount, and performance indexes
ALTER TABLE accessory_sales ADD COLUMN IF NOT EXISTS quantity INT NOT NULL DEFAULT 1;
ALTER TABLE accessory_sales ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2);
ALTER TABLE accessory_sales ADD COLUMN IF NOT EXISTS discount NUMERIC(10,2) NOT NULL DEFAULT 0.00;

CREATE INDEX IF NOT EXISTS idx_accessory_sales_store_sold_at ON accessory_sales(store_id, sold_at DESC);
CREATE INDEX IF NOT EXISTS idx_accessory_sales_customer_id ON accessory_sales(customer_id);
