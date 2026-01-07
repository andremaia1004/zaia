-- RPC to safely add an initial store admin (professional) to a specific store
-- Useful for Super Admins setting up a new store

CREATE OR REPLACE FUNCTION add_initial_admin(target_store_id UUID, admin_name TEXT, admin_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    user_role TEXT;
    new_prof_id UUID;
BEGIN
    -- Check permissions
    current_user_id := auth.uid();
    SELECT role INTO user_role FROM profiles WHERE id = current_user_id;

    IF user_role IS DISTINCT FROM 'super_admin' THEN
        RAISE EXCEPTION 'Only Super Admins can use this function';
    END IF;

    -- Insert Professional directly (Bypassing Triggers might be needed if triggers force auth.uid store)
    -- Our trigger 'set_store_id' uses auth.uid(). 
    -- If we insert as super admin, we need to DISABLE trigger or OVERRIDE it.
    -- Better: Modify Trigger to allow explicit store_id if user is super_admin? 
    -- OR: Just temporarily disable trigger? No, that's risky.
    -- OR: Use ALTER TABLE ... DISABLE TRIGGER ... (Only owner can)
    
    -- EASIEST WAY: Direct SQL Insert with `session_replication_role`? No.
    
    -- Let's rely on the fact that we are `SECURITY DEFINER` (postgres role).
    -- But the trigger `set_store_id` executes with the privileges of the TRIGGER FUNCTION owner? 
    -- The trigger function `set_store_id` is SECURITY DEFINER too. It checks `auth.uid()`.
    
    -- HACK / SOLUTION: 
    -- We can temporarily set a session variable to bypass the trigger check logic?
    -- Or, since we are designing the system, let's just INSERT and see if it fails.
    -- The trigger `set_store_id` says:
    -- SELECT store_id INTO user_store_id FROM profiles...
    -- IF user_store_id IS NULL THEN RAISE EXCEPTION ...
    
    -- Super Admin acts here. Super Admin might have NULL store_id.
    -- So the trigger WILL fail for Super Admin inserts into `professionals`.
    
    -- WE NEED TO FIX THE TRIGGER OR BYPASS IT.
    -- Since we can't easily change the trigger in this file without re-declaring it...
    -- Let's change the trigger logic in a new migration?
    -- OR: Update `profiles` of super admin to have the target_store_id temporarily? NO.
    
    -- Best approach: Drop and Replace the Trigger Function to be smarter.
    -- See `update_trigger.sql` below this block.
    
    -- Ideally, the trigger should allow manual `store_id` if the user is super_admin.
    
    -- Assuming we fix the trigger (I will create a file for that next), here is the insert:
    
    INSERT INTO professionals (name, role, active, email, store_id)
    VALUES (admin_name, 'store_admin', true, admin_email, target_store_id)
    RETURNING id INTO new_prof_id;

    RETURN jsonb_build_object('id', new_prof_id);
END;
$$;
