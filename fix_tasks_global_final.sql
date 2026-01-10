-- CONSOLIDATED FIXES: ACCESS, RLS AND VISIBILITY
-- Run this once to ensure all permissions are correctly set

-- 1. AUTH HELPERS (Non-recursive)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. PROFILES RLS
DROP POLICY IF EXISTS "Profiles read" ON profiles;
DROP POLICY IF EXISTS "Profiles visibility" ON profiles;
DROP POLICY IF EXISTS "Profiles read access" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;

CREATE POLICY "Profiles universal read" ON profiles
FOR SELECT USING (
    auth.uid() = id 
    OR is_super_admin()
    OR get_my_role() = 'store_admin'
);

-- 3. TASK TEMPLATES
DROP POLICY IF EXISTS "Templates read access" ON task_templates;
DROP POLICY IF EXISTS "Templates superadmin access" ON task_templates;
DROP POLICY IF EXISTS "Templates write any" ON task_templates;

CREATE POLICY "Templates read" ON task_templates FOR SELECT USING (true);
CREATE POLICY "Templates write" ON task_templates FOR ALL USING (is_super_admin());

-- 4. TASK ASSIGNMENTS
DROP POLICY IF EXISTS "Assignments read access" ON task_assignments;
DROP POLICY IF EXISTS "Assignments write access" ON task_assignments;
DROP POLICY IF EXISTS "Assignments base access" ON task_assignments;
DROP POLICY IF EXISTS "Assignments admin write" ON task_assignments;

CREATE POLICY "Assignments read" ON task_assignments
FOR SELECT USING (
    staff_id = auth.uid() 
    OR is_super_admin()
    OR store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid() AND role = 'store_admin')
);

CREATE POLICY "Assignments write" ON task_assignments
FOR ALL USING (
    is_super_admin()
    OR store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid() AND role = 'store_admin')
);

-- 5. TASK OCCURRENCES
DROP POLICY IF EXISTS "Occurrences read access" ON task_occurrences;
DROP POLICY IF EXISTS "Occurrences write access" ON task_occurrences;
DROP POLICY IF EXISTS "Occurrences self update" ON task_occurrences;
DROP POLICY IF EXISTS "Occurrences base access" ON task_occurrences;
DROP POLICY IF EXISTS "Occurrences admin write" ON task_occurrences;
DROP POLICY IF EXISTS "Occurrences staff update" ON task_occurrences;

CREATE POLICY "Occurrences read" ON task_occurrences
FOR SELECT USING (
    staff_id = auth.uid() 
    OR is_super_admin()
    OR store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid() AND role = 'store_admin')
);

CREATE POLICY "Occurrences write" ON task_occurrences
FOR ALL USING (
    is_super_admin()
    OR store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid() AND role = 'store_admin')
);

CREATE POLICY "Occurrences self update" ON task_occurrences
FOR UPDATE USING (staff_id = auth.uid()) WITH CHECK (staff_id = auth.uid());

-- 6. STORES
DROP POLICY IF EXISTS "Stores read access" ON stores;
DROP POLICY IF EXISTS "Stores read any" ON stores;
DROP POLICY IF EXISTS "Users can read own store" ON stores;

CREATE POLICY "Stores read" ON stores FOR SELECT USING (true);
CREATE POLICY "Stores write" ON stores FOR ALL USING (is_super_admin());
