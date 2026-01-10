import { createClient } from '@/lib/supabase/client'

export type TaskStatus = 'PENDENTE' | 'FEITA' | 'ADIADA' | 'ATRASA';

export interface TaskOccurrence {
    id: string
    title: string
    date: string
    status: TaskStatus
    current_value: number
    target_value: number
    postponed_to?: string
    postponed_reason?: string
    proof_url?: string
    staff_id: string
    store_id: string
}

export const tasksService = {
    async getOccurrencesByStaff(staffId: string, startDate: string, endDate: string) {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('task_occurrences')
            .select('*')
            .eq('staff_id', staffId)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: true })

        if (error) throw error
        return data as TaskOccurrence[]
    },

    async updateOccurrence(id: string, updates: Partial<TaskOccurrence>) {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('task_occurrences')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data as TaskOccurrence
    },

    async incrementCounter(id: string, currentValue: number, targetValue: number) {
        const newValue = currentValue + 1
        const updates: Partial<TaskOccurrence> = { current_value: newValue }

        if (newValue >= targetValue) {
            updates.status = 'FEITA'
        }

        return this.updateOccurrence(id, updates)
    },

    async postponeTask(id: string, newDate: string, reason?: string) {
        return this.updateOccurrence(id, {
            status: 'ADIADA',
            postponed_to: newDate,
            postponed_reason: reason
        })
    },

    async getTemplates() {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('task_templates')
            .select('*')
            .order('title')

        if (error) throw error
        return data
    },

    async createOccurrence(occurrence: Omit<TaskOccurrence, 'id'>) {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('task_occurrences')
            .insert(occurrence)
            .select()
            .single()

        if (error) throw error
        return data as TaskOccurrence
    }
}
