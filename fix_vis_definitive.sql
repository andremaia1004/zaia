-- DEFINITIVE VISIBILITY FIX
-- 1. Ensure is_super_admin is SECURITY DEFINER (Bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Ensure task_occurrences is visible to Super Admin
DROP POLICY IF EXISTS "Occurrences read" ON task_occurrences;
DROP POLICY IF EXISTS "Occurrences base access" ON task_occurrences; -- cleanup old

CREATE POLICY "Occurrences read" ON task_occurrences
FOR SELECT USING (
    staff_id = auth.uid() 
    OR is_super_admin() -- Global view
    OR store_id IN ( -- Store Admin view
        SELECT store_id FROM profiles 
        WHERE id = auth.uid() AND (role = 'store_admin' OR role = 'super_admin')
    )
);

-- 3. Ensure profiles are visible (for the name join)
DROP POLICY IF EXISTS "Profiles read access" ON profiles;
DROP POLICY IF EXISTS "Profiles universal read" ON profiles;

CREATE POLICY "Profiles universal read" ON profiles
FOR SELECT USING (
    true -- TEMPORARY: Allow all profiles to be read by authenticated users to debug join issues. 
    -- Ideally: auth.uid() = id OR is_super_admin() OR store_id match...
    -- But strictly for "Name" display, "true" is often acceptable in internal tools, or use the stricter version below:
);

-- Reverting to stricter profile read for safety, but with SECURITY DEFINER checks
ALTER POLICY "Profiles universal read" ON profiles USING (
    auth.uid() = id
    OR is_super_admin()
    OR (SELECT store_id FROM profiles WHERE id = auth.uid()) = store_id
);
