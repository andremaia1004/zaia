
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function testGlobal() {
    console.log('Testing Global Professional Creation...')

    // 1. Sign in as Super Admin (simulate) or just use Service Role which bypasses RLS but triggers run.
    // Triggers use `auth.uid()`. Service role has no auth.uid() by default unless we impersonate?
    // Actually, Service Role user usually bypasses RLS policies but Triggers might fail if they rely on `auth.uid()` which is null.
    // The `set_store_id` trigger fetches from `profiles` where `id = auth.uid()`.
    // If I use service role, `auth.uid()` is null. The trigger might fail or error out.

    // We need to actually sign in as the super admin user to test the trigger logic correctly.
    const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'super@zaia.com',
        password: 'admin_master_key'
    })

    if (loginError) {
        console.error('Login failed:', loginError.message)
        return
    }

    console.log('Logged in as Super Admin.')

    // 2. Create Global Pro
    const { data, error } = await supabase
        .from('professionals')
        .insert({
            name: 'Global Doctor',
            role: 'Especialista',
            active: true,
            store_id: null // Explicitly null
        })
        .select()
        .single()

    if (error) {
        console.error('❌ Creation Failed:', error.message)
    } else {
        console.log('✅ Global Professional Created:', data)
        // Cleanup
        await supabase.from('professionals').delete().eq('id', data.id)
    }
}

testGlobal()
