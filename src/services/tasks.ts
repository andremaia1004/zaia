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
    proof_description?: string
    due_at?: string // ISO string
    staff_id: string
    store_id: string
    requires_proof?: boolean
    default_due_time?: string
    xp_reward: number
    task_templates?: {
        title: string
        recurrence: string
        default_due_time: string
    }
}

export interface TaskTemplate {
    id: string
    title: string
    description?: string
    recurrence: 'daily' | 'weekly' | 'monthly' | 'once'
    target_value: number
    requires_proof: boolean
    default_due_time?: string
    created_at?: string
    active: boolean
    xp_reward: number
    deadline_days?: number
}

export const tasksService = {
    async getOccurrencesByStaff(staffId: string, startDate: string, endDate: string) {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('task_occurrences')
            .select(`
                *,
                assignment:assignment_id(
                    template:template_id(requires_proof, default_due_time)
                )
            `)
            .eq('staff_id', staffId)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: true })

        if (error) throw error

        return (data as any[]).map(occ => ({
            ...occ,
            requires_proof: occ.assignment?.template?.requires_proof || false,
            default_due_time: occ.assignment?.template?.default_due_time
        })) as TaskOccurrence[]
    },

    async getBacklogByStaff(staffId: string, beforeDate: string) {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('task_occurrences')
            .select(`
                *,
                assignment:assignment_id(
                    template:template_id(requires_proof, default_due_time)
                )
            `)
            .eq('staff_id', staffId)
            .lt('date', beforeDate)
            .in('status', ['PENDENTE', 'ATRASA'])
            .order('date', { ascending: false })
            .limit(50)

        if (error) throw error

        return (data as any[]).map(occ => ({
            ...occ,
            requires_proof: occ.assignment?.template?.requires_proof || false,
            default_due_time: occ.assignment?.template?.default_due_time
        })) as TaskOccurrence[]
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
    },

    async createTemplate(template: any) {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('task_templates')
            .insert(template)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async deleteTemplate(id: string) {
        const supabase = createClient()
        const { error } = await supabase
            .from('task_templates')
            .delete()
            .eq('id', id)

        if (error) throw error
    },

    async deleteAssignment(id: string) {
        const supabase = createClient()
        const { error } = await supabase
            .from('task_assignments')
            .delete()
            .eq('id', id)

        if (error) throw error
    }
}
