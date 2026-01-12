import { createClient } from '@/lib/supabase/client'

export interface Notification {
    id: string
    user_id: string
    store_id: string
    title: string
    message: string
    type: 'info' | 'success' | 'warning' | 'error'
    link?: string
    read_at?: string
    created_at: string
}

export const notificationService = {
    async getUnread(userId: string) {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .is('read_at', null)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data as Notification[]
    },

    async markAsRead(notificationId: string) {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('notifications')
            .update({ read_at: new Date().toISOString() })
            .eq('id', notificationId)
            .select()
            .single()

        if (error) throw error
        return data as Notification
    },

    async markAllAsRead(userId: string) {
        const supabase = createClient()
        const { error } = await supabase
            .from('notifications')
            .update({ read_at: new Date().toISOString() })
            .eq('user_id', userId)
            .is('read_at', null)

        if (error) throw error
    },

    async create(notification: Omit<Notification, 'id' | 'created_at' | 'read_at'>) {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('notifications')
            .insert([notification])
            .select()
            .single()

        if (error) throw error
        return data as Notification
    }
}
