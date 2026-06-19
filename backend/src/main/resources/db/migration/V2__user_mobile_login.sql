ALTER TABLE users ADD COLUMN mobile VARCHAR(20);

UPDATE users
SET mobile = '9000000000'
WHERE mobile IS NULL AND role = 'ADMIN';

UPDATE users
SET mobile = SUBSTRING(REPLACE(id::text, '-', ''), 1, 10)
WHERE mobile IS NULL;

ALTER TABLE users ALTER COLUMN mobile SET NOT NULL;
CREATE UNIQUE INDEX idx_users_mobile ON users(mobile);
