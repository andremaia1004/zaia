
import { createClient } from '@/lib/supabase/client'
import type { Lead } from './types'

export const leadService = {
    async getAll(storeId?: string) {
        const supabase = createClient()
        let query = supabase
            .from('leads')
            .select('*, client:clients(name, phone, email)')
            .order('created_at', { ascending: false })

        if (storeId) {
            query = query.eq('store_id', storeId)
        }

        const { data } = await query
        return data as Lead[]
    },

    async updateStatus(id: string, status: string) {
        const supabase = createClient()
        const { error } = await supabase
            .from('leads')
            .update({ status })
            .eq('id', id)

        if (error) throw error
    },

    async update(id: string, updates: Partial<Lead>) {
        const supabase = createClient()
        const { error } = await supabase
            .from('leads')
            .update(updates)
            .eq('id', id)

        if (error) throw error
    },

    async create(lead: Partial<Lead>) {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('leads')
            .insert(lead)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async delete(id: string) {
        const supabase = createClient()
        const { error } = await supabase
            .from('leads')
            .delete()
            .eq('id', id)

        if (error) throw error
    }
}
