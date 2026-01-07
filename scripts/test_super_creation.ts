
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars')
    process.exit(1)
}

// We need to simulate the ACTUAL user, not service role, to trigger RLS/Triggers correctly?
// Triggers fire regardless, but `auth.uid()` depends on the session.
// Using service role key usually bypasses RLS, but TRIGGERS still run. 
// AND `auth.uid()` might be null or special.
// To test this accurately, I should probably log in as super admin.

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testStart() {
    // 1. Sign in as Super Admin
    const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'super@zaia.com',
        password: 'admin_master_key'
    })

    if (loginError) {
        console.error('Login failed:', loginError)
        return
    }

    console.log('Logged in as:', session?.user.email)

    // 2. Try to create a client for a specific store (e.g. one of the existing ones)
    // We need a store ID first.
    const { data: stores } = await supabase.from('stores').select('id, name').limit(1)
    const targetStore = stores?.[0]

    if (!targetStore) {
        console.error('No stores found to test with.')
        return
    }

    console.log(`Attempting to create Client in store: ${targetStore.name} (${targetStore.id})`)

    const { data, error } = await supabase
        .from('clients')
        .insert({
            name: 'Test Super Client',
            phone: '11999998888',
            store_id: targetStore.id // We explicitly provide it
        })
        .select()

    if (error) {
        console.error('Creation Failed:', error)
    } else {
        console.log('Creation Success:', data)
    }
}

testStart()
