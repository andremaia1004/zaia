import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function testInsert() {
    console.log('Fetching valid IDs...')
    const { data: templates } = await supabase.from('task_templates').select('id').limit(1)
    const { data: stores } = await supabase.from('stores').select('id').limit(1)
    const { data: profiles } = await supabase.from('profiles').select('id').limit(1)

    if (!templates?.length || !stores?.length || !profiles?.length) {
        console.error('Missing data for test:', { templates, stores, profiles })
        return
    }

    const payload = {
        template_id: templates[0].id,
        store_id: stores[0].id,
        staff_id: profiles[0].id
    }

    console.log('Testing insert with payload:', payload)
    const { data, error } = await supabase.from('task_assignments').insert(payload).select()

    if (error) {
        console.error('Insert FAILED:', error.message)
    } else {
        console.log('Insert SUCCESS:', data)
        // Clean up
        if (data && data[0]) {
            await supabase.from('task_assignments').delete().eq('id', data[0].id)
            console.log('Cleaned up test record.')
        }
    }
}

testInsert()
