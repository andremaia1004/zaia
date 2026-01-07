import { createClient } from '@/lib/supabase/client'

export interface AdminGlobalMetrics {
    totalRevenue: number
    totalAppointments: number
    totalClients: number
    activeStores: number
    appointmentsByStatus: {
        scheduled: number
        attended: number
        missed: number
        cancelled: number
    }
}

export interface StorePerformance {
    id: string
    name: string
    slug: string
    revenue: number
    appointments: number
    conversionRate: number
    ticket: number
    missed: number
    missedRate: number
    cancelled: number
}

export const adminService = {
    async getGlobalMetrics(startDate: string, endDate: string) {
        const supabase = createClient()

        // 1. Stores Count
        const { count: activeStores } = await supabase
            .from('stores')
            .select('*', { count: 'exact', head: true })

        // 2. Clients Count (Global)
        const { count: totalClients } = await supabase
            .from('clients')
            .select('*', { count: 'exact', head: true })

        // 3. Appointments & Revenue within Range
        const { data: appointments, error } = await supabase
            .from('appointments')
            .select('status, result, value')
            .gte('date', startDate)
            .lte('date', endDate)

        if (error) {
            console.error('Error fetching global metrics:', error)
            return null
        }

        const stats = appointments.reduce((acc, curr) => {
            // Status Counts
            if (curr.status === 'AGENDADO') acc.scheduled++
            if (curr.status === 'COMPARECEU') acc.attended++
            if (curr.status === 'FALTOU') acc.missed++
            if (curr.status === 'CANCELADO') acc.cancelled++

            // Revenue from Sales
            if (curr.result === 'COMPROU') {
                acc.revenue += Number(curr.value) || 0
            }

            acc.total++
            return acc
        }, {
            scheduled: 0,
            attended: 0,
            missed: 0,
            cancelled: 0,
            revenue: 0,
            total: 0
        })

        return {
            totalRevenue: stats.revenue,
            totalAppointments: stats.total,
            totalClients: totalClients || 0,
            activeStores: activeStores || 0,
            appointmentsByStatus: {
                scheduled: stats.scheduled,
                attended: stats.attended,
                missed: stats.missed,
                cancelled: stats.cancelled
            }
        } as AdminGlobalMetrics
    },

    async getStorePerformance(startDate: string, endDate: string) {
        const supabase = createClient()

        // Get all stores
        const { data: stores } = await supabase
            .from('stores')
            .select('id, name, slug')
            .order('name')

        if (!stores) return []

        // Get appointments for period
        const { data: appointments } = await supabase
            .from('appointments')
            .select('store_id, status, result, value')
            .gte('date', startDate)
            .lte('date', endDate)

        if (!appointments) return []

        // Aggregate per store
        const performance: StorePerformance[] = stores.map(store => {
            const storeApps = appointments.filter(a => a.store_id === store.id)

            const attended = storeApps.filter(a => a.status === 'COMPARECEU').length
            const missed = storeApps.filter(a => a.status === 'FALTOU').length
            const cancelled = storeApps.filter(a => a.status === 'CANCELADO').length

            const finished = attended + missed
            const sales = storeApps.filter(a => a.result === 'COMPROU')
            const revenue = sales.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0)
            const salesCount = sales.length

            return {
                id: store.id,
                name: store.name,
                slug: store.slug,
                revenue,
                appointments: storeApps.length,
                conversionRate: attended > 0 ? (salesCount / attended) * 100 : 0,
                ticket: salesCount > 0 ? revenue / salesCount : 0,
                missed,
                missedRate: finished > 0 ? (missed / finished) * 100 : 0,
                cancelled
            }
        })

        // Sort by Revenue desc
        return performance.sort((a, b) => b.revenue - a.revenue)
    }
}
