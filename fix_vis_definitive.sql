-- DEFINITIVE VISIBILITY FIX V2
-- 1. Ensure is_super_admin is robust and SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Direct check avoiding complex logic
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'super_admin'
  );
END;
$$;

-- 2. UNBLOCK PROFILES (Root Cause usually here)
-- Allow all authenticated users to read names/roles. This prevents recursion loops.
DROP POLICY IF EXISTS "Profiles read" ON profiles;
DROP POLICY IF EXISTS "Profiles visibility" ON profiles;
DROP POLICY IF EXISTS "Profiles read access" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles universal read" ON profiles;
DROP POLICY IF EXISTS "Profiles public read" ON profiles;

CREATE POLICY "Profiles public read" ON profiles
FOR SELECT
TO authenticated
USING (true);

-- 3. UNBLOCK TASK OCCURRENCES
DROP POLICY IF EXISTS "Occurrences read" ON task_occurrences;
DROP POLICY IF EXISTS "Occurrences read access" ON task_occurrences;
DROP POLICY IF EXISTS "Occurrences base access" ON task_occurrences;

CREATE POLICY "Occurrences read" ON task_occurrences
FOR SELECT
TO authenticated
USING (
    staff_id = auth.uid() 
    OR is_super_admin() -- Uses the function above
    OR store_id IN (
        SELECT store_id FROM profiles 
        WHERE id = auth.uid() AND (role = 'store_admin' OR role = 'super_admin')
    )
);

-- 4. UNBLOCK STORES (Ensure joins work)
DROP POLICY IF EXISTS "Stores read" ON stores;
DROP POLICY IF EXISTS "Stores read access" ON stores;

CREATE POLICY "Stores read" ON stores
FOR SELECT
TO authenticated
USING (true);

-- 5. UNBLOCK ASSIGNMENTS (Just in case)
DROP POLICY IF EXISTS "Assignments read" ON task_assignments;
CREATE POLICY "Assignments read" ON task_assignments
FOR SELECT USING (
    staff_id = auth.uid() 
    OR is_super_admin()
    OR store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid() AND role = 'store_admin')
);
