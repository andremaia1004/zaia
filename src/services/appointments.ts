
import { createClient } from '@/lib/supabase/client'
import type { Appointment } from './types'

export const appointmentService = {
    async getByDateRange(startDate: string, endDate: string, storeId?: string) {
        const supabase = createClient()

        let query = supabase
            .from('appointments')
            .select(`
                *,
                client:clients(name, phone, email),
                professional:professionals(name)
            `)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: true })

        if (storeId) {
            query = query.eq('store_id', storeId)
        }

        const { data, error } = await query

        if (error) {
            console.error('Error fetching appointments:', error)
            return []
        }
        return data as Appointment[]
    },

    async getByClientId(clientId: string) {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('appointments')
            .select(`
                *,
                professional:professionals(name)
            `)
            .eq('client_id', clientId)
            .order('date', { ascending: false })

        if (error) {
            console.error('Error fetching client history:', error)
            return []
        }
        return data as Appointment[]
    },

    async create(appointment: Partial<Appointment>) {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('appointments')
            .insert(appointment)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async updateStatus(id: string, status: string, result?: string) {
        const supabase = createClient()
        const updates: any = { status }
        if (result) updates.result = result

        const { error } = await supabase
            .from('appointments')
            .update(updates)
            .eq('id', id)

        if (error) throw error
    },

    async update(id: string, updates: Partial<Appointment>) {
        const supabase = createClient()
        const { error } = await supabase
            .from('appointments')
            .update(updates)
            .eq('id', id)

        if (error) throw error
    },

    async delete(id: string) {
        const supabase = createClient()
        const { error } = await supabase
            .from('appointments')
            .delete()
            .eq('id', id)

        if (error) throw error
    }
}
