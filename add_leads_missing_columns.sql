
-- Add missing columns to 'leads' table
-- These are required for the Lead Management/Kanban features

-- 1. Add 'notes' column
ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Add 'tasks' column (JSONB for flexibility)
-- If it's used as an array of objects in the frontend, JSONB is the correct type.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tasks JSONB DEFAULT '[]'::jsonb;

-- Optional: If the error persists due to PostgREST cache, 
-- running NOTIFY pgrst, 'reload schema' or restarting the service in dashboard might be needed.
-- But usually, adding columns is detected automatically.
