
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
)

const usersToCreate = [
    { name: 'Camily', email: 'camily@zaia.com', store_id: '237aadbc-f516-494b-8e85-9a7c49c27f2f' },
    { name: 'Vitória', email: 'vitoria@zaia.com', store_id: '237aadbc-f516-494b-8e85-9a7c49c27f2f' },
    { name: 'Karen', email: 'karen@zaia.com', store_id: 'c16e1363-8943-495d-ad3c-9fd0f875f26b' },
    { name: 'Bruna', email: 'bruna@zaia.com', store_id: 'c16e1363-8943-495d-ad3c-9fd0f875f26b' },
    { name: 'Gilza', email: 'gilza@zaia.com', store_id: 'd02e89ae-bb8b-410e-b614-a81b5b210623' },
    { name: 'Samaria', email: 'samaria@zaia.com', store_id: 'd02e89ae-bb8b-410e-b614-a81b5b210623' },
    { name: 'Jackeline', email: 'jackeline@zaia.com', store_id: '873e8a97-f252-46d6-922a-834da040a947' },
    { name: 'Sara', email: 'sara@zaia.com', store_id: '873e8a97-f252-46d6-922a-834da040a947' },
    { name: 'Karine', email: 'karine@zaia.com', store_id: 'a05e1426-4d45-4b9f-84fa-2f507849e05f' },
    { name: 'Beatriz', email: 'beatriz@zaia.com', store_id: 'a05e1426-4d45-4b9f-84fa-2f507849e05f' },
]

async function provision() {
    console.log('--- Starting User Provisioning ---')

    for (const user of usersToCreate) {
        console.log(`\nProcessing: ${user.name} (${user.email})...`)

        // 1. Create User in Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: user.email,
            password: 'zaia123',
            email_confirm: true,
            user_metadata: { name: user.name }
        })

        if (authError) {
            console.error(`Error creating auth user for ${user.email}:`, authError.message)
            continue
        }

        const userId = authData.user.id
        console.log(`Auth user created: ${userId}`)

        // 2. Update/Create Profile (often handled by triggers, but let's ensure)
        const { error: profileError } = await supabase.from('profiles').upsert({
            id: userId,
            name: user.name,
            role: 'staff',
            store_id: user.store_id
        })

        if (profileError) {
            console.error(`Error creating profile for ${user.email}:`, profileError.message)
        } else {
            console.log(`Profile created/updated for ${user.name}`)
        }

        // 3. Create Professional Entry
        const { error: proError } = await supabase.from('professionals').insert({
            user_id: userId,
            name: user.name,
            role: 'Consultor', // Default role for staff components
            store_id: user.store_id,
            active: true
        })

        if (proError) {
            console.error(`Error creating professional entry for ${user.email}:`, proError.message)
        } else {
            console.log(`Professional entry created for ${user.name}`)
        }
    }

    console.log('\n--- Provisioning Completed ---')
}

provision()
