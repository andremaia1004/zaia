-- 1. Add email column to clients if it doesn't exist
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Add reminder_sent column to appointments to track if we sent the reminder
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false;

-- 3. Create index for faster querying of tomorrow's appointments
CREATE INDEX IF NOT EXISTS idx_appointments_date_reminder ON appointments(date, reminder_sent);
