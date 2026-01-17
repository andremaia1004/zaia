
import { createClient } from '@/lib/supabase/client'
import type { Client } from './types'

export const clientService = {
    async search(query: string, storeId?: string) {
        const supabase = createClient()
        let builder = supabase
            .from('clients')
            .select('*')
            .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
            .limit(10)

        if (storeId) {
            builder = builder.eq('store_id', storeId)
        }

        const { data, error } = await builder

        if (error) return []
        return data as Client[]
    },

    async getByPhone(phone: string) {
        const supabase = createClient()
        const { data } = await supabase
            .from('clients')
            .select('*')
            .eq('phone', phone)
            .single()
        return data as Client | null
    },

    async create(client: Partial<Client>) {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('clients')
            .insert(client)
            .select()
            .single()

        if (error) throw error
        return data as Client
    },

    async upsert(client: Partial<Client>) {
        const supabase = createClient()
        // Needs phone and store_id for the conflict check
        const { data, error } = await supabase
            .from('clients')
            .upsert(client, {
                onConflict: 'phone,store_id',
                ignoreDuplicates: false
            })
            .select()
            .single()

        if (error) throw error
        return data as Client
    }
}
