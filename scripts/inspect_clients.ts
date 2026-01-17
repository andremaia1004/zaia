
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function inspect() {
    console.log('Inspecting clients table constraints...')

    const { data, error } = await supabase.rpc('get_constraints', { table_name: 'clients' })
    if (error) {
        // Fallback to direct query if RPC doesn't exist
        console.log('RPC get_constraints not found, trying information_schema...')
        const { data: schemaData, error: schemaError } = await supabase.from('pg_indexes').select('*').eq('tablename', 'clients')
        if (schemaError) {
            console.error('Error fetching indexes:', schemaError)
        } else {
            console.log('Indexes on clients:', schemaData)
        }

        const { data: cols, error: colError } = await supabase.rpc('inspect_table', { tname: 'clients' })
        if (colError) {
            console.error('Error inspecting table:', colError)
        } else {
            console.log('Columns in clients:', cols)
        }
    } else {
        console.log('Constraints on clients:', data)
    }
}

inspect()
