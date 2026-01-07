
BEGIN;

-- 1. Update check_store_access to allow global records (store_id IS NULL)
CREATE OR REPLACE FUNCTION public.check_store_access(record_store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Global records (NULL store_id) are visible to everyone
    IF record_store_id IS NULL THEN
        RETURN TRUE;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND (
            store_id = record_store_id -- User belongs to this store
            OR role = 'super_admin'    -- User is super admin
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update set_store_id to allow Super Admin to create global records (NULL store_id)
CREATE OR REPLACE FUNCTION public.set_store_id()
RETURNS TRIGGER AS $$
DECLARE
    user_store_id UUID;
    user_role TEXT;
BEGIN
    -- Get user's role and store_id
    SELECT role, store_id INTO user_role, user_store_id FROM profiles WHERE id = auth.uid();
    
    -- Super Admin Bypass: Allow them to set store_id explicitly OR NULL (for global)
    IF user_role = 'super_admin' THEN
        -- If NEW.store_id is NULL, it's a Global record. Allow it.
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

COMMIT;
