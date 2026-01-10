-- 1. TASK TEMPLATES
CREATE TABLE task_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    recurrence TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'once'
    target_value INTEGER DEFAULT 1,
    requires_proof BOOLEAN DEFAULT false,
    default_due_time TIME, -- Optional default time for the deadline
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. TASK ASSIGNMENTS
CREATE TABLE task_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES task_templates(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. TASK OCCURRENCES
CREATE TYPE task_status AS ENUM ('PENDENTE', 'FEITA', 'ADIADA', 'ATRASA');

CREATE TABLE task_occurrences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID REFERENCES task_assignments(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    date DATE NOT NULL,
    status task_status DEFAULT 'PENDENTE',
    current_value INTEGER DEFAULT 0,
    target_value INTEGER NOT NULL,
    postponed_to DATE,
    postponed_reason TEXT,
    proof_url TEXT,
    proof_description TEXT,
    due_at TIMESTAMP WITH TIME ZONE, -- Explicit deadline (date + time)
    staff_id UUID REFERENCES auth.users(id) NOT NULL,
    store_id UUID REFERENCES stores(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. WEEKLY SCORES
CREATE TABLE weekly_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    execution_rate NUMERIC(5, 2) DEFAULT 0, -- % of completion
    tasks_done INTEGER DEFAULT 0,
    tasks_postponed INTEGER DEFAULT 0,
    tasks_delayed INTEGER DEFAULT 0,
    met_bonus BOOLEAN DEFAULT false,
    bonus_value NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. SEED DEFAULT TEMPLATES
INSERT INTO task_templates (title, recurrence, target_value) VALUES
('Presença Digital', 'daily', 2),
('Prospecção Ativa', 'daily', 20),
('Padrão e Postura', 'daily', 1),
('Ações Externas', 'monthly', 1),
('Parcerias', 'monthly', 2);

-- 6. INDEXES
CREATE INDEX idx_task_occurrences_date ON task_occurrences(date);
CREATE INDEX idx_task_occurrences_staff_date ON task_occurrences(staff_id, date);
CREATE INDEX idx_task_occurrences_store_date ON task_occurrences(store_id, date);
CREATE INDEX idx_weekly_scores_staff_week ON weekly_scores(staff_id, week_start_date);

-- 7. RLS POLICIES
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_scores ENABLE ROW LEVEL SECURITY;

-- Templates: Everyone authenticated can read
CREATE POLICY "Templates read access" ON task_templates FOR SELECT USING (true);
-- Templates: Only SuperAdmin can write
CREATE POLICY "Templates superadmin access" ON task_templates 
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- Assignments: Staff sees their own, Admin sees store, SuperAdmin sees all
CREATE POLICY "Assignments base access" ON task_assignments FOR SELECT USING (
    staff_id = auth.uid() 
    OR store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid() AND (role = 'store_admin' OR role = 'super_admin'))
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);
CREATE POLICY "Assignments admin write" ON task_assignments FOR ALL USING (
    store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid() AND (role = 'store_admin' OR role = 'super_admin'))
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Occurrences: Same as assignments
CREATE POLICY "Occurrences base access" ON task_occurrences FOR SELECT USING (
    staff_id = auth.uid() 
    OR store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid() AND (role = 'store_admin' OR role = 'super_admin'))
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);
CREATE POLICY "Occurrences staff update" ON task_occurrences FOR UPDATE USING (
    staff_id = auth.uid()
) WITH CHECK (
    staff_id = auth.uid()
);
CREATE POLICY "Occurrences admin write" ON task_occurrences FOR ALL USING (
    store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid() AND (role = 'store_admin' OR role = 'super_admin'))
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Weekly Scores: Same logic
CREATE POLICY "Scores base access" ON weekly_scores FOR SELECT USING (
    staff_id = auth.uid() 
    OR store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid() AND (role = 'store_admin' OR role = 'super_admin'))
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);
CREATE POLICY "Scores superadmin write" ON weekly_scores FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);
