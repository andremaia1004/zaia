
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkSuperAdmin() {
    console.log('Checking Super Admin Profile...')

    // 1. Get Auth User ID
    const { data: { users } } = await supabase.auth.admin.listUsers()
    const superUser = users.find(u => u.email === 'super@zaia.com')

    if (!superUser) {
        console.error('❌ Super Admin Auth User NOT FOUND!')
        return
    }
    console.log(`✅ Super Admin Auth ID: ${superUser.id}`)

    // 2. Check Profile
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', superUser.id)
        .single()

    if (error || !profile) {
        console.error('❌ Super Admin Profile NOT FOUND or Error:', error)

        // Attempt fix
        console.log('🛠 Attempting to recreate/fix profile...')
        const { error: fixError } = await supabase.from('profiles').upsert({
            id: superUser.id,
            email: 'super@zaia.com',
            role: 'super_admin',
            name: 'Super Zaia'
        })
        if (fixError) console.error('Failed to fix:', fixError)
        else console.log('✅ Profile recreated/fixed.')

    } else {
        console.log('✅ Super Admin Profile FOUND:', profile)
        if (profile.role !== 'super_admin') {
            console.error(`❌ Role mismatch! Expected 'super_admin', got '${profile.role}'`)
            // Attempt fix
            console.log('🛠 Fixing role...')
            await supabase.from('profiles').update({ role: 'super_admin' }).eq('id', superUser.id)
        }
    }
}

checkSuperAdmin()
