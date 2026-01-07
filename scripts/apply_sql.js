
const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:5432/postgres',
});

const sql = `
BEGIN;

-- 1. Update check_store_access to allow global records (store_id IS NULL)
CREATE OR REPLACE FUNCTION public.check_store_access(record_store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    if record_store_id IS NULL THEN
        RETURN TRUE;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND (
            store_id = record_store_id
            OR role = 'super_admin'
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
    SELECT role, store_id INTO user_role, user_store_id FROM profiles WHERE id = auth.uid();
    
    IF user_role = 'super_admin' THEN
        RETURN NEW;
    END IF;

    IF user_store_id IS NULL THEN
        RAISE EXCEPTION 'User has no store assigned';
    END IF;

    NEW.store_id := user_store_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
`;

async function apply() {
    try {
        await client.connect();
        console.log('Connected to Postgres.');
        await client.query(sql);
        console.log('✅ SQL Applied Successfully!');
    } catch (err) {
        console.error('❌ SQL Application Failed:', err);
    } finally {
        await client.end();
    }
}

apply();
