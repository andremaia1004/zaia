
import { createClient } from '@/lib/supabase/client'
import type { Professional } from './types'

export const professionalService = {
    async getAllActive(storeId?: string) {
        const supabase = createClient()
        let query = supabase
            .from('professionals')
            .select('*')
            .eq('active', true)
            .order('name')

        if (storeId) {
            // Fetch records for the specific store OR global records (store_id IS NULL)
            query = query.or(`store_id.eq.${storeId},store_id.is.null`)
        }

        const { data, error } = await query
        if (error) return []
        return data as Professional[]
    },

    async findByName(name: string) {
        const supabase = createClient()
        const { data } = await supabase
            .from('professionals')
            .select('*')
            .ilike('name', name)
            .single()
        return data as Professional | null
    },

    async create(professional: Partial<Professional>) {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('professionals')
            .insert(professional)
            .select()
            .single()

        if (error) throw error
        return data as Professional
    },

    async update(id: string, updates: Partial<Professional>) {
        const supabase = createClient()
        const { error } = await supabase
            .from('professionals')
            .update(updates)
            .eq('id', id)

        if (error) throw error
    }
}
