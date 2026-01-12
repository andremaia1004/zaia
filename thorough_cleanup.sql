-- THOROUGH CLEANUP SCRIPT
-- This script removes all operational/test data but preserves:
-- 1. Stores (The structure)
-- 2. Task Templates (The configuration)
-- 3. Profiles (The user accounts)
-- 4. Supabase Auth Users

BEGIN;

-- 1. Delete Task-related data
DELETE FROM public.task_occurrences;
DELETE FROM public.task_assignments;
DELETE FROM public.weekly_scores;

-- 2. Delete Notifications
DELETE FROM public.notifications;

-- 3. Delete Lead-related data
DELETE FROM public.leads;

-- 4. Delete Appointment-related data
DELETE FROM public.appointments;

-- 5. Delete Base Records
DELETE FROM public.professionals;
DELETE FROM public.clients;

-- Note: We keep public.stores and public.task_templates 
-- as they are considered "structural" configuration.
-- To also delete stores, uncomment the next line:
-- DELETE FROM public.stores;

COMMIT;
