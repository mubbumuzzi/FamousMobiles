-- V7: Add warranty_days to repair_tickets
ALTER TABLE repair_tickets ADD COLUMN IF NOT EXISTS warranty_days INTEGER NOT NULL DEFAULT 0;
