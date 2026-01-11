'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { TrendingUp, Trophy, Award, Target, Hash, Percent, DollarSign, Store, User, Calendar, ChevronLeft, ChevronRight, Zap } from 'lucide-react'
import { clsx } from 'clsx'
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks, isSameWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function RankingPage() {
    const { profile, selectedStore } = useAuth()
    const [scores, setScores] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [view, setView] = useState<'general' | 'store'>('general')
    const [selectedDate, setSelectedDate] = useState(new Date())

    const currentWeekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
    const isCurrentWeek = isSameWeek(selectedDate, new Date(), { weekStartsOn: 1 })

    useEffect(() => {
        fetchScores()
    }, [selectedDate, profile, selectedStore])

    const fetchScores = async () => {
        try {
            setLoading(true)
            const supabase = createClient()

            let query = supabase
                .from('weekly_scores')
                .select('*, profiles:staff_id(name), stores(name)')
                .eq('week_start_date', format(currentWeekStart, 'yyyy-MM-dd'))
                .order('execution_rate', { ascending: false })

            if (selectedStore?.id) {
                query = query.eq('store_id', selectedStore.id)
            } else if (profile?.role === 'store_admin') {
                query = query.eq('store_id', profile.store_id)
            }

            const { data, error } = await query

            if (error) throw error
            setScores(data || [])
        } catch (error) {
            console.error('Error fetching scores:', error)
        } finally {
            setLoading(false)
        }
    }

    const previousWeek = () => setSelectedDate(subWeeks(selectedDate, 1))
    const nextWeek = () => setSelectedDate(addWeeks(selectedDate, 1))

    if (loading) return <div className="p-8 text-slate-400">Calculando ranking...</div>

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Trophy className="w-8 h-8 text-amber-500 dark:text-amber-400" />
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Ranking de Performance</h1>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">Classificação semanal baseada na execução das metas.</p>
                </div>

                <div className="flex items-center gap-4 bg-white/50 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/5">
                    <button onClick={previousWeek} className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors">
                        <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </button>
                    <div className="text-sm font-medium text-slate-900 dark:text-white min-w-[140px] text-center">
                        <span className="block text-xs text-slate-500 uppercase">Semana de</span>
                        {format(currentWeekStart, 'dd/MM/yyyy')}
                    </div>
                    <button
                        onClick={nextWeek}
                        disabled={isCurrentWeek}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:pointer-events-none"
                    >
                        <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="glass-panel p-6 border border-zaia-500/20 bg-zaia-500/5 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-zaia-500/10 dark:bg-zaia-500/20 rounded-lg"><Target className="w-5 h-5 text-zaia-600 dark:text-zaia-400" /></div>
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Média Global</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-900 dark:text-white">
                        {scores.length > 0 ? (scores.reduce((acc, s) => acc + Number(s.execution_rate), 0) / scores.length).toFixed(1) : 0}%
                    </div>
                </div>
                <div className="glass-panel p-6 border border-emerald-500/20 bg-emerald-500/5 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-lg"><Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /></div>
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bônus Atingidos</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-900 dark:text-white">
                        {scores.filter(s => s.met_bonus).length} <span className="text-sm font-normal text-slate-500 dark:text-slate-500 ml-2">colaboradores</span>
                    </div>
                </div>
                <div className="glass-panel p-6 border border-amber-500/20 bg-amber-500/5 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-amber-500/10 dark:bg-amber-500/20 rounded-lg"><Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" /></div>
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">XP Total</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-900 dark:text-white">
                        {scores.reduce((acc, s) => acc + Number(s.total_xp || 0), 0).toLocaleString('pt-BR')} <span className="text-sm font-normal text-slate-500 dark:text-slate-500 ml-2">XP</span>
                    </div>
                </div>
            </div>

            <div className="glass-panel border border-white/5 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white/5">
                            <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase w-16">Pos</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Colaborador</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Loja</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase text-center">Execução</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase text-center">Tarefas</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase text-center">XP</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {scores.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                    <div className="flex flex-col items-center gap-3">
                                        <Trophy className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                                        <p>Nenhuma pontuação registrada para este período.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            scores.map((score, index) => (
                                <tr key={score.id} className={clsx(
                                    "hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group",
                                    index === 0 && "bg-amber-500/5 dark:bg-amber-500/10"
                                )}>
                                    <td className="px-6 py-4">
                                        <div className={clsx(
                                            "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-lg",
                                            index === 0 ? "bg-amber-400 text-amber-950" :
                                                index === 1 ? "bg-slate-300 text-slate-900" :
                                                    index === 2 ? "bg-orange-400 text-orange-950" : "bg-white/5 text-slate-400"
                                        )}>
                                            {index + 1}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zaia-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-zaia-500/20">
                                                {score.profiles?.name?.substring(0, 2).toUpperCase()}
                                            </div>
                                            <span className="font-medium text-slate-900 dark:text-white group-hover:text-zaia-600 dark:group-hover:text-zaia-300 transition-colors">{score.profiles?.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                            <Store className="w-3.5 h-3.5 text-slate-500 dark:text-slate-500" />
                                            {score.stores?.name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="text-lg font-bold text-slate-900 dark:text-white">
                                                {Number(score.execution_rate).toFixed(0)}%
                                            </div>
                                            <div className="w-24 bg-white/5 h-1.5 rounded-full overflow-hidden">
                                                <div
                                                    className={clsx(
                                                        "h-full rounded-full transition-all duration-1000",
                                                        Number(score.execution_rate) >= 90 ? "bg-emerald-500" :
                                                            Number(score.execution_rate) >= 70 ? "bg-zaia-500" : "bg-rose-500"
                                                    )}
                                                    style={{ width: `${score.execution_rate}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center gap-3 text-xs">
                                            <div className="flex flex-col">
                                                <span className="text-emerald-400 font-bold">{score.tasks_done}</span>
                                                <span className="text-[10px] text-slate-500 uppercase">Feitas</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-amber-400 font-bold">{score.tasks_postponed}</span>
                                                <span className="text-[10px] text-slate-500 uppercase">Adiadas</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-rose-400 font-bold">{score.tasks_delayed}</span>
                                                <span className="text-[10px] text-slate-500 uppercase">Atrasa</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-bold border border-amber-500/20">
                                            <Zap className="w-3 h-3" />
                                            {Number(score.total_xp || 0).toLocaleString('pt-BR')} XP
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
