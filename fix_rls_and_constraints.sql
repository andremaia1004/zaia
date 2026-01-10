-- 1. Break Profiles Recursion
-- Remove all existing policies on profiles
DROP POLICY IF EXISTS "Profiles universal read" ON profiles;
DROP POLICY IF EXISTS "Profiles readability" ON profiles;
DROP POLICY IF EXISTS "Profiles read" ON profiles;
DROP POLICY IF EXISTS "Profiles visibility" ON profiles;
DROP POLICY IF EXISTS "Profiles read access" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles read any" ON profiles;

-- Simply allow all authenticated users to read profiles (names/roles)
-- This avoids any recursion because it doesn't call is_super_admin() or any function that calls profiles.
CREATE POLICY "Profiles universal read" ON profiles FOR SELECT USING (auth.role() = 'authenticated');

-- 2. Add Unique Constraint to task_occurrences for Upsert
-- This is required for the task generation job to work correctly without creating duplicates
-- and for the 'onConflict' clause to work.
ALTER TABLE task_occurrences ADD CONSTRAINT task_occurrences_assignment_date_unique UNIQUE (assignment_id, date);

-- 3. Ensure Stores are also readable to avoid similar issues
DROP POLICY IF EXISTS "Stores read" ON stores;
CREATE POLICY "Stores universal read" ON stores FOR SELECT USING (true);
