'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Building2, Users, TrendingUp, Plus, Loader2, DollarSign, Calendar, BarChart3, PieChart, ArrowUpRight, UserX, CalendarX, Target, Zap, TrendingDown, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Modal } from '@/components/ui/Modal'
import { toast } from 'sonner'
import { adminService, type AdminGlobalMetrics, type StorePerformance } from '@/services/admin'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart as RePieChart, Pie, Legend } from 'recharts'

export default function AdminDashboard() {
    const { setSelectedStore } = useAuth()
    const router = useRouter()

    // State
    const [loading, setLoading] = useState(true)
    const [metrics, setMetrics] = useState<AdminGlobalMetrics | null>(null)
    const [storePerformance, setStorePerformance] = useState<StorePerformance[]>([])

    // Filters
    const [dateRange, setDateRange] = useState({
        start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
    })

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [creating, setCreating] = useState(false)
    const [newStoreData, setNewStoreData] = useState({
        name: '',
        slug: '',
        managerName: '',
        email: '',
        password: '',
        role: 'store_admin'
    })

    useEffect(() => {
        loadData()
    }, [dateRange])

    const loadData = async () => {
        setLoading(true)
        try {
            const [globalMetrics, performance] = await Promise.all([
                adminService.getGlobalMetrics(dateRange.start, dateRange.end),
                adminService.getStorePerformance(dateRange.start, dateRange.end)
            ])

            setMetrics(globalMetrics)
            setStorePerformance(performance)
        } catch (error) {
            console.error('Error loading admin dashboard:', error)
            toast.error('Erro ao carregar dados do painel')
        } finally {
            setLoading(false)
        }
    }

    const handleCreateStore = async (e: React.FormEvent) => {
        e.preventDefault()
        setCreating(true)

        try {
            const response = await fetch('/api/admin/stores/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storeName: newStoreData.name,
                    storeSlug: newStoreData.slug,
                    managerName: newStoreData.managerName,
                    email: newStoreData.email,
                    password: newStoreData.password,
                    role: newStoreData.role
                })
            })

            const data = await response.json()

            if (!response.ok) throw new Error(data.error || 'Erro ao criar loja')

            toast.success('Loja criada com sucesso!')
            setIsModalOpen(false)
            setNewStoreData({ name: '', slug: '', managerName: '', email: '', password: '', role: 'store_admin' })
            loadData() // Refresh
        } catch (error: any) {
            console.error(error)
            toast.error(error.message)
        } finally {
            setCreating(false)
        }
    }

    if (loading && !metrics) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-zaia-500" />
            </div>
        )
    }

    // Colors for Charts
    const COLORS = ['#8B5CF6', '#10B981', '#3B82F6', '#EC4899', '#F59E0B', '#6366F1']

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-10">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-display text-white">Command Center</h1>
                    <p className="text-slate-400">Visão estratégica consolidada de todas as unidades.</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Date Filter */}
                    <div className="flex items-center gap-2 bg-slate-900/50 p-1.5 rounded-lg border border-white/5">
                        <input
                            type="date"
                            className="bg-transparent text-white text-xs border-none focus:ring-0 [&::-webkit-calendar-picker-indicator]:invert p-1"
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        />
                        <span className="text-slate-500">-</span>
                        <input
                            type="date"
                            className="bg-transparent text-white text-xs border-none focus:ring-0 [&::-webkit-calendar-picker-indicator]:invert p-1"
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        />
                    </div>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="btn-primary flex items-center gap-2 text-sm px-4 py-2"
                    >
                        <Plus className="w-4 h-4" />
                        Nova Loja
                    </button>
                </div>
            </header>

            {/* Global KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Receita Global"
                    value={metrics?.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00'}
                    icon={DollarSign}
                    color="text-emerald-400"
                    bg="bg-emerald-500/10"
                />
                <MetricCard
                    title="Total de Agendamentos"
                    value={metrics?.totalAppointments || 0}
                    icon={Calendar}
                    color="text-blue-400"
                    bg="bg-blue-500/10"
                    subtext={`${metrics?.appointmentsByStatus.attended || 0} comparecimentos`}
                />
                <MetricCard
                    title="Lojas Ativas"
                    value={metrics?.activeStores || 0}
                    icon={Building2}
                    color="text-violet-400"
                    bg="bg-violet-500/10"
                />
                <MetricCard
                    title="Total Clientes"
                    value={metrics?.totalClients || 0}
                    icon={Users}
                    color="text-pink-400"
                    bg="bg-pink-500/10"
                />
                <MetricCard
                    title="Absenteísmo"
                    value={`${metrics ? ((metrics.appointmentsByStatus.missed / (metrics.appointmentsByStatus.attended + metrics.appointmentsByStatus.missed || 1)) * 100).toFixed(1) : 0}%`}
                    icon={UserX}
                    color="text-red-400"
                    bg="bg-red-500/10"
                    subtext={`${metrics?.appointmentsByStatus.missed || 0} faltas`}
                />
                <MetricCard
                    title="Conformidade"
                    value={`${metrics?.taskCompliance.toFixed(1) || 0}%`}
                    icon={CheckCircle2}
                    color="text-zaia-400"
                    bg="bg-zaia-500/10"
                    subtext="Tarefas executadas"
                />
                <MetricCard
                    title="Captação Leads"
                    value={`${metrics?.leadConversion.toFixed(1) || 0}%`}
                    icon={Target}
                    color="text-blue-400"
                    bg="bg-blue-500/10"
                    subtext="Conversão do Pipeline"
                />
            </div>

            {/* Main Graphs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue Trend - Area Chart */}
                <div className="glass-panel p-6 lg:col-span-3">
                    <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-zaia-400" />
                        Tendência de Faturamento Global
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={metrics?.revenueTrend}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="#64748b"
                                    fontSize={12}
                                    tickFormatter={(str) => {
                                        const d = new Date(str + 'T12:00:00')
                                        return format(d, 'dd/MM')
                                    }}
                                />
                                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(val) => `R$${val / 1000}k`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(val: any) => [Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 'Faturamento']}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Revenue by Store - Bar Chart */}
                <div className="glass-panel p-6 lg:col-span-2">
                    <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-zaia-400" />
                        Performance por Loja (Receita)
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={storePerformance} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                                <XAxis type="number" stroke="#64748b" fontSize={12} tickFormatter={(val) => `R$${val / 1000}k`} />
                                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} width={100} />
                                <Tooltip
                                    cursor={{ fill: '#ffffff05' }}
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(val: any) => {
                                        const value = Number(val);
                                        return !isNaN(value)
                                            ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                            : val;
                                    }}
                                />
                                <Bar dataKey="revenue" name="Receita" radius={[0, 4, 4, 0]}>
                                    {storePerformance.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Share of Appointments - Pie Chart */}
                <div className="glass-panel p-6">
                    <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                        <PieChart className="w-5 h-5 text-zaia-400" />
                        Volume por Loja
                    </h3>
                    <div className="h-[300px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                                <Pie
                                    data={storePerformance as any[]}
                                    dataKey="appointments"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                >
                                    {storePerformance.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Legend verticalAlign="bottom" height={36} />
                            </RePieChart>
                        </ResponsiveContainer>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none mb-4">
                            <span className="text-2xl font-bold text-white max-w-[100px] leading-none block">
                                {metrics?.totalAppointments}
                            </span>
                            <span className="text-xs text-slate-500 uppercase tracking-widest">Total</span>
                        </div>
                    </div>
                </div>

                {/* Elite Leaders - Ranking Global */}
                <div className="glass-panel p-6 lg:col-span-3">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Zap className="w-5 h-5 text-amber-400 shadow-sm" />
                            Elite Leaders (Ranking Global XP)
                        </h3>
                        <Link href="/tasks/ranking" className="text-xs text-zaia-400 hover:text-white transition-colors">Ver todos</Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {metrics?.topPerformers.map((performer, idx) => (
                            <div key={performer.id} className="relative group overflow-hidden p-4 rounded-xl bg-white/5 border border-white/5 hover:border-zaia-500/20 transition-all">
                                <div className="absolute top-0 right-0 p-2 opacity-10">
                                    <span className="text-3xl font-black italic">#{idx + 1}</span>
                                </div>
                                <div className="flex flex-col items-center text-center">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-zaia-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white mb-3 shadow-lg shadow-zaia-500/20">
                                        {performer.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <p className="text-sm font-bold text-white truncate w-full">{performer.name}</p>
                                    <p className="text-[10px] text-slate-500 uppercase mt-1">{performer.storeName}</p>
                                    <div className="mt-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-bold border border-amber-500/10">
                                        <Zap className="w-2.5 h-2.5" />
                                        {performer.xp} XP
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Store List / Manage Table */}
            <div className="glass-panel p-6 border-white/5">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-white">Gerenciamento de Unidades</h2>
                    <span className="text-xs text-slate-400 bg-white/5 px-2 py-1 rounded">
                        Ordenado por Receita
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="p-4 text-xs font-semibold uppercase text-slate-500">Loja</th>
                                <th className="p-4 text-xs font-semibold uppercase text-slate-500 text-right">Receita</th>
                                <th className="p-4 text-xs font-semibold uppercase text-slate-500 text-center">Agendamentos</th>
                                <th className="p-4 text-xs font-semibold uppercase text-slate-500 text-center">Conversão</th>
                                <th className="p-4 text-xs font-semibold uppercase text-slate-500 text-center text-red-400">Absenteísmo</th>
                                <th className="p-4 text-xs font-semibold uppercase text-slate-500 text-center text-orange-400">Cancelados</th>
                                <th className="p-4 text-xs font-semibold uppercase text-slate-500 text-right">Ticket Médio</th>
                                <th className="p-4 text-xs font-semibold uppercase text-slate-500 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {storePerformance.map(store => (
                                <tr key={store.id} className="group hover:bg-white/5 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-xs ring-1 ring-white/10">
                                                {store.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-200">{store.name}</p>
                                                <p className="text-xs text-slate-500 font-mono">{store.slug}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right font-medium text-emerald-400">
                                        {store.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </td>
                                    <td className="p-4 text-center text-slate-300">
                                        {store.appointments}
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${store.conversionRate >= 15 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                                            {store.conversionRate.toFixed(1)}%
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${store.missedRate > 20 ? 'bg-red-500/10 text-red-400' : 'bg-slate-700 text-slate-400'}`}>
                                            {store.missedRate.toFixed(1)}%
                                        </span>
                                    </td>
                                    <td className="p-4 text-center text-slate-400 text-xs">
                                        {store.cancelled}
                                    </td>
                                    <td className="p-4 text-right text-slate-300">
                                        {store.ticket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => {
                                                setSelectedStore({ id: store.id, name: store.name })
                                                router.push('/dashboard')
                                            }}
                                            className="text-xs text-zaia-400 hover:text-white font-medium px-3 py-1.5 rounded-full bg-zaia-500/10 hover:bg-zaia-500/50 transition-all flex items-center gap-1 ml-auto group-hover:translate-x-0 translate-x-2 opacity-0 group-hover:opacity-100"
                                        >
                                            Acessar
                                            <ArrowUpRight className="w-3 h-3" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Loja & Gerente">
                <form onSubmit={handleCreateStore} className="space-y-4">
                    {/* Reuse existing form inputs */}
                    <div className="space-y-4">
                        <div className="p-4 bg-slate-900/50 rounded-lg border border-white/5 space-y-4">
                            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-zaia-400" />
                                Dados da Unidade
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400 uppercase">Nome da Loja</label>
                                    <input
                                        className="input-field text-white"
                                        required
                                        value={newStoreData.name}
                                        onChange={e => setNewStoreData({ ...newStoreData, name: e.target.value })}
                                        placeholder="Ex: Ótica Centro"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400 uppercase">Slug (URL)</label>
                                    <input
                                        className="input-field text-white"
                                        value={newStoreData.slug}
                                        onChange={e => setNewStoreData({ ...newStoreData, slug: e.target.value })}
                                        placeholder="Automático se vazio"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-900/50 rounded-lg border border-white/5 space-y-4">
                            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                <Users className="w-4 h-4 text-zaia-400" />
                                Acesso do Usuário
                            </h3>
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400 uppercase">Nome do Usuário</label>
                                    <input
                                        className="input-field text-white"
                                        required
                                        value={newStoreData.managerName}
                                        onChange={e => setNewStoreData({ ...newStoreData, managerName: e.target.value })}
                                        placeholder="Nome completo"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400 uppercase">Permissão Inicial</label>
                                    <select
                                        className="input-field text-white bg-slate-900"
                                        value={newStoreData.role}
                                        onChange={e => setNewStoreData({ ...newStoreData, role: e.target.value })}
                                    >
                                        <option value="store_admin">Gerente (Admin da Loja)</option>
                                        <option value="staff">Funcionário (Staff)</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-400 uppercase">Email</label>
                                        <input
                                            type="email"
                                            className="input-field text-white"
                                            required
                                            value={newStoreData.email}
                                            onChange={e => setNewStoreData({ ...newStoreData, email: e.target.value })}
                                            placeholder="gerente@loja.com"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-400 uppercase">Senha</label>
                                        <input
                                            type="text"
                                            className="input-field text-white"
                                            required
                                            minLength={6}
                                            value={newStoreData.password}
                                            onChange={e => setNewStoreData({ ...newStoreData, password: e.target.value })}
                                            placeholder="Mínimo 6 dígitos"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={creating}
                            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {creating ? 'Processando...' : 'Criar Unidade'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}

function MetricCard({ title, value, icon: Icon, color, bg, subtext }: any) {
    return (
        <div className="glass-card p-5 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300 border border-white/5">
            <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity`}>
                <Icon className="w-24 h-24" />
            </div>
            <div className="relative z-10 w-full">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${bg} ${color}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{title}</p>
                    <p className="text-2xl font-bold text-white mt-1 truncate" title={String(value)}>{value}</p>
                    {subtext && (
                        <p className="text-xs text-slate-500 mt-1">{subtext}</p>
                    )}
                </div>
            </div>
        </div>
    )
}
