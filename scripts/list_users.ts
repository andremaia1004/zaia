
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function listUsers() {
    console.log('Fetching users...')
    const { data: { users }, error } = await supabase.auth.admin.listUsers()

    if (error) {
        console.error('Error:', error)
        return
    }

    console.log('------------------------------------------------')
    console.log(`Total Users: ${users.length}`)
    console.log('------------------------------------------------')

    users.forEach(u => {
        console.log(`- ${u.email} | Created: ${new Date(u.created_at).toLocaleString()}`)
    })
    console.log('------------------------------------------------')
}

listUsers()
