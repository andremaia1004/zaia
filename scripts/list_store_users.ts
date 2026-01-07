
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function listSimple() {
    const { data: stores } = await supabase.from('stores').select('*')
    const { data: profiles } = await supabase.from('profiles').select('*')
    const { data: { users } } = await supabase.auth.admin.listUsers()

    const emailMap = new Map(users.map(u => [u.id, u.email]))
    const storeMap = new Map(stores?.map(s => [s.id, s.name]) || [])

    console.log('--- START LIST ---')
    profiles?.forEach(p => {
        const storeName = storeMap.get(p.store_id) || 'Unassigned'
        const email = emailMap.get(p.id) || '???'
        console.log(`[${storeName}] ${p.name} (${email}) - ${p.role}`)
    })
    console.log('--- END LIST ---')
}

listSimple()
