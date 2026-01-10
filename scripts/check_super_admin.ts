import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkUserRole() {
    console.log('Checking role for super@zaia.com...')

    // First, we need to find the user in auth.users via service role
    // Since we don't have direct access to auth.users in search, 
    // we check the profiles table which should have the name or email linked if we sync it,
    // or we check by ID if we knew it. 
    // However, the best way here is to check profiles for name/email if stored,
    // or list all and look for role 'super_admin'.

    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')

    if (error) {
        console.error('Error fetching profiles:', error.message)
        return
    }

    const superAdmin = profiles.find(p => p.name?.toLowerCase().includes('super') || p.role === 'super_admin')

    if (superAdmin) {
        console.log('User found in profiles:', superAdmin)
    } else {
        console.log('No super_admin user found in profiles.')
    }
}

checkUserRole()
