
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
)

const storesToCreate = [
    { name: 'Presidente Dutra', email: 'presidentedutra@zaia.com', password: 'zaia123' },
    { name: 'São Domingos', email: 'saodomingos@zaia.com', password: 'zaia123' },
    { name: 'Fortuna', email: 'fortuna@zaia.com', password: 'zaia123' },
    { name: 'Santa Filomena', email: 'santafilomena@zaia.com', password: 'zaia123' },
    { name: 'Colinas', email: 'colinas@zaia.com', password: 'zaia123' },
    { name: 'Graça Aranha', email: 'gracaaranha@zaia.com', password: 'zaia123' },
]

async function seedStores() {
    console.log('🌱 Starting Seed Process...')

    for (const storeData of storesToCreate) {
        console.log(`\nProcessing: ${storeData.name}`)

        // 1. Get or Create Store
        let storeId: string | null = null

        // Try to find first
        const slug = storeData.name.toLowerCase().replace(/[^a-z0-9]/g, '-')
        const { data: existingStore } = await supabaseAdmin.from('stores').select('id').eq('slug', slug).single()

        if (existingStore) {
            console.log(`   Detailed: Store exists (ID: ${existingStore.id})`)
            storeId = existingStore.id
        } else {
            const { data: store, error: storeError } = await supabaseAdmin
                .from('stores')
                .insert({
                    name: storeData.name,
                    slug: slug
                })
                .select()
                .single()

            if (storeError) {
                console.error(`❌ Failed to create store ${storeData.name}:`, storeError.message)
                continue
            }
            storeId = store.id
            console.log(`   ✅ Store created (ID: ${storeId})`)
        }

        if (!storeId) continue

        // 2. Get or Create Auth User
        let userId: string | null = null

        // Check if user exists (admin listUsers)
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
        const existingUser = users.find(u => u.email === storeData.email)

        if (existingUser) {
            console.log(`   Detailed: User exists (ID: ${existingUser.id})`)
            userId = existingUser.id
        } else {
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: storeData.email,
                password: storeData.password,
                email_confirm: true,
                user_metadata: { name: storeData.name }
            })

            if (authError) {
                console.error(`   ❌ Failed to create user ${storeData.email}:`, authError.message)
                continue
            }
            userId = authData.user.id
            console.log(`   ✅ User created (ID: ${userId})`)
        }

        if (!userId) continue

        // 3. Link Profile to Store
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: userId,
                store_id: storeId,
                role: 'staff',
                name: storeData.name
            })

        if (profileError) {
            console.error(`   ❌ Failed to link profile:`, profileError.message)
        } else {
            console.log(`   ✅ Profile linked to store as Staff`)
        }
    }

    console.log('\n✨ Seed Complete!')
}

seedStores()
