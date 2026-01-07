-- Enable RLS on all business tables
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Function to check if user belongs to the store of the record
-- or is a super_admin
CREATE OR REPLACE FUNCTION public.check_store_access(record_store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND (
            store_id = record_store_id -- User belongs to this store
            OR role = 'super_admin'    -- User is super admin
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for READ (Select)
CREATE POLICY "Store isolation: professionals" ON professionals FOR SELECT USING (check_store_access(store_id));
CREATE POLICY "Store isolation: clients" ON clients FOR SELECT USING (check_store_access(store_id));
CREATE POLICY "Store isolation: appointments" ON appointments FOR SELECT USING (check_store_access(store_id));
CREATE POLICY "Store isolation: leads" ON leads FOR SELECT USING (check_store_access(store_id));

-- Policies for WRITE (Insert/Update/Delete)
-- For inserts, we need a trigger to set validation, but RLS checks 'WITH CHECK'.
-- Ideally, we assign store_id automatically so user doesn't need to send it.

-- Trigger Function: Auto-assign store_id
CREATE OR REPLACE FUNCTION public.set_store_id()
RETURNS TRIGGER AS $$
DECLARE
    user_store_id UUID;
    user_role TEXT;
BEGIN
    -- Get user's role and store_id
    SELECT role, store_id INTO user_role, user_store_id FROM profiles WHERE id = auth.uid();
    
    -- Super Admin Bypass: Allow them to set store_id explicitly OR NULL (for global)
    IF user_role = 'super_admin' THEN
        -- If NEW.store_id is NULL, it's a Global record. Allow it.
        RETURN NEW;
    END IF;

    -- Regular Users: Enforce their assigned store_id
    IF user_store_id IS NULL THEN
        RAISE EXCEPTION 'User has no store assigned';
    END IF;

    -- Force the record to have the user's store_id
    NEW.store_id := user_store_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply Triggers (Before Insert)
DROP TRIGGER IF EXISTS set_store_id_professionals ON professionals;
CREATE TRIGGER set_store_id_professionals BEFORE INSERT ON professionals FOR EACH ROW EXECUTE FUNCTION set_store_id();

DROP TRIGGER IF EXISTS set_store_id_clients ON clients;
CREATE TRIGGER set_store_id_clients BEFORE INSERT ON clients FOR EACH ROW EXECUTE FUNCTION set_store_id();

DROP TRIGGER IF EXISTS set_store_id_appointments ON appointments;
CREATE TRIGGER set_store_id_appointments BEFORE INSERT ON appointments FOR EACH ROW EXECUTE FUNCTION set_store_id();

DROP TRIGGER IF EXISTS set_store_id_leads ON leads;
CREATE TRIGGER set_store_id_leads BEFORE INSERT ON leads FOR EACH ROW EXECUTE FUNCTION set_store_id();

-- Now enable Insert/Update policies based on store matching
-- Using 'true' for WITH CHECK is mostly safe because the Trigger forces the store_id to be correct.
-- But proper RLS is better.

CREATE POLICY "Write access: professionals" ON professionals FOR ALL USING (check_store_access(store_id));
CREATE POLICY "Write access: clients" ON clients FOR ALL USING (check_store_access(store_id));
CREATE POLICY "Write access: appointments" ON appointments FOR ALL USING (check_store_access(store_id));
CREATE POLICY "Write access: leads" ON leads FOR ALL USING (check_store_access(store_id));
