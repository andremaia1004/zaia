
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
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
)

async function resetDatabase() {
    console.log('🚨 STARTING DATABASE RESET 🚨')
    console.log('This will delete all stores and data...')

    // 1. Delete Child Data First (to avoid FK constraints if any, though cascade might handle it)
    console.log('Deleting Appointments...')
    const { error: errApp } = await supabase.from('appointments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (errApp) console.error('Error deleting appointments:', errApp)

    console.log('Deleting Lead Tasks...')
    const { error: errTasks } = await supabase.from('lead_tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (errTasks) console.error('Error deleting lead_tasks:', errTasks)

    console.log('Deleting Leads...')
    const { error: errLeads } = await supabase.from('leads').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (errLeads) console.error('Error deleting leads:', errLeads)

    console.log('Deleting Clients...')
    const { error: errClients } = await supabase.from('clients').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (errClients) console.error('Error deleting clients:', errClients)

    console.log('Deleting Professionals...')
    const { error: errProfs } = await supabase.from('professionals').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (errProfs) console.error('Error deleting professionals:', errProfs)

    // 2. Unlink Profiles from Stores
    console.log('Resetting Profiles (Unlinking from Stores)...')
    // We update all profiles to have null store_id. 
    // We also set anyone who is 'store_admin' back to 'staff' or keep them as is? 
    // Let's reset them to 'staff' unless they are 'super_admin'.

    // Fetch all profiles first to filter? No, direct update.
    // Update store_id = null for ALL
    const { error: errProfUpdate } = await supabase
        .from('profiles')
        .update({ store_id: null })
        .neq('role', 'super_admin') // Don't touch super admin just in case, though they usually have null store_id anyway.

    if (errProfUpdate) console.error('Error updating profiles:', errProfUpdate)

    // Downgrade store_admins to staff
    const { error: errRoleUpdate } = await supabase
        .from('profiles')
        .update({ role: 'staff' })
        .eq('role', 'store_admin')

    if (errRoleUpdate) console.error('Error downgrading admins:', errRoleUpdate)

    // 3. Delete Stores
    console.log('Deleting Stores...')
    const { error: errStores } = await supabase.from('stores').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (errStores) console.error('Error deleting stores:', errStores)

    // 4. Delete Auth Users (Cleanup logins so emails can be reused)
    console.log('Deleting Auth Users (except Super Admin)...')

    // pagination might be needed if many users, but for now listUsers has default limit 50. 
    // We'll fetch all.
    const { data: { users }, error: errList } = await supabase.auth.admin.listUsers({ perPage: 1000 })

    if (errList) {
        console.error('Error listing users:', errList)
    } else {
        const superEmail = 'super@zaia.com'
        const usersToDelete = users.filter(u => u.email !== superEmail)

        console.log(`Found ${usersToDelete.length} users to delete.`)

        for (const user of usersToDelete) {
            const { error: delErr } = await supabase.auth.admin.deleteUser(user.id)
            if (delErr) {
                console.error(`Failed to delete user ${user.email}:`, delErr)
            } else {
                console.log(`Deleted user: ${user.email}`)
            }
        }
    }

    console.log('✅ DATABASE & AUTH RESET COMPLETE')
}

resetDatabase()
