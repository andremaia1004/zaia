import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkProfiles() {
    console.log('Checking all profiles...')
    const { data: profiles, error } = await supabase.from('profiles').select('id, name, role, store_id')
    if (error) {
        console.error('Error fetching profiles:', error.message)
    } else {
        console.log('Profiles found:', profiles)
        const roles = Array.from(new Set(profiles.map(p => p.role)))
        console.log('Unique roles:', roles)
    }

    console.log('\nChecking all stores...')
    const { data: stores, error: storeError } = await supabase.from('stores').select('id, name')
    if (storeError) {
        console.error('Error fetching stores:', storeError.message)
    } else {
        console.log('Stores found:', stores)
    }

    console.log('\nChecking task templates...')
    const { data: templates, error: templateError } = await supabase.from('task_templates').select('id, title')
    if (templateError) {
        console.error('Error fetching templates:', templateError.message)
    } else {
        console.log('Templates found:', templates)
    }
}

checkProfiles()
