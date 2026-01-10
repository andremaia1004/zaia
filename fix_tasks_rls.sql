-- 1. Fix PROFILES RLS
-- Current policy "Users can read own profile" is too restrictive.
-- We need admins to be able to see other profiles in their store.

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;

CREATE POLICY "Profiles read access" ON profiles
FOR SELECT USING (
    id = auth.uid() -- Can read own
    OR (
        -- Admins and SuperAdmins can read profiles from their own store
        EXISTS (
            SELECT 1 FROM profiles AS p 
            WHERE p.id = auth.uid() 
            AND (p.role = 'store_admin' OR p.role = 'super_admin')
            AND (p.store_id = profiles.store_id OR p.role = 'super_admin')
        )
    )
);

-- 2. Ensure STORES RLS is correctly allowing access
-- (Already seems okay, but let's make it robust)
DROP POLICY IF EXISTS "Users can read own store" ON stores;
CREATE POLICY "Stores read access" ON stores
FOR SELECT USING (
    id IN (SELECT store_id FROM profiles WHERE id = auth.uid()) 
    OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- 3. Verify task_templates has read access
-- (Policy already exists, but re-insuring)
DROP POLICY IF EXISTS "Templates read access" ON task_templates;
CREATE POLICY "Templates read access" ON task_templates FOR SELECT USING (true);
