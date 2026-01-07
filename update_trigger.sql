-- Upgraded Trigger Function
-- Allows Super Admins to specify store_id manually.
-- Enforces store_id from profile for everyone else.

CREATE OR REPLACE FUNCTION public.set_store_id()
RETURNS TRIGGER AS $$
DECLARE
    user_store_id UUID;
    user_role TEXT;
BEGIN
    -- Get user role and store_id
    SELECT store_id, role INTO user_store_id, user_role 
    FROM profiles 
    WHERE id = auth.uid();
    
    -- 1. If Super Admin, allow manual store_id if provided
    IF user_role = 'super_admin' THEN
        IF NEW.store_id IS NOT NULL THEN
            RETURN NEW; -- Keep the provided store_id
        END IF;
        -- If super admin didn't provide store_id, do we enforce? 
        -- Maybe they are creating a global record? But these tables usually require store_id.
        -- Let's allow NULL if the table allows it, or fail if table constraint exists.
        RETURN NEW;
    END IF;

    -- 2. Regular Users: Enforce their store_id
    IF user_store_id IS NULL THEN
        RAISE EXCEPTION 'User has no store assigned';
    END IF;

    -- Force the record to have the user's store_id
    NEW.store_id := user_store_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
