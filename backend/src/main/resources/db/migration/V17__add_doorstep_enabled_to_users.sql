ALTER TABLE users ADD COLUMN IF NOT EXISTS doorstep_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Ensure all existing Admins and System Admin 6302255467 have doorstep enabled
UPDATE users
SET doorstep_enabled = TRUE
WHERE role = 'ADMIN' OR mobile = '6302255467';
