
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkData() {
    const { data: pros, error: proError } = await supabase.from('professionals').select('*')
    const { data: profiles, error: profileError } = await supabase.from('profiles').select('*')

    fs.writeFileSync('debug_data.json', JSON.stringify({ pros, profiles }, null, 2))
    console.log('Data saved to debug_data.json')
}

checkData()
