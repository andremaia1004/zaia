'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, Layers } from 'lucide-react'
import { clsx } from 'clsx'

export default function CalendarPage() {
    const { profile, selectedStore } = useAuth()
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [occurrences, setOccurrences] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Calendar logic
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 })
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })

    useEffect(() => {
        fetchOccurrences()
    }, [currentMonth, profile, selectedStore])

    const fetchOccurrences = async () => {
        try {
            setLoading(true)
            const supabase = createClient()
            let query = supabase
                .from('task_occurrences')
                .select('*')
                .gte('date', format(startDate, 'yyyy-MM-dd'))
                .lte('date', format(endDate, 'yyyy-MM-dd'))

            if (profile?.role === 'staff') {
                query = query.eq('staff_id', profile.id)
            } else if (selectedStore?.id) {
                query = query.eq('store_id', selectedStore.id)
            } else if (profile?.role === 'store_admin') {
                query = query.eq('store_id', profile.store_id)
            }
            /* If Super Admin but no selectedStore, fetch all (global view) */

            const { data, error } = await query
            if (error) throw error
            setOccurrences(data || [])
        } catch (error) {
            console.error('Error fetching calendar tasks:', error)
        } finally {
            setLoading(false)
        }
    }

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

    return (
        <div className="p-8 max-w-7xl mx-auto h-[calc(100vh-2rem)] flex flex-col">
            <header className="flex items-center justify-between mb-8 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-zaia-500/10 dark:bg-zaia-500/20 rounded-xl">
                        <CalendarIcon className="w-6 h-6 text-zaia-600 dark:text-zaia-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                        {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-white/5 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5 overflow-hidden p-1">
                        <button
                            onClick={prevMonth}
                            className="p-2 text-slate-500 dark:text-slate-400 hover:text-zaia-600 dark:hover:text-white hover:bg-zaia-500/10 dark:hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setCurrentMonth(new Date())}
                            className="px-4 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-zaia-600 dark:hover:text-white transition-colors"
                        >
                            Hoje
                        </button>
                        <button
                            onClick={nextMonth}
                            className="p-2 text-slate-500 dark:text-slate-400 hover:text-zaia-600 dark:hover:text-white hover:bg-zaia-500/10 dark:hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex-1 glass-panel border border-white/5 rounded-2xl overflow-hidden flex flex-col">
                <div className="grid grid-cols-7 bg-white/5 dark:bg-white/5 border-b border-slate-200 dark:border-white/5 shrink-0">
                    {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => (
                        <div key={day} className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="flex-1 grid grid-cols-7 grid-rows-6 auto-rows-fr overflow-hidden">
                    {calendarDays.map((day, idx) => {
                        const dayTasks = occurrences.filter(o => isSameDay(new Date(o.date + 'T12:00:00'), day))
                        const isCurrentMonth = isSameMonth(day, currentMonth)
                        const isToday = isSameDay(day, new Date())

                        return (
                            <div
                                key={day.toString()}
                                className={clsx(
                                    "border-r border-b border-slate-200 dark:border-white/5 p-2 flex flex-col gap-1 transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.02] last:border-r-0",
                                    !isCurrentMonth && "bg-slate-100/50 dark:bg-black/20"
                                )}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className={clsx(
                                        "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-lg",
                                        isToday ? "bg-zaia-500 text-white shadow-lg shadow-zaia-500/20" :
                                            isCurrentMonth ? "text-slate-700 dark:text-slate-300" : "text-slate-400 dark:text-slate-600"
                                    )}>
                                        {format(day, 'd')}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar max-h-24 pr-1">
                                    {dayTasks.map(task => (
                                        <div
                                            key={task.id}
                                            className={clsx(
                                                "px-2 py-1 rounded text-[10px] truncate border font-medium",
                                                task.status === 'FEITA'
                                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                                    : task.status === 'ADIADA'
                                                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                                        : "bg-zaia-500/10 text-zaia-600 dark:text-zaia-400 border-zaia-500/20"
                                            )}
                                            title={task.title}
                                        >
                                            {task.title}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
