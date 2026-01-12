-- Migration to add scheduling fields to task_assignments

ALTER TABLE task_assignments 
ADD COLUMN IF NOT EXISTS scheduled_date DATE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS custom_deadline TIMESTAMPTZ DEFAULT NULL;

-- Optional: Add comments
COMMENT ON COLUMN task_assignments.scheduled_date IS 'Specific date for the task assignment (start date for recurring, target date for once)';
COMMENT ON COLUMN task_assignments.custom_deadline IS 'Specific deadline that overrides the template default time';
