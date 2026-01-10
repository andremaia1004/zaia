import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkColumns() {
    console.log('Checking columns for task_templates...')
    const { data: templates, error: templateError } = await supabase.from('task_templates').select('*').limit(1)
    if (templateError) {
        console.error('Error fetching templates:', templateError.message)
    } else {
        console.log('Template columns:', Object.keys(templates[0] || {}))
    }

    console.log('\nChecking columns for task_occurrences...')
    const { data: occurrences, error: occError } = await supabase.from('task_occurrences').select('*').limit(1)
    if (occError) {
        console.error('Error fetching occurrences:', occError.message)
    } else {
        console.log('Occurrence columns:', Object.keys(occurrences[0] || {}))
    }
}

checkColumns()
