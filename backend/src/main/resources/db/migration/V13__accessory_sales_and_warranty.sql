-- Table for off-the-shelf accessory sales and warranty bills
CREATE TABLE IF NOT EXISTS accessory_bill_sequences (
    year INT PRIMARY KEY,
    last_value BIGINT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS accessory_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_number VARCHAR(32) NOT NULL UNIQUE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_mobile VARCHAR(20) NOT NULL,
    accessory_name VARCHAR(255) NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    payment_mode VARCHAR(20) NOT NULL DEFAULT 'UPI',
    warranty_months INT NOT NULL DEFAULT 0,
    warranty_expires_at DATE,
    serial_number VARCHAR(100),
    notes TEXT,
    sold_by UUID REFERENCES users(id) ON DELETE SET NULL,
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    sold_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accessory_sales_bill_number ON accessory_sales(bill_number);
CREATE INDEX IF NOT EXISTS idx_accessory_sales_customer_mobile ON accessory_sales(customer_mobile);
CREATE INDEX IF NOT EXISTS idx_accessory_sales_sold_at ON accessory_sales(sold_at DESC);
CREATE INDEX IF NOT EXISTS idx_accessory_sales_store_id ON accessory_sales(store_id);
