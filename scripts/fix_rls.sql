
-- Enable RLS on all sensitive tables
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;

-- 1. Appointments Policy
CREATE POLICY "Users can view appointments of their store" ON appointments
  FOR SELECT
  USING (
    store_id IN (
      SELECT store_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Users can insert appointments for their store" ON appointments
  FOR INSERT
  WITH CHECK (
    store_id IN (
      SELECT store_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Users can update appointments of their store" ON appointments
  FOR UPDATE
  USING (
    store_id IN (
      SELECT store_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- 2. Leads Policy
CREATE POLICY "Users can view leads of their store" ON leads
  FOR SELECT
  USING (
    store_id IN (
      SELECT store_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Users can manage leads of their store" ON leads
  FOR ALL
  USING (
    store_id IN (
      SELECT store_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- 3. Clients Policy
CREATE POLICY "Users can view clients of their store" ON clients
  FOR SELECT
  USING (
    store_id IN (
      SELECT store_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Users can manage clients of their store" ON clients
  FOR ALL
  USING (
    store_id IN (
      SELECT store_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- 4. Professionals Policy
CREATE POLICY "Users can view professionals of their store" ON professionals
  FOR SELECT
  USING (
    store_id IN (
      SELECT store_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );
