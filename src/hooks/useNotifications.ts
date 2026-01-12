import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { notificationService, Notification } from '@/services/notifications'
import { createClient } from '@/lib/supabase/client'

export function useNotifications() {
    const { profile } = useAuth()
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(true)

    const fetchNotifications = useCallback(async () => {
        if (!profile?.id) return
        try {
            const data = await notificationService.getUnread(profile.id)
            setNotifications(data)
            setUnreadCount(data.length)
        } catch (error) {
            console.error('Error fetching notifications:', error)
        } finally {
            setLoading(false)
        }
    }, [profile?.id])

    useEffect(() => {
        fetchNotifications()

        if (!profile?.id) return

        const supabase = createClient()

        // Subscribe to NEW notifications
        const channel = supabase
            .channel(`notifications-${profile.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${profile.id}`
                },
                (payload) => {
                    setNotifications(prev => [payload.new as Notification, ...prev])
                    setUnreadCount(prev => prev + 1)
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${profile.id}`
                },
                (payload) => {
                    const updated = payload.new as Notification
                    if (updated.read_at) {
                        setNotifications(prev => prev.filter(n => n.id !== updated.id))
                        setUnreadCount(prev => Math.max(0, prev - 1))
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [profile?.id, fetchNotifications])

    const markAsRead = async (id: string) => {
        try {
            await notificationService.markAsRead(id)
            // State will be updated by the subscription or manually if subscription fails
        } catch (error) {
            console.error('Error marking notification as read:', error)
        }
    }

    return {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        refresh: fetchNotifications
    }
}
