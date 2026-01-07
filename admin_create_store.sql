-- Refined RPC function for store creation
-- Enhanced to handle Super Admin creation mode properly

CREATE OR REPLACE FUNCTION create_new_store(store_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_store_id UUID;
    current_user_id UUID;
    new_slug TEXT;
    user_role TEXT;
BEGIN
    -- Get the ID of the currently authenticated user
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Generate a simple slug from name
    new_slug := lower(regexp_replace(store_name, '[^a-zA-Z0-9]+', '-', 'g'));

    -- 1. Create Store
    INSERT INTO stores (name, slug, owner_id)
    VALUES (store_name, new_slug || '-' || substr(md5(random()::text), 1, 4), current_user_id)
    RETURNING id INTO new_store_id;

    -- 2. Check User Role
    SELECT role INTO user_role FROM profiles WHERE id = current_user_id;

    -- 3. If user is NOT super_admin, make them the store_admin of this new store
    --    (Standard flow for self-signup)
    IF user_role IS DISTINCT FROM 'super_admin' THEN
        INSERT INTO profiles (id, role, store_id, name)
        VALUES (current_user_id, 'store_admin', new_store_id, 'Admin')
        ON CONFLICT (id) DO UPDATE 
        SET store_id = new_store_id, role = 'store_admin'; 
    END IF;

    -- If super_admin, we DO NOT touch their profile. They remain super_admin with their original store (or null).
    -- They just laid the egg (created the store).

    RETURN jsonb_build_object('store_id', new_store_id, 'store_name', store_name);
END;
$$;
