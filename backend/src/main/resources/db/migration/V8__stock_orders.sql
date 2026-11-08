CREATE TABLE stock_order_sequences (
    year INTEGER PRIMARY KEY,
    last_value BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE stock_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code VARCHAR(32) NOT NULL UNIQUE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_mobile VARCHAR(20) NOT NULL,
    item_details TEXT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    advance_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    expected_price NUMERIC(10,2),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    arrived_at TIMESTAMPTZ,
    fulfilled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stock_orders_status ON stock_orders(status);
CREATE INDEX idx_stock_orders_mobile ON stock_orders(customer_mobile);
CREATE INDEX idx_stock_orders_created_at ON stock_orders(created_at DESC);
