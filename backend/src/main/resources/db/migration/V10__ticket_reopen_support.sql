-- V10: Add reopen / quality re-check tracking to repair_tickets
ALTER TABLE repair_tickets
  ADD COLUMN IF NOT EXISTS reopen_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reopened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reopen_reason VARCHAR(255);
