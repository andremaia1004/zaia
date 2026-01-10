'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { tasksService, TaskOccurrence } from '@/services/tasks'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CheckCircle2, Circle, Clock, ChevronRight, AlertCircle, Plus, Minus } from 'lucide-react'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/Button'

export default function MyWeekPage() {
    const { profile } = useAuth()
    const [occurrences, setOccurrences] = useState<TaskOccurrence[]>([])
    const [loading, setLoading] = useState(true)

    // Week range
    const today = new Date()
    const weekStart = startOfWeek(today, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

    useEffect(() => {
        if (profile?.id) {
            fetchOccurrences()
        }
    }, [profile])

    const fetchOccurrences = async () => {
        try {
            setLoading(true)
            const data = await tasksService.getOccurrencesByStaff(
                profile!.id,
                format(weekStart, 'yyyy-MM-dd'),
                format(weekEnd, 'yyyy-MM-dd')
            )
            setOccurrences(data)
        } catch (error) {
            console.error('Error fetching tasks:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleIncrement = async (task: TaskOccurrence) => {
        if (task.status === 'FEITA') return
        try {
            const updated = await tasksService.incrementCounter(task.id, task.current_value, task.target_value)
            setOccurrences(prev => prev.map(o => o.id === updated.id ? updated : o))
        } catch (error) {
            console.error('Error updating task:', error)
        }
    }

    const handleMarkDone = async (task: TaskOccurrence) => {
        try {
            const updated = await tasksService.updateOccurrence(task.id, { status: 'FEITA', current_value: task.target_value })
            setOccurrences(prev => prev.map(o => o.id === updated.id ? updated : o))
        } catch (error) {
            console.error('Error marking as done:', error)
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'FEITA': return <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            case 'ADIADA': return <Clock className="w-5 h-5 text-amber-400" />
            case 'ATRASA': return <AlertCircle className="w-5 h-5 text-rose-400" />
            default: return <Circle className="w-5 h-5 text-slate-500" />
        }
    }

    if (loading) return <div className="p-8 text-slate-400">Carregando tarefas...</div>

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Minha Semana</h1>
                <p className="text-slate-400">
                    Acompanhe suas metas de {format(weekStart, "d 'de' MMMM", { locale: ptBR })} a {format(weekEnd, "d 'de' MMMM", { locale: ptBR })}
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-8">
                {days.map((day) => {
                    const dayTasks = occurrences.filter(o => isSameDay(new Date(o.date + 'T12:00:00'), day))
                    const doneCount = dayTasks.filter(t => t.status === 'FEITA').length
                    const totalCount = dayTasks.length
                    const isToday = isSameDay(day, today)

                    return (
                        <div
                            key={day.toString()}
                            className={clsx(
                                "glass-panel p-4 flex flex-col items-center justify-center transition-all",
                                isToday ? "border-zaia-500/50 bg-zaia-500/10 scale-105" : "border-white/5"
                            )}
                        >
                            <span className="text-xs font-medium text-slate-500 uppercase mb-1">
                                {format(day, 'eee', { locale: ptBR })}
                            </span>
                            <span className={clsx("text-lg font-bold mb-2", isToday ? "text-zaia-400" : "text-white")}>
                                {format(day, 'dd')}
                            </span>
                            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                <div
                                    className="bg-zaia-500 h-full transition-all duration-500"
                                    style={{ width: totalCount > 0 ? `${(doneCount / totalCount) * 100}%` : '0%' }}
                                />
                            </div>
                            <span className="text-[10px] text-slate-500 mt-1">{doneCount}/{totalCount}</span>
                        </div>
                    )
                })}
            </div>

            <div className="space-y-4">
                {days.map((day) => {
                    const dayTasks = occurrences.filter(o => isSameDay(new Date(o.date + 'T12:00:00'), day))
                    if (dayTasks.length === 0) return null

                    return (
                        <section key={day.toString()} className="mb-6">
                            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <span className={isSameDay(day, today) ? "text-zaia-400" : ""}>
                                    {format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                                </span>
                                {isSameDay(day, today) && <span className="text-[10px] bg-zaia-500/20 text-zaia-400 px-2 py-0.5 rounded-full">HOJE</span>}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {dayTasks.map((task) => (
                                    <div key={task.id} className="glass-panel p-5 border border-white/5 hover:border-white/10 transition-colors group">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                {getStatusIcon(task.status)}
                                                <div>
                                                    <h3 className="font-medium text-white group-hover:text-zaia-300 transition-colors">{task.title}</h3>
                                                    <p className="text-xs text-slate-500">Meta: {task.target_value}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-slate-400">Progresso</span>
                                                    <span className="text-white font-medium">{task.current_value} / {task.target_value}</span>
                                                </div>
                                                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                                    <div
                                                        className={clsx(
                                                            "h-full transition-all duration-500",
                                                            task.status === 'FEITA' ? "bg-emerald-500" : "bg-zaia-500"
                                                        )}
                                                        style={{ width: `${Math.min((task.current_value / task.target_value) * 100, 100)}%` }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex gap-1 shrink-0">
                                                {task.target_value > 1 ? (
                                                    <button
                                                        onClick={() => handleIncrement(task)}
                                                        disabled={task.status === 'FEITA'}
                                                        className="p-2 rounded-lg bg-white/5 hover:bg-zaia-500/20 text-slate-400 hover:text-zaia-400 disabled:opacity-30 transition-all font-bold"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleMarkDone(task)}
                                                        disabled={task.status === 'FEITA'}
                                                        className={clsx(
                                                            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                                            task.status === 'FEITA'
                                                                ? "bg-emerald-500/10 text-emerald-400 cursor-default"
                                                                : "bg-zaia-500/10 text-zaia-400 hover:bg-zaia-500 hover:text-white"
                                                        )}
                                                    >
                                                        {task.status === 'FEITA' ? 'Feito' : 'Marcar Feito'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )
                })}
            </div>
        </div>
    )
}
