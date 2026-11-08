ALTER TABLE stock_orders ALTER COLUMN customer_mobile DROP NOT NULL;
ALTER TABLE stock_orders ALTER COLUMN customer_name SET DEFAULT 'Shop Stock';
