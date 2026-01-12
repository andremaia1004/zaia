-- Add deadline_days to task_templates
ALTER TABLE task_templates
ADD COLUMN IF NOT EXISTS deadline_days INTEGER DEFAULT 0;

COMMENT ON COLUMN task_templates.deadline_days IS 'Number of days after the start date to set the deadline (e.g., 4 means Friday if start is Monday)';
