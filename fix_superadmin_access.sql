-- 1. Correct the Profiles RLS to avoid recursion and ensure access
DROP POLICY IF EXISTS "Profiles read access" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;

-- Policy 1: Users can always read their own profile
CREATE POLICY "Users can read own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

-- Policy 2: Admins and SuperAdmins can read other profiles in their store (or all for SuperAdmin)
-- We use a subquery that specifically looks for the CURRENT user's role to avoid infinite recursion.
CREATE POLICY "Admins can read store profiles" ON profiles
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND (
            -- This is one way to check role if it was in metadata, 
            -- but since it's in the profiles table, we have to be careful.
            -- A better way is to use a non-recursive check or a function.
            TRUE -- We'll refine this below
        )
    )
);

-- Actually, let's use the simplest, most robust approach for reading profiles:
-- Admins/Superadmins need to see others. 
-- To avoid recursion, we can check a different table or use a simpler policy.
-- Since the system is for a small team, we can allow authenticated users to read profiles
-- while keeping write/update restricted.

DROP POLICY IF EXISTS "Admins can read store profiles" ON profiles;

CREATE POLICY "Profiles visibility" ON profiles
FOR SELECT USING (
    auth.uid() = id -- Own
    OR 
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('store_admin', 'super_admin') -- Admins see others
);

-- Wait, the above is still potentially recursive. 
-- Let's use the standard Supabase pattern:
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

DROP POLICY IF EXISTS "Profiles visibility" ON profiles;

CREATE POLICY "Profiles read" ON profiles
FOR SELECT USING (
    auth.uid() = id 
    OR 
    public.get_my_role() IN ('store_admin', 'super_admin')
);

-- 2. Ensure total visibility for SuperAdmin on other tables
-- Re-applying the check_store_access logic just in case
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Update other table policies to use this non-recursive check where possible
DROP POLICY IF EXISTS "Store isolation: professionals" ON professionals;
CREATE POLICY "Store isolation: professionals" ON professionals 
FOR SELECT USING (store_id = (SELECT store_id FROM profiles WHERE id = auth.uid()) OR is_super_admin());

DROP POLICY IF EXISTS "Store isolation: clients" ON clients;
CREATE POLICY "Store isolation: clients" ON clients 
FOR SELECT USING (store_id = (SELECT store_id FROM profiles WHERE id = auth.uid()) OR is_super_admin());

DROP POLICY IF EXISTS "Store isolation: appointments" ON appointments;
CREATE POLICY "Store isolation: appointments" ON appointments 
FOR SELECT USING (store_id = (SELECT store_id FROM profiles WHERE id = auth.uid()) OR is_super_admin());

DROP POLICY IF EXISTS "Store isolation: leads" ON leads;
CREATE POLICY "Store isolation: leads" ON leads 
FOR SELECT USING (store_id = (SELECT store_id FROM profiles WHERE id = auth.uid()) OR is_super_admin());

-- Ensure EVERYTHING is open for SuperAdmin
CREATE POLICY "Super admin all" ON professionals FOR ALL USING (is_super_admin());
CREATE POLICY "Super admin all" ON clients FOR ALL USING (is_super_admin());
CREATE POLICY "Super admin all" ON appointments FOR ALL USING (is_super_admin());
CREATE POLICY "Super admin all" ON leads FOR ALL USING (is_super_admin());
CREATE POLICY "Super admin all" ON stores FOR ALL USING (is_super_admin());
