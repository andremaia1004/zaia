-- Refine Task RLS to use the non-recursive helper functions

-- 1. TASK ASSIGNMENTS
DROP POLICY IF EXISTS "Assignments base access" ON task_assignments;
DROP POLICY IF EXISTS "Assignments admin write" ON task_assignments;

CREATE POLICY "Assignments read access" ON task_assignments
FOR SELECT USING (
    staff_id = auth.uid() 
    OR is_super_admin()
    OR store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid() AND role = 'store_admin')
);

CREATE POLICY "Assignments write access" ON task_assignments
FOR ALL USING (
    is_super_admin()
    OR store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid() AND role = 'store_admin')
);

-- 2. TASK OCCURRENCES
DROP POLICY IF EXISTS "Occurrences base access" ON task_occurrences;
DROP POLICY IF EXISTS "Occurrences admin write" ON task_occurrences;
DROP POLICY IF EXISTS "Occurrences staff update" ON task_occurrences;

CREATE POLICY "Occurrences read access" ON task_occurrences
FOR SELECT USING (
    staff_id = auth.uid() 
    OR is_super_admin()
    OR store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid() AND role = 'store_admin')
);

CREATE POLICY "Occurrences write access" ON task_occurrences
FOR ALL USING (
    is_super_admin()
    OR store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid() AND role = 'store_admin')
);

-- For staff updates (like checking a task)
CREATE POLICY "Occurrences self update" ON task_occurrences
FOR UPDATE USING (staff_id = auth.uid()) WITH CHECK (staff_id = auth.uid());

-- 3. TASK TEMPLATES
DROP POLICY IF EXISTS "Templates superadmin access" ON task_templates;
CREATE POLICY "Templates write any" ON task_templates FOR ALL USING (is_super_admin());

-- 4. PROFILES (Double check visibility)
-- Ensure SuperAdmin can see stores even if store_id is null
DROP POLICY IF EXISTS "Stores read access" ON stores;
CREATE POLICY "Stores read any" ON stores FOR SELECT USING (true); -- Public read for stores is usually fine in this app
