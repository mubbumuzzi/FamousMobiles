-- Allow hard-deleting staff while keeping historical records
ALTER TABLE repair_tickets
    DROP CONSTRAINT IF EXISTS repair_tickets_created_by_id_fkey,
    ADD CONSTRAINT repair_tickets_created_by_id_fkey
        FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE ticket_status_history
    DROP CONSTRAINT IF EXISTS ticket_status_history_changed_by_id_fkey,
    ADD CONSTRAINT ticket_status_history_changed_by_id_fkey
        FOREIGN KEY (changed_by_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE ticket_notes
    DROP CONSTRAINT IF EXISTS ticket_notes_author_id_fkey,
    ADD CONSTRAINT ticket_notes_author_id_fkey
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE device_photos
    DROP CONSTRAINT IF EXISTS device_photos_uploaded_by_id_fkey,
    ADD CONSTRAINT device_photos_uploaded_by_id_fkey
        FOREIGN KEY (uploaded_by_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE payments
    DROP CONSTRAINT IF EXISTS payments_recorded_by_id_fkey,
    ADD CONSTRAINT payments_recorded_by_id_fkey
        FOREIGN KEY (recorded_by_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE inventory_transactions
    DROP CONSTRAINT IF EXISTS inventory_transactions_performed_by_id_fkey,
    ADD CONSTRAINT inventory_transactions_performed_by_id_fkey
        FOREIGN KEY (performed_by_id) REFERENCES users(id) ON DELETE SET NULL;
