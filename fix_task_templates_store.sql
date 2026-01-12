-- MIGRATION: ALLOW STORE-SPECIFIC TASK TEMPLATES
-- This allows store admins to create and manage their own templates.

BEGIN;

-- 1. Add store_id to task_templates if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'task_templates' AND column_name = 'store_id') THEN
        ALTER TABLE task_templates ADD COLUMN store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Update RLS policies for task_templates
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Templates read access" ON task_templates;
DROP POLICY IF EXISTS "Templates superadmin access" ON task_templates;
DROP POLICY IF EXISTS "Templates write access" ON task_templates;
DROP POLICY IF EXISTS "Templates store admin manage" ON task_templates;

-- Policy: Everyone can read global templates (store_id IS NULL)
-- Store Admin/Staff can read templates from their own store
CREATE POLICY "Templates read access" ON task_templates
FOR SELECT USING (
    store_id IS NULL 
    OR store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Policy: SuperAdmin can do anything
CREATE POLICY "Templates superadmin manage" ON task_templates
FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Policy: StoreAdmin can manage templates for their own store
CREATE POLICY "Templates store admin manage" ON task_templates
FOR ALL USING (
    store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid() AND role = 'store_admin')
) WITH CHECK (
    store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid() AND role = 'store_admin')
);

COMMIT;
