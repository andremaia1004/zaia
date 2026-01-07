
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function reproduce() {
    console.log('Testing Multiple Professional Creation...')

    // Login as Super Admin to rely on the trigger logic
    const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'super@zaia.com',
        password: 'admin_master_key'
    })

    if (loginError) {
        console.error('Login failed:', loginError.message)
        return
    }

    const email = `test_dup_${Date.now()}@zaia.com`

    // 1. Create First
    console.log('Creating #1...')
    const { data: p1, error: e1 } = await supabase.from('professionals').insert({
        name: 'Pro 1',
        role: 'Optometrista',
        email: email,
        active: true,
        store_id: null
    }).select().single()

    if (e1) console.error('Error #1:', e1)
    else console.log('Success #1:', p1.id)

    // 2. Create Second (Same Email)
    console.log('Creating #2 (Same Email)...')
    const { data: p2, error: e2 } = await supabase.from('professionals').insert({
        name: 'Pro 2',
        role: 'Consultor',
        email: email, // Duplicate?
        active: true,
        store_id: null
    }).select().single()

    if (e2) console.error('Error #2:', e2)
    else console.log('Success #2:', p2.id)

    // 3. Create Third (Different Email)
    console.log('Creating #3 (Unique Email)...')
    const { data: p3, error: e3 } = await supabase.from('professionals').insert({
        name: 'Pro 3',
        role: 'Consultor',
        email: `unique_${Date.now()}@zaia.com`,
        active: true,
        store_id: null
    }).select().single()

    if (e3) console.error('Error #3:', e3)
    else console.log('Success #3:', p3.id)
}

reproduce()
