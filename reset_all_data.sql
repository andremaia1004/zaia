-- DANGER: THIS SCRIPT DELETES ALL TENANT DATA
-- Preserves only the Super Admin user in 'profiles'

BEGIN;

-- 1. Delete all business data
DELETE FROM public.appointments;
DELETE FROM public.leads;
DELETE FROM public.lead_tasks;
DELETE FROM public.professionals;
DELETE FROM public.clients;

-- 2. Delete all stores (will cascade if FKs serve, but we deleted children above to be safe)
DELETE FROM public.stores;

-- 3. Reset Profiles (disconnect users from deleted stores)
-- Keep Super Admin role, demote others
UPDATE public.profiles
SET store_id = NULL,
    role = CASE 
        WHEN role = 'super_admin' THEN 'super_admin'
        ELSE 'staff' -- or 'user'
    END
WHERE true;

COMMIT;
