-- 1. Drop permissive READ policies (Clean up old "All Access" rules)
DROP POLICY IF EXISTS "Enable read access for all tables" ON professionals;
DROP POLICY IF EXISTS "Enable read access for all tables" ON clients;
DROP POLICY IF EXISTS "Enable read access for all tables" ON appointments;
DROP POLICY IF EXISTS "Enable read access for all tables" ON leads;

-- 2. Drop permissive WRITE policies
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON professionals;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON clients;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON appointments;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON leads;

DROP POLICY IF EXISTS "Enable update for authenticated users" ON professionals;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON clients;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON appointments;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON leads;

-- Note: The stricter policies (like "Store isolation: professionals") defined in supabase_security.sql
-- will now be the ONLY active policies, ensuring data is properly segregated per store.
