
-- Note: 'email' column should be nullable.
-- Also need to ensure the unique index allows multiple NULLs (Postgres does by default).

BEGIN;

-- 1. Make email optional
ALTER TABLE professionals ALTER COLUMN email DROP NOT NULL;

-- 2. Drop the existing unique index if it exists and recreate it strictly for non-null values
-- (Postgres default unique constraint behavior allows multiple NULLs, 
-- but if a unique index was created with WHERE clause or something else, we ensure it's standard)

-- Just to be safe, we will drop the constraint if it exists and rely on standard unique behavior 
-- or create a partial index if we really want to enforce uniqueness ONLY when email is present.

-- Check constraint name usually: 'professionals_email_key' or we might have created 'idx_professionals_email'
-- Let's try to handle standard unique constraint:
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'professionals_email_key') THEN
        ALTER TABLE professionals DROP CONSTRAINT professionals_email_key;
    END IF;
END $$;

-- If there's an index not bound to a constraint:
DROP INDEX IF EXISTS idx_professionals_email;

-- Re-add Unique Constraint that allows NULLs (Standard behavior)
-- OR better: Unique Index on (email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_professionals_email_unique 
ON professionals (email) 
WHERE email IS NOT NULL AND email <> '';

COMMIT;
