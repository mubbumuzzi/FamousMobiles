-- Multi-mobile support: one customer, many phone numbers (globally unique)
CREATE TABLE customer_phones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    mobile VARCHAR(20) NOT NULL,
    label VARCHAR(50),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_customer_phones_mobile UNIQUE (mobile)
);

CREATE INDEX idx_customer_phones_customer ON customer_phones(customer_id);
CREATE INDEX idx_customer_phones_mobile ON customer_phones(mobile);

-- Migrate primary numbers
INSERT INTO customer_phones (id, customer_id, mobile, label, is_primary, created_at)
SELECT gen_random_uuid(), id, mobile, 'Primary', TRUE, created_at
FROM customers
WHERE mobile IS NOT NULL AND TRIM(mobile) <> ''
ON CONFLICT (mobile) DO NOTHING;

-- Migrate alternate numbers (skip blanks, duplicates of primary, or numbers already owned)
INSERT INTO customer_phones (id, customer_id, mobile, label, is_primary, created_at)
SELECT gen_random_uuid(), c.id, TRIM(c.alternate_mobile), 'Alternate', FALSE, c.created_at
FROM customers c
WHERE c.alternate_mobile IS NOT NULL
  AND TRIM(c.alternate_mobile) <> ''
  AND TRIM(c.alternate_mobile) <> TRIM(c.mobile)
ON CONFLICT (mobile) DO NOTHING;

ALTER TABLE customers DROP COLUMN alternate_mobile;
