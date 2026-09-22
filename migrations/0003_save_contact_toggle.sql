-- Add per-profile control for the public Save Contact button.
ALTER TABLE settings ADD COLUMN save_contact_enabled INTEGER NOT NULL DEFAULT 1;
