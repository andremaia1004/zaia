-- Add XP column to task_templates if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'task_templates' AND column_name = 'xp_reward') THEN
        ALTER TABLE task_templates ADD COLUMN xp_reward INTEGER DEFAULT 10;
    END IF;
END $$;

-- Add XP column to task_occurrences if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'task_occurrences' AND column_name = 'xp_reward') THEN
        ALTER TABLE task_occurrences ADD COLUMN xp_reward INTEGER DEFAULT 10;
    END IF;
END $$;

-- Add Total XP column to weekly_scores if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'weekly_scores' AND column_name = 'total_xp') THEN
        ALTER TABLE weekly_scores ADD COLUMN total_xp INTEGER DEFAULT 0;
    END IF;
END $$;

-- Verify and backfill nulls just in case
UPDATE task_templates SET xp_reward = 10 WHERE xp_reward IS NULL;
UPDATE task_occurrences SET xp_reward = 10 WHERE xp_reward IS NULL;
