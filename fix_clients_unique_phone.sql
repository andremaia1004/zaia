
-- Fix unique constraint on clients table for multi-tenancy
-- Currently, 'phone' is unique globally, which causes errors when different stores 
-- try to register the same client phone number.

-- 1. Identify and drop the existing unique constraint on 'phone'
-- Standard name is usually 'clients_phone_key'
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_phone_key;

-- 2. Add a new composite unique constraint (phone, store_id)
-- This allows the same phone number to exist in different stores,
-- but maintains uniqueness within the same store.
ALTER TABLE clients ADD CONSTRAINT clients_phone_store_unique UNIQUE (phone, store_id);

-- Optional: If there are null store_ids, we might want to ensure they are handled.
-- But the existing triggers and migrations should have handled this.
