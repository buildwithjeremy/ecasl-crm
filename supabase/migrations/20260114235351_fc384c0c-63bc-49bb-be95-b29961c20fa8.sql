-- Drop the legacy admin_contact columns from facilities table
-- All data has been migrated to billing_contacts JSONB column

ALTER TABLE facilities DROP COLUMN IF EXISTS admin_contact_name;
ALTER TABLE facilities DROP COLUMN IF EXISTS admin_contact_phone;
ALTER TABLE facilities DROP COLUMN IF EXISTS admin_contact_email;