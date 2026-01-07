
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkProfiles() {
    console.log('--- Checking Profiles & Roles ---')

    const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
            id,
            name,
            role,
            store_id,
            stores ( name )
        `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching profiles:', error)
        return
    }

    console.log(JSON.stringify(profiles?.map(p => ({
        Name: p.name,
        Role: p.role,
        Store: Array.isArray(p.stores) ? p.stores[0]?.name : 'N/A',
        ID: p.id
    })), null, 2))

    // Note: If profiles doesn't have email column, we might want to join auth.users, 
    // but we can't join auth schema easily via client. 
    // We rely on the name/store to identify.
}

checkProfiles()
