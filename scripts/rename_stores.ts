
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function renameStores() {
    console.log('🔄 Renaming Stores...')

    const { data: stores } = await supabaseAdmin.from('stores').select('*')

    if (!stores) return

    for (const store of stores) {
        // Check for pattern "Loja XX - City"
        if (store.name.startsWith('Loja') && store.name.includes('-')) {
            const newName = store.name.split('-')[1].trim()
            console.log(`Renaming "${store.name}" -> "${newName}"`)

            const { error } = await supabaseAdmin
                .from('stores')
                .update({ name: newName })
                .eq('id', store.id)

            if (error) {
                console.error(`Error updating ${store.name}:`, error)
            }
        }
    }
    console.log('✅ Rename Complete')
}

renameStores()
