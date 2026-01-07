
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

async function fixRoles() {
    console.log('--- Updating Roles for Gilza, Bruna, Karine ---')

    const targetIds = [
        '11fae39d-bd20-499b-9872-cd3f3fac687c', // Gilza
        '9555540d-ddb2-467e-bd6e-0c1d7f62b24a', // Bruna
        'ab6c0fce-f621-4147-9c3f-d083c576de60'  // Karine
    ]

    const { data, error } = await supabase
        .from('profiles')
        .update({ role: 'staff' })
        .in('id', targetIds)
        .select()

    if (error) {
        console.error('Error updating roles:', error)
        return
    }

    console.log('Updated users:', data.length)
    data.forEach(u => console.log(`- ${u.name}: ${u.role}`))
}

fixRoles()
