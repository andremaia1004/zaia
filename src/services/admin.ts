import { createClient } from '@/lib/supabase/client'

export interface AdminGlobalMetrics {
    totalRevenue: number
    totalAppointments: number
    totalClients: number
    activeStores: number
    taskCompliance: number
    leadConversion: number
    appointmentsByStatus: {
        scheduled: number
        attended: number
        missed: number
        cancelled: number
    }
    revenueTrend: { date: string, revenue: number }[]
    topPerformers: { id: string, name: string, storeName: string, xp: number }[]
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

        // 3. Appointments Data
        const { data: appointments } = await supabase
            .from('appointments')
            .select('date, status, result, value, store_id')
            .gte('date', startDate)
            .lte('date', endDate)

        // 4. Tasks Data (for Compliance)
        const { data: tasks } = await supabase
            .from('task_occurrences')
            .select('status, xp_reward, staff_id, store_id')
            .gte('date', startDate)
            .lte('date', endDate)

        // 5. Leads Data (for Conversion)
        const { data: leads } = await supabase
            .from('leads')
            .select('status')
            .gte('created_at', startDate)
            .lte('created_at', `${endDate}T23:59:59`)

        // 6. Profiles & Stores (for Top Performers names)
        const { data: profiles } = await supabase.from('profiles').select('id, name')
        const { data: stores } = await supabase.from('stores').select('id, name')

        // Process Metrics
        const apps = appointments || []
        const taskList = tasks || []
        const leadList = leads || []

        // Status Counts & Revenue Trend
        const revenueMap = new Map<string, number>()
        const stats = apps.reduce((acc, curr) => {
            if (curr.status === 'AGENDADO') acc.scheduled++
            if (curr.status === 'COMPARECEU') acc.attended++
            if (curr.status === 'FALTOU') acc.missed++
            if (curr.status === 'CANCELADO') acc.cancelled++

            if (curr.result === 'COMPROU') {
                const val = Number(curr.value) || 0
                acc.revenue += val
                revenueMap.set(curr.date, (revenueMap.get(curr.date) || 0) + val)
            }
            acc.total++
            return acc
        }, { scheduled: 0, attended: 0, missed: 0, cancelled: 0, revenue: 0, total: 0 })

        // Revenue Trend Formatting
        const revenueTrend = Array.from(revenueMap.entries())
            .map(([date, revenue]) => ({ date, revenue }))
            .sort((a, b) => a.date.localeCompare(b.date))

        // Task Compliance
        const doneTasks = taskList.filter(t => t.status === 'FEITA').length
        const taskCompliance = taskList.length > 0 ? (doneTasks / taskList.length) * 100 : 0

        // Lead Conversion
        const convertedLeads = leadList.filter(l => ['AGENDADO', 'QUALIFICADO', 'COMPARECEU', 'COMPROU'].includes(l.status.toUpperCase())).length
        const leadConversion = leadList.length > 0 ? (convertedLeads / leadList.length) * 100 : 0

        // Top Performers (XP)
        const xpMap = new Map<string, { xp: number, storeId: string }>()
        taskList.forEach(t => {
            if (t.status === 'FEITA' && t.staff_id) {
                const current = xpMap.get(t.staff_id) || { xp: 0, storeId: t.store_id }
                xpMap.set(t.staff_id, { xp: current.xp + (Number(t.xp_reward) || 10), storeId: t.store_id })
            }
        })

        const topPerformers = Array.from(xpMap.entries())
            .map(([id, data]) => ({
                id,
                name: profiles?.find(p => p.id === id)?.name || 'Desconhecido',
                storeName: stores?.find(s => s.id === data.storeId)?.name || 'Loja',
                xp: data.xp
            }))
            .sort((a, b) => b.xp - a.xp)
            .slice(0, 5)

        return {
            totalRevenue: stats.revenue,
            totalAppointments: stats.total,
            totalClients: totalClients || 0,
            activeStores: activeStores || 0,
            taskCompliance,
            leadConversion,
            appointmentsByStatus: {
                scheduled: stats.scheduled,
                attended: stats.attended,
                missed: stats.missed,
                cancelled: stats.cancelled
            },
            revenueTrend,
            topPerformers
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
