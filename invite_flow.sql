-- 1. Add email column to professionals table
-- This allows Store Admins to "invite" users by specifying their email in advance.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='professionals' AND column_name='email') THEN
        ALTER TABLE professionals ADD COLUMN email TEXT;
        CREATE UNIQUE INDEX idx_professionals_email ON professionals(email);
    END IF;
END $$;

-- 2. Trigger Function to link a newly signed up Auth User to their Professional record
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER AS $$
DECLARE
    prof_record RECORD;
BEGIN
    -- Use a nested block to capture errors and not block user creation
    BEGIN
        -- Check if the new user's email matches a pending professional invitation
        SELECT * INTO prof_record FROM professionals WHERE email = NEW.email LIMIT 1;

        IF FOUND THEN
            -- Found a match! This user was invited by a Store Admin.
            
            -- 1. Create/Update Profile
            INSERT INTO profiles (id, role, store_id, name)
            VALUES (
                NEW.id, 
                CASE WHEN prof_record.role = 'Gerente' THEN 'store_admin' ELSE 'staff' END, 
                prof_record.store_id, 
                prof_record.name
            )
            ON CONFLICT (id) DO UPDATE
            SET store_id = EXCLUDED.store_id,
                role = EXCLUDED.role,
                name = EXCLUDED.name;

            -- 2. Link the Professional Record to this User ID
            UPDATE professionals 
            SET user_id = NEW.id 
            WHERE id = prof_record.id;
            
            RAISE NOTICE 'Linked User % to Professional % (Store %)', NEW.email, prof_record.id, prof_record.store_id;
        END IF;

    EXCEPTION WHEN OTHERS THEN
        -- Log the error but let the user creation proceed
        RAISE WARNING 'Error in handle_new_user_signup: %', SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Bind the Trigger to auth.users
-- Drop first to allow re-running this script
DROP TRIGGER IF EXISTS on_auth_user_created_link_staff ON auth.users;

CREATE TRIGGER on_auth_user_created_link_staff
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user_signup();
