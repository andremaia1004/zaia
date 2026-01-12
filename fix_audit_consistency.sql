-- 1. Normalização de Status de Leads (Casing Fix)
-- Garante que todos os leads usem 'NOVO' em vez de 'Novo' para alinhar com o Kanban
UPDATE leads SET status = 'NOVO' WHERE status = 'Novo';
UPDATE leads SET status = 'CONTATADO' WHERE status = 'Contato';
UPDATE leads SET status = 'AGENDADO' WHERE status = 'Agendou';

-- 2. Garantir Triggers de Store ID para isolamento Multi-tenancy
-- Reutiliza a função set_store_id() definida em supabase_security.sql

-- Task Templates
DROP TRIGGER IF EXISTS set_store_id_task_templates ON task_templates;
CREATE TRIGGER set_store_id_task_templates BEFORE INSERT ON task_templates FOR EACH ROW EXECUTE FUNCTION set_store_id();

-- Task Assignments
DROP TRIGGER IF EXISTS set_store_id_task_assignments ON task_assignments;
CREATE TRIGGER set_store_id_task_assignments BEFORE INSERT ON task_assignments FOR EACH ROW EXECUTE FUNCTION set_store_id();

-- Task Occurrences
DROP TRIGGER IF EXISTS set_store_id_task_occurrences ON task_occurrences;
CREATE TRIGGER set_store_id_task_occurrences BEFORE INSERT ON task_occurrences FOR EACH ROW EXECUTE FUNCTION set_store_id();

-- Weekly Scores
DROP TRIGGER IF EXISTS set_store_id_weekly_scores ON weekly_scores;
CREATE TRIGGER set_store_id_weekly_scores BEFORE INSERT ON weekly_scores FOR EACH ROW EXECUTE FUNCTION set_store_id();

-- Notifications
DROP TRIGGER IF EXISTS set_store_id_notifications ON notifications;
CREATE TRIGGER set_store_id_notifications BEFORE INSERT ON notifications FOR EACH ROW EXECUTE FUNCTION set_store_id();

-- 3. Atualizar Constraint de Task Occurrences (Garantir Unicidade)
-- Evita duplicidade na geração de tarefas recorrentes
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_occurrences_assignment_date_unique') THEN
        ALTER TABLE task_occurrences ADD CONSTRAINT task_occurrences_assignment_date_unique UNIQUE (assignment_id, date);
    END IF;
END $$;
