
-- FIX: Supabase Security Triggers
-- This script updates the 'set_store_id' trigger to allowed Super Admins to manually specify a store_id.
-- Currently, the trigger forces the store_id to be NULL or whatever is in the user's profile, blocking Super Admin operations.

-- 1. Update the Trigger Function
CREATE OR REPLACE FUNCTION public.set_store_id()
RETURNS TRIGGER AS $$
DECLARE
    user_store_id UUID;
    user_role TEXT;
BEGIN
    -- Get user's role and store_id
    SELECT role, store_id INTO user_role, user_store_id FROM profiles WHERE id = auth.uid();
    
    -- Super Admin Bypass: Allow them to set store_id explicitly
    IF user_role = 'super_admin' THEN
        IF NEW.store_id IS NULL THEN
             RAISE EXCEPTION 'Super Admin must provide store_id';
        END IF;
        -- If provided, keep it.
        RETURN NEW;
    END IF;

    -- Regular Users: Enforce their assigned store_id
    IF user_store_id IS NULL THEN
        RAISE EXCEPTION 'User has no store assigned';
    END IF;

    -- Force the record to have the user's store_id
    NEW.store_id := user_store_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. No need to recreate triggers, as they point to the function by name. 
-- Updating the function code is enough.
