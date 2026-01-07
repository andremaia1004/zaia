-- Promote User to Super Admin
-- Replace email with the target user
DO $$
DECLARE
    target_email TEXT := 'inove.sd@gmail.com';
    target_user_id UUID;
BEGIN
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;

    IF target_user_id IS NOT NULL THEN
        UPDATE profiles 
        SET role = 'super_admin' 
        WHERE id = target_user_id;
        
        RAISE NOTICE 'User % promoted to super_admin', target_email;
    ELSE
        RAISE NOTICE 'User % not found', target_email;
    END IF;
END $$;
