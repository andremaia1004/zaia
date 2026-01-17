'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { appointmentService } from '@/services/appointments'
import { tasksService } from '@/services/tasks'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { TrendingUp, Users, CalendarCheck, CalendarX, DollarSign, Wallet, CheckCircle2, Trophy, ArrowRight } from 'lucide-react'
import { clsx } from 'clsx'
import { startOfMonth, endOfMonth, format, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

export default function DashboardPage() {
    const { selectedStore, profile } = useAuth()
    const [metrics, setMetrics] = useState({
        scheduled: 0,
        attended: 0,
        missed: 0,
        sales: 0,
        conversion: 0,
        revenue: 0,
        averageTicket: 0,
        attendanceRate: 0,
        taskCompletion: 0,
        totalTasks: 0,
        completedTasks: 0,
    })
    const [topRanking, setTopRanking] = useState<any[]>([])
    const [nextAppointments, setNextAppointments] = useState<any[]>([])
    const [dailyData, setDailyData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const [dateRange, setDateRange] = useState({
        start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
    })

    useEffect(() => {
        fetchMetrics()
    }, [dateRange, selectedStore, profile])

    const fetchMetrics = async () => {
        setLoading(true)
        const { start, end } = dateRange
        const supabase = createClient()

        try {
            const targetStoreId = selectedStore?.id || profile?.store_id
            if (!targetStoreId) return

            // 1. Fetch Consolidated Data via RPC (Fastest way)
            const { data: rpcData, error: rpcError } = await supabase.rpc('get_dashboard_metrics', {
                p_store_id: targetStoreId,
                p_start_date: start,
                p_end_date: end
            })

            if (rpcError) throw rpcError

            const { metrics: dbMetrics, ranking } = rpcData

            // 2. Fetch Detailed Appointment List (for charts and upcoming)
            const appointments = await appointmentService.getByDateRange(start, end, targetStoreId)

            // 3. Process KPIs
            const finished = dbMetrics.attended + dbMetrics.missed
            const attendanceRate = finished > 0 ? (dbMetrics.attended / finished) * 100 : 0
            const conversion = dbMetrics.attended > 0 ? (dbMetrics.sales / dbMetrics.attended) * 100 : 0
            const averageTicket = dbMetrics.sales > 0 ? dbMetrics.revenue / dbMetrics.sales : 0

            setMetrics({
                ...dbMetrics,
                averageTicket,
                attendanceRate,
                conversion,
                taskCompletion: dbMetrics.totalTasks > 0 ? (dbMetrics.completedTasks / dbMetrics.totalTasks) * 100 : 0
            })

            // 4. Prepare Chart Data (Daily Activity)
            const daysInInterval = eachDayOfInterval({
                start: new Date(start + 'T12:00:00'),
                end: new Date(end + 'T12:00:00')
            })

            const daysMap = daysInInterval.map(d => ({
                name: format(d, 'dd'),
                fullDate: format(d, 'dd/MM'),
                date: format(d, 'yyyy-MM-dd'),
                appointments: 0,
                revenue: 0
            }))

            appointments.forEach(app => {
                const dayEntry = daysMap.find(d => d.date === app.date)
                if (dayEntry) {
                    dayEntry.appointments += 1
                    if (app.result === 'COMPROU') {
                        dayEntry.revenue += (Number(app.value) || 0)
                    }
                }
            })
            setDailyData(daysMap)

            // 5. Next Appointments (Upcoming)
            const today = new Date().toISOString().split('T')[0]
            const upcoming = appointments
                .filter(a => a.status === 'AGENDADO' && a.date >= today)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .slice(0, 5)
            setNextAppointments(upcoming)

            // 6. Set Ranking from RPC
            setTopRanking(ranking)

        } catch (error) {
            console.error("Failed to fetch dashboard data", error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="text-white">Carregando dashboard...</div>

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold font-display text-white">Dashboard de Performance</h1>

                {/* Date Filter */}
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
            </div>

            {/* Main KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Receita do Mês"
                    value={`R$ ${metrics.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    icon={DollarSign}
                    color="text-emerald-400"
                    bg="bg-emerald-500/10"
                    trend="vs mês anterior"
                />
                <MetricCard
                    title="Ticket Médio"
                    value={`R$ ${metrics.averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    icon={Wallet}
                    color="text-violet-400"
                    bg="bg-violet-500/10"
                />
                <MetricCard
                    title="Conversão Real"
                    value={`${metrics.conversion.toFixed(1)}%`}
                    icon={TrendingUp}
                    color="text-pink-400"
                    bg="bg-pink-500/10"
                />
                <MetricCard
                    title="Comparecimento"
                    value={`${metrics.attendanceRate.toFixed(1)}%`}
                    icon={Users}
                    color="text-blue-400"
                    bg="bg-blue-500/10"
                />
                <MetricCard
                    title="Tarefas Concluídas"
                    value={`${metrics.completedTasks}/${metrics.totalTasks}`}
                    icon={CheckCircle2}
                    color="text-amber-400"
                    bg="bg-amber-500/10"
                    trend={`${metrics.taskCompletion.toFixed(0)}% de sucesso`}
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Daily Activity Chart */}
                <div className="glass-panel p-6 lg:col-span-2">
                    <h3 className="text-lg font-semibold text-white mb-6">Performance no Período</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dailyData}>
                                <defs>
                                    <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                <XAxis
                                    dataKey="name"
                                    stroke="#64748b"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    interval={2} // Show every 3rd day to avoid crowding
                                />
                                <YAxis yAxisId="left" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val: number) => `R$${val}`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                    labelFormatter={(label, payload) => payload[0]?.payload.fullDate || label}
                                />
                                <Area yAxisId="left" type="monotone" dataKey="appointments" name="Agendamentos" stroke="#8B5CF6" fillOpacity={1} fill="url(#colorApps)" strokeWidth={3} />
                                <Area yAxisId="right" type="monotone" dataKey="revenue" name="Receita" stroke="#10B981" fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Secondary Stats / Funnel */}
                <div className="space-y-6">
                    <div className="glass-panel p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Funil do Mês</h3>
                        <div className="space-y-4">
                            <FunnelItem label="Agendados" value={metrics.scheduled} total={metrics.scheduled} color="bg-blue-500" />
                            <FunnelItem label="Compareceram" value={metrics.attended} total={metrics.scheduled} color="bg-violet-500" />
                            <FunnelItem label="Vendas" value={metrics.sales} total={metrics.scheduled} color="bg-emerald-500" />
                        </div>
                    </div>

                    <div className="glass-panel p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">Top Performance</h3>
                            <Trophy className="w-5 h-5 text-amber-400" />
                        </div>
                        {topRanking.length === 0 ? (
                            <p className="text-slate-500 text-sm">Nenhum dado de ranking para este período.</p>
                        ) : (
                            <div className="space-y-4">
                                {topRanking.map((rank, index) => (
                                    <div key={rank.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={clsx(
                                                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                                                index === 0 ? "bg-amber-500 text-amber-950" :
                                                    index === 1 ? "bg-slate-300 text-slate-900" :
                                                        "bg-amber-700 text-amber-100"
                                            )}>
                                                {index + 1}
                                            </div>
                                            <span className="text-sm font-medium text-slate-200">{rank.name}</span>
                                        </div>
                                        <span className="text-xs font-bold text-zaia-400">{rank.score} XP</span>
                                    </div>
                                ))}
                                <Link href="/tasks/ranking" className="flex items-center justify-center gap-2 text-xs text-zaia-400 hover:text-zaia-300 transition-colors pt-2 border-t border-white/5">
                                    Ver ranking completo <ArrowRight className="w-3 h-3" />
                                </Link>
                            </div>
                        )}
                    </div>

                    <div className="glass-panel p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Próximos Agendamentos</h3>
                        {nextAppointments.length === 0 ? (
                            <p className="text-slate-500 text-sm">Nenhum agendamento futuro encontrado para esta semana.</p>
                        ) : (
                            <div className="space-y-3">
                                {nextAppointments.map(app => (
                                    <div key={app.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-white/5 hover:bg-slate-800 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-zaia-500/20 flex items-center justify-center text-zaia-300 font-bold text-xs">
                                                {app.client?.name?.charAt(0) || '?'}
                                            </div>
                                            <div>
                                                <p className="font-medium text-white text-sm">{app.client?.name}</p>
                                                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                                    <span>{format(new Date(app.date + 'T12:00:00'), 'dd/MM')}</span>
                                                    <span>•</span>
                                                    <span>{app.professional?.name?.split(' ')[0]}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

function MetricCard({ title, value, icon: Icon, color, bg, trend }: any) {
    return (
        <div className="glass-card p-5 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
            <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity`}>
                <Icon className="w-24 h-24" />
            </div>
            <div className="relative z-10">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${bg} ${color}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <p className="text-slate-400 text-sm font-medium">{title}</p>
                <p className="text-2xl font-bold text-white mt-1">{value}</p>
                {trend && (
                    <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {trend}
                    </p>
                )}
            </div>
        </div>
    )
}

function FunnelItem({ label, value, total, color }: any) {
    const percentage = total > 0 ? (value / total) * 100 : 0
    return (
        <div>
            <div className="flex justify-between text-sm mb-1.5">
                <span className="text-slate-300">{label}</span>
                <span className="text-white font-bold">{value} <span className="text-slate-500 text-xs font-normal">({percentage.toFixed(0)}%)</span></span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                    className={`h-full ${color} transition-all duration-1000 ease-out`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    )
}
