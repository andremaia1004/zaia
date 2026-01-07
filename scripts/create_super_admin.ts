
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
)

async function createSuperAdmin() {
    const email = 'super@zaia.com'
    const password = 'admin_master_key'
    const name = 'Super Admin'

    console.log(`Creating user ${email}...`)

    // 1. Create Auth User
    const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name }
    })

    if (createError) {
        if (createError.message.includes('already been registered')) {
            console.log('User already exists! Trying to find and update...')
            // Find user ID? We can't search by email easily without listUsers permission or brute force.
            // Actually listUsers works with service role.
            const { data: users } = await supabaseAdmin.auth.admin.listUsers()
            const existingUser = users.users.find(u => u.email === email)

            if (existingUser) {
                console.log(`Found user ${existingUser.id}. Promoting...`)
                await promoteToSuperAdmin(existingUser.id)
                return
            }
        }
        console.error('Error creating user:', createError)
        return
    }

    if (user && user.user) {
        console.log(`User created (ID: ${user.user.id}). Promoting...`)
        await promoteToSuperAdmin(user.user.id)
    }
}

async function promoteToSuperAdmin(userId: string) {
    // 2. Update Profile to 'super_admin'
    // Depending on triggers, profile might be created or not. 
    // We strictly Upsert to be sure.

    // Check if profile exists
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

    const { error: upsertError } = await supabaseAdmin
        .from('profiles')
        .upsert({
            id: userId,
            role: 'super_admin',
            name: 'Super Admin',
            store_id: null // Ensure no store is linked for global view (optional logic depending on your RLS)
        })

    if (upsertError) {
        console.error('Error promoting user:', upsertError)
    } else {
        console.log('SUCCESS: User is now Super Admin!')
        console.log('------------------------------------------------')
        console.log('Login: super@zaia.com')
        console.log('Pass:  admin_master_key')
        console.log('------------------------------------------------')
    }
}

createSuperAdmin()
