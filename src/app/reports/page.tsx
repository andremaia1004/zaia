'use client'
import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { appointmentService } from '@/services/appointments'
import { type Appointment } from '@/services/types'
import { DollarSign, TrendingUp, Calendar, ShoppingBag } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export default function ReportsPage() {
    const { selectedStore } = useAuth()
    const [dateRange, setDateRange] = useState({
        start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
    })
    const [loading, setLoading] = useState(true)
    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [metrics, setMetrics] = useState({
        totalRevenue: 0,
        totalSales: 0,
        averageTicket: 0,
        conversionRate: 0
    })

    useEffect(() => {
        fetchData()
    }, [dateRange, selectedStore])

    const fetchData = async () => {
        setLoading(true)
        try {
            const data = await appointmentService.getByDateRange(dateRange.start, dateRange.end, selectedStore?.id)
            setAppointments(data)
            calculateMetrics(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const calculateMetrics = (data: Appointment[]) => {
        const sales = data.filter(a => a.result === 'COMPROU')
        const attended = data.filter(a => a.status === 'COMPARECEU' || a.result === 'COMPROU' || a.result === 'NAO_COMPROU')

        const totalRevenue = sales.reduce((acc, curr) => acc + (curr.value || 0), 0)
        const totalSales = sales.length
        const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0
        const conversionRate = attended.length > 0 ? (totalSales / attended.length) * 100 : 0

        setMetrics({
            totalRevenue,
            totalSales,
            averageTicket,
            conversionRate
        })
    }

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold font-display text-white">Relatórios Financeiros</h1>

                <div className="flex items-center gap-2 bg-slate-800/50 p-2 rounded-lg border border-white/5">
                    <div className="relative">
                        <input
                            type="date"
                            className="bg-transparent text-white text-sm border-none focus:ring-0 [&::-webkit-calendar-picker-indicator]:invert"
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        />
                    </div>
                    <span className="text-slate-500">-</span>
                    <div className="relative">
                        <input
                            type="date"
                            className="bg-transparent text-white text-sm border-none focus:ring-0 [&::-webkit-calendar-picker-indicator]:invert"
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        />
                    </div>
                </div>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Receita Total"
                    value={metrics.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    icon={DollarSign}
                    color="text-emerald-400"
                    bg="bg-emerald-500/10"
                />
                <MetricCard
                    title="Vendas Realizadas"
                    value={metrics.totalSales}
                    icon={ShoppingBag}
                    color="text-blue-400"
                    bg="bg-blue-500/10"
                />
                <MetricCard
                    title="Ticket Médio"
                    value={metrics.averageTicket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    icon={TrendingUp}
                    color="text-violet-400"
                    bg="bg-violet-500/10"
                />
                <MetricCard
                    title="Conversão (Vendas/Atendimentos)"
                    value={`${metrics.conversionRate.toFixed(1)}%`}
                    icon={TrendingUp}
                    color="text-pink-400"
                    bg="bg-pink-500/10"
                />
            </div>

            {/* Transactions Table */}
            <div className="glass-panel p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Detalhamento de Vendas</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-sm text-slate-400 border-b border-white/10">
                                <th className="pb-3 pl-4">Data</th>
                                <th className="pb-3">Cliente</th>
                                <th className="pb-3">Profissional</th>
                                <th className="pb-3">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {appointments.filter(a => a.result === 'COMPROU').length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-8 text-center text-slate-500">
                                        Nenhuma venda registrada no período.
                                    </td>
                                </tr>
                            ) : (
                                appointments
                                    .filter(a => a.result === 'COMPROU')
                                    .map(a => (
                                        <tr key={a.id} className="hover:bg-white/5 transition-colors">
                                            <td className="py-3 pl-4 text-slate-300">
                                                {format(new Date(a.date), 'dd/MM/yyyy')}
                                            </td>
                                            <td className="py-3 text-white font-medium">{a.client?.name}</td>
                                            <td className="py-3 text-slate-400">{a.professional?.name}</td>
                                            <td className="py-3 text-emerald-400 font-mono">
                                                {(a.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </td>
                                        </tr>
                                    ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

function MetricCard({ title, value, icon: Icon, color, bg }: any) {
    return (
        <div className="glass-card p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg} ${color}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <p className="text-slate-400 text-sm">{title}</p>
                <p className="text-2xl font-bold text-white">{value}</p>
            </div>
        </div>
    )
}
