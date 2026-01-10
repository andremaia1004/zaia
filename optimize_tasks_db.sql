-- OPTIMIZATION: WEEKLY SCORES & RLS
-- Run this to finalize database structure

-- 1. Add Unique Constraint to weekly_scores
-- This ensures a staff member can only have one score record per week
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'weekly_scores_staff_week_unique') THEN
        ALTER TABLE weekly_scores ADD CONSTRAINT weekly_scores_staff_week_unique UNIQUE (staff_id, week_start_date);
    END IF;
END $$;

-- 2. Apply Definitive RLS to weekly_scores
ALTER TABLE weekly_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Scores base access" ON weekly_scores;
DROP POLICY IF EXISTS "Scores superadmin write" ON weekly_scores;
DROP POLICY IF EXISTS "Scores read access" ON weekly_scores;
DROP POLICY IF EXISTS "Scores write access" ON weekly_scores;

-- Read: Authenticated users can see scores (for ranking)
-- Or restrict to same store/superadmin if strict privacy is needed.
-- For Ranking page, usually everyone sees everyone or at least store-level.
-- Let's stick to the consistent model: Staff sees self, Admin sees store, Super sees all.
CREATE POLICY "Scores read access" ON weekly_scores 
FOR SELECT USING (
    is_super_admin() 
    OR staff_id = auth.uid()
    OR store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid() AND role = 'store_admin')
);

-- Write: Only System/SuperAdmin (via API or direct)
CREATE POLICY "Scores write access" ON weekly_scores 
FOR ALL USING (
    is_super_admin()
);
