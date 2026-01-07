import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        // 1. Check permissions (Optional: verify if caller is super_admin if we had session passed, 
        // OR rely on this route being internal/protected. Ideally we check the session cookie here too)

        const body = await request.json()
        const { storeName, storeSlug, managerName, email, password, role } = body

        console.log('--- CREATING STORE ---')
        console.log('Inputs:', { storeName, storeSlug, managerName, email, role })

        // Validate inputs
        if (!storeName || !email || !password) {
            return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
        }

        // Validate role if provided
        const validRoles = ['store_admin', 'staff']
        const assignedRole = role && validRoles.includes(role) ? role : 'store_admin'

        // 2. Handle Slug Uniqueness (Robust Loop)
        let finalSlug = (storeSlug || storeName).trim().toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') || 'store'

        console.log('Generating unique slug for:', finalSlug)

        let isUnique = false
        let attempts = 0
        while (!isUnique && attempts < 10) {
            const { data: existing, error: checkError } = await supabaseAdmin
                .from('stores')
                .select('slug')
                .eq('slug', finalSlug)
                .maybeSingle()

            if (checkError) {
                console.error('Error checking slug uniqueness:', checkError)
                return NextResponse.json({ error: 'Erro ao validar slug' }, { status: 500 })
            }

            if (existing) {
                const suffix = Math.random().toString(36).substring(2, 6)
                finalSlug = `${finalSlug.split('-').slice(0, 3).join('-')}-${suffix}`
                attempts++
            } else {
                isUnique = true
            }
        }

        console.log('Final Slug:', finalSlug)

        // 3. Create Store in DB
        const { data: store, error: storeError } = await supabaseAdmin
            .from('stores')
            .insert({
                name: storeName.trim(),
                slug: finalSlug
            })
            .select()
            .single()

        if (storeError) {
            console.error('Store Create Error (Full):', JSON.stringify(storeError, null, 2))
            return NextResponse.json({ error: 'Erro ao criar loja: ' + (storeError.code === '23505' ? 'Slug já existe' : storeError.message) }, { status: 400 })
        }

        console.log('Store created successfully:', store.id)

        // 4. Create Auth User
        console.log('Creating Auth User for email:', email)
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: {
                name: managerName || 'Gerente'
            }
        })

        if (authError) {
            console.error('Auth User Create Error (Full):', JSON.stringify(authError, null, 2))
            // Rollback store creation
            console.log('Rolling back store:', store.id)
            await supabaseAdmin.from('stores').delete().eq('id', store.id)

            let errorMessage = authError.message
            if (errorMessage.includes('Database error')) {
                errorMessage = 'Erro interno no banco de dados (Trigger falhou). Verifique se o SQL foi aplicado corretamente.'
            } else if (authError.status === 422) {
                errorMessage = 'Email já está em uso ou formato inválido.'
            }

            return NextResponse.json({ error: 'Erro ao criar usuário: ' + errorMessage }, { status: 400 })
        }

        console.log('Auth User created:', authUser.user.id)

        // 5. Create/Update Profile (Link User to Store)
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: authUser.user.id,
                name: managerName || 'Gerente',
                role: assignedRole,
                store_id: store.id
            })

        if (profileError) {
            console.error('Profile Create Error (Full):', JSON.stringify(profileError, null, 2))
            return NextResponse.json({ error: 'Erro ao criar perfil' }, { status: 400 })
        }

        console.log('Profile upserted successfully')
        console.log('--- STORE CREATED SUCCESSFULLY ---')

        return NextResponse.json({ success: true, store, user: { id: authUser.user.id, email: authUser.user.email } })

    } catch (error: any) {
        console.error('API Error:', error)
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
    }
}
