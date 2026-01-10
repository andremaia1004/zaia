-- DEFINITIVE RLS FIX: ELIMINATING RECURSION
-- Run this in Supabase SQL Editor

-- 1. Helper Function (Security Definer bypasses RLS of tables it queries)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Profiles Table (Simplified to break recursion)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profiles universal read" ON profiles;
DROP POLICY IF EXISTS "Profiles readability" ON profiles;
DROP POLICY IF EXISTS "Profiles read" ON profiles;
DROP POLICY IF EXISTS "Profiles visibility" ON profiles;
DROP POLICY IF EXISTS "Profiles read access" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles read any" ON profiles;

-- Non-recursive policy: Everyone can see names/roles of others.
CREATE POLICY "Profiles authenticated read" ON profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Profiles self update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 3. Task Assignments
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Assignments read" ON task_assignments;
DROP POLICY IF EXISTS "Assignments write" ON task_assignments;
DROP POLICY IF EXISTS "Assignments read access" ON task_assignments;
DROP POLICY IF EXISTS "Assignments write access" ON task_assignments;
DROP POLICY IF EXISTS "Assignments base access" ON task_assignments;
DROP POLICY IF EXISTS "Assignments admin write" ON task_assignments;

CREATE POLICY "Assignments read access" ON task_assignments 
FOR SELECT USING (
    is_super_admin() 
    OR staff_id = auth.uid()
    OR store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid() AND role = 'store_admin')
);

CREATE POLICY "Assignments write access" ON task_assignments 
FOR ALL USING (
    is_super_admin()
    OR store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid() AND role = 'store_admin')
);

-- 4. Task Occurrences
ALTER TABLE task_occurrences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Occurrences read" ON task_occurrences;
DROP POLICY IF EXISTS "Occurrences write" ON task_occurrences;
DROP POLICY IF EXISTS "Occurrences read access" ON task_occurrences;
DROP POLICY IF EXISTS "Occurrences write access" ON task_occurrences;
DROP POLICY IF EXISTS "Occurrences self update" ON task_occurrences;
DROP POLICY IF EXISTS "Occurrences base access" ON task_occurrences;
DROP POLICY IF EXISTS "Occurrences admin write" ON task_occurrences;

CREATE POLICY "Occurrences read access" ON task_occurrences 
FOR SELECT USING (
    is_super_admin() 
    OR staff_id = auth.uid()
    OR store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid() AND role = 'store_admin')
);

CREATE POLICY "Occurrences write access" ON task_occurrences 
FOR ALL USING (
    is_super_admin()
    OR store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid() AND role = 'store_admin')
);

CREATE POLICY "Occurrences staff update" ON task_occurrences 
FOR UPDATE USING (staff_id = auth.uid()) WITH CHECK (staff_id = auth.uid());

-- 5. Add Unique Constraint for Upsert (if not exists)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_occurrences_assignment_date_unique') THEN
        ALTER TABLE task_occurrences ADD CONSTRAINT task_occurrences_assignment_date_unique UNIQUE (assignment_id, date);
    END IF;
END $$;

-- 6. Stores (Public Select)
DROP POLICY IF EXISTS "Stores read" ON stores;
DROP POLICY IF EXISTS "Stores universal read" ON stores;
CREATE POLICY "Stores authenticated read" ON stores FOR SELECT USING (auth.role() = 'authenticated');
