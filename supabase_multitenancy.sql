-- 1. Create STORES table (Safe create)
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    owner_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Migrate PROFESSIONALS table (Handle existing column)
DO $$
BEGIN
    -- If store_id exists, ensuring it is UUID and has FK
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='professionals' AND column_name='store_id') THEN
        -- Attempt to convert to UUID if it's not (e.g. TEXT)
        -- Note: If data is not valid UUID this will fail, but assuming empty or valid.
        ALTER TABLE professionals ALTER COLUMN store_id TYPE UUID USING store_id::uuid;
        
        -- Add constraint safely
        BEGIN
            ALTER TABLE professionals ADD CONSTRAINT fk_professionals_store FOREIGN KEY (store_id) REFERENCES stores(id);
        EXCEPTION WHEN duplicate_object THEN 
            NULL; -- Constraint already exists
        END;
    ELSE
        -- Column does not exist, add it
        ALTER TABLE professionals ADD COLUMN store_id UUID REFERENCES stores(id);
    END IF;
END $$;

-- 3. Add store_id to other tables (Safe add)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);

-- 4. Create a DEFAULT store and migrate data
DO $$
DECLARE
    default_store_id UUID;
BEGIN
    -- Create default store if 'matriz' doesn't exist, else get its ID
    INSERT INTO stores (name, slug) 
    VALUES ('Loja Matriz', 'matriz') 
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name -- Dummy update to return ID
    RETURNING id INTO default_store_id;

    -- If insert didn't return (due to ON CONFLICT DO NOTHING behavior which avoids returning, but UPDATE returns),
    -- we fetch it explicitly to be safe.
    IF default_store_id IS NULL THEN
        SELECT id INTO default_store_id FROM stores WHERE slug = 'matriz';
    END IF;

    -- Update records where store_id is NULL
    UPDATE professionals SET store_id = default_store_id WHERE store_id IS NULL;
    UPDATE clients SET store_id = default_store_id WHERE store_id IS NULL;
    UPDATE appointments SET store_id = default_store_id WHERE store_id IS NULL;
    UPDATE leads SET store_id = default_store_id WHERE store_id IS NULL;
END $$;

-- 5. Create PROFILES table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'store_admin',
    store_id UUID REFERENCES stores(id),
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Enable RLS
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid errors on retry
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own store" ON stores;

-- Recreate policies
CREATE POLICY "Users can read own profile" ON profiles 
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can read own store" ON stores
    FOR SELECT USING (
        id IN (SELECT store_id FROM profiles WHERE id = auth.uid()) 
        OR 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );
