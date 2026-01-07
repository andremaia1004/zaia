-- RPC Function to create a new Store and Admin user
-- This function is called AFTER the user is created in Supabase Auth (via signUp).
-- usage: await supabase.rpc('create_new_store', { store_name: 'Minha Loja' })

CREATE OR REPLACE FUNCTION create_new_store(store_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (postgres/admin)
AS $$
DECLARE
    new_store_id UUID;
    user_id UUID;
    new_slug TEXT;
BEGIN
    -- Get the ID of the currently authenticated user
    user_id := auth.uid();
    
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Generate a simple slug from name (simplified)
    new_slug := lower(regexp_replace(store_name, '[^a-zA-Z0-9]+', '-', 'g'));

    -- Check if user already has a profile/store? 
    -- For now, allow multiple stores or just one. Let's assume one for simplicity of this wizard.

    -- 1. Create Store
    INSERT INTO stores (name, slug, owner_id)
    VALUES (store_name, new_slug || '-' || substr(md5(random()::text), 1, 4), user_id)
    RETURNING id INTO new_store_id;

    -- 2. Create Profile for this user linked to the store
    INSERT INTO profiles (id, role, store_id, name)
    VALUES (user_id, 'store_admin', new_store_id, 'Admin')
    ON CONFLICT (id) DO UPDATE 
    SET store_id = new_store_id, role = 'store_admin'; 
    -- If profile existed (e.g. from previous attempts), update it.

    RETURN jsonb_build_object('store_id', new_store_id, 'store_name', store_name);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION create_new_store TO authenticated;
