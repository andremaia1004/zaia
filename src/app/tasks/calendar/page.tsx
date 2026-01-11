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
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, Layers, CheckCircle2, Circle, Clock, AlertCircle, Plus, X } from 'lucide-react'
import { clsx } from 'clsx'
import { tasksService, TaskOccurrence } from '@/services/tasks'
import { Button } from '@/components/ui/Button'

export default function CalendarPage() {
    const { profile, selectedStore } = useAuth()
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [occurrences, setOccurrences] = useState<TaskOccurrence[]>([])
    const [loading, setLoading] = useState(true)

    // Interaction states
    const [selectedOccurrence, setSelectedOccurrence] = useState<TaskOccurrence | null>(null)
    const [isDetailsOpen, setIsDetailsOpen] = useState(false)
    const [postponeDate, setPostponeDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [postponeReason, setPostponeReason] = useState('')
    const [isPostponing, setIsPostponing] = useState(false)
    const [showPostponeModal, setShowPostponeModal] = useState(false)
    const [proofModal, setProofModal] = useState(false)
    const [proofDescription, setProofDescription] = useState('')
    const [occurrenceForProof, setOccurrenceForProof] = useState<TaskOccurrence | null>(null)

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

    // Actions
    const handleIncrement = async (occ: TaskOccurrence) => {
        if (occ.status === 'FEITA') return

        if (occ.requires_proof && occ.current_value + 1 >= occ.target_value) {
            setOccurrenceForProof(occ)
            setProofModal(true)
            setIsDetailsOpen(false)
            return
        }

        try {
            const updated = await tasksService.incrementCounter(occ.id, occ.current_value, occ.target_value)
            setOccurrences(prev => prev.map(o => o.id === updated.id ? updated : o))
            if (selectedOccurrence?.id === updated.id) setSelectedOccurrence(updated)
        } catch (error) {
            console.error('Error incrementing counter:', error)
        }
    }

    const handleMarkDone = async (occ: TaskOccurrence) => {
        if (occ.requires_proof) {
            setOccurrenceForProof(occ)
            setProofModal(true)
            setIsDetailsOpen(false)
            return
        }

        try {
            const updated = await tasksService.updateOccurrence(occ.id, { status: 'FEITA', current_value: occ.target_value })
            setOccurrences(prev => prev.map(o => o.id === updated.id ? updated : o))
            if (selectedOccurrence?.id === updated.id) setSelectedOccurrence(updated)
            setIsDetailsOpen(false)
        } catch (error) {
            console.error('Error marking as done:', error)
        }
    }

    const handleProofSubmit = async () => {
        if (!occurrenceForProof) return
        try {
            const updated = await tasksService.updateOccurrence(occurrenceForProof.id, {
                status: 'FEITA',
                current_value: occurrenceForProof.target_value,
                proof_description: proofDescription
            })
            setOccurrences(prev => prev.map(o => o.id === updated.id ? updated : o))
            setProofModal(false)
            setProofDescription('')
            setOccurrenceForProof(null)
        } catch (error) {
            console.error('Error submitting proof:', error)
        }
    }

    const handlePostpone = async () => {
        if (!selectedOccurrence || !postponeDate) return
        try {
            setIsPostponing(true)
            await tasksService.postponeTask(selectedOccurrence.id, postponeDate, postponeReason)
            setShowPostponeModal(false)
            setIsDetailsOpen(false)
            setPostponeReason('')
            fetchOccurrences()
        } catch (error) {
            console.error('Error postponing task:', error)
        } finally {
            setIsPostponing(false)
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
                                            onClick={() => {
                                                setSelectedOccurrence(task)
                                                setIsDetailsOpen(true)
                                            }}
                                            className={clsx(
                                                "px-2 py-1 rounded text-[10px] truncate border font-medium cursor-pointer hover:scale-[1.02] transition-transform",
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
            {/* Task Details Modal */}
            {isDetailsOpen && selectedOccurrence && (
                <div className="fixed inset-0 bg-black/60 dark:bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="glass-panel border border-slate-200 dark:border-white/10 w-full max-w-md p-6 animate-in fade-in zoom-in duration-200 bg-white dark:bg-slate-900 relative">
                        <button
                            onClick={() => setIsDetailsOpen(false)}
                            className="absolute top-4 right-4 p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-500" />
                        </button>

                        <div className="flex items-start gap-4 mb-6">
                            <div className="pt-1">{getStatusIcon(selectedOccurrence.status)}</div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedOccurrence.title}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-sm text-slate-500 dark:text-slate-400">
                                        {format(new Date(selectedOccurrence.date), "dd 'de' MMMM", { locale: ptBR })}
                                    </span>
                                    {selectedOccurrence.due_at && (
                                        <span className={clsx(
                                            "flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium",
                                            selectedOccurrence.status === 'PENDENTE'
                                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                                : "bg-slate-100 dark:bg-white/5 text-slate-500"
                                        )}>
                                            <Clock className="w-3 h-3" />
                                            {format(new Date(selectedOccurrence.due_at), 'HH:mm')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="mb-8">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-500 dark:text-slate-400">Progresso</span>
                                <span className="text-slate-900 dark:text-white font-medium">{selectedOccurrence.current_value} / {selectedOccurrence.target_value}</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-white/5 h-2.5 rounded-full overflow-hidden">
                                <div
                                    className={clsx(
                                        "h-full transition-all duration-500",
                                        selectedOccurrence.status === 'FEITA' ? "bg-emerald-500" : "bg-zaia-500"
                                    )}
                                    style={{ width: `${Math.min((selectedOccurrence.current_value / selectedOccurrence.target_value) * 100, 100)}%` }}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            {selectedOccurrence.status === 'PENDENTE' && (
                                <>
                                    {selectedOccurrence.target_value > 1 ? (
                                        <Button
                                            onClick={() => handleIncrement(selectedOccurrence)}
                                            className="w-full bg-zaia-500 hover:bg-zaia-600 text-white"
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Adicionar Progresso (+1)
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={() => handleMarkDone(selectedOccurrence)}
                                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                                        >
                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                            Concluir Tarefa
                                        </Button>
                                    )}

                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setShowPostponeModal(true)
                                            setPostponeDate(format(new Date(), 'yyyy-MM-dd'))
                                        }}
                                        className="w-full"
                                    >
                                        <Clock className="w-4 h-4 mr-2" />
                                        Adiar Tarefa
                                    </Button>
                                </>
                            )}

                            {selectedOccurrence.status !== 'PENDENTE' && (
                                <div className="text-center p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Esta tarefa está <strong className="text-slate-900 dark:text-white">{selectedOccurrence.status}</strong>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Postpone Modal */}
            {showPostponeModal && (
                <div className="fixed inset-0 bg-black/60 dark:bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="glass-panel border border-slate-200 dark:border-white/10 w-full max-w-md p-6 animate-in fade-in zoom-in duration-200 bg-white dark:bg-slate-900">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Adiar Tarefa</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Empurrar para quando?</label>
                                <input
                                    type="date"
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white outline-none focus:border-zaia-500 dark:[&::-webkit-calendar-picker-indicator]:invert"
                                    value={postponeDate}
                                    onChange={(e) => setPostponeDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Motivo (Opcional)</label>
                                <textarea
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white outline-none focus:border-zaia-500 h-24 resize-none"
                                    placeholder="Explique o motivo do adiamento..."
                                    value={postponeReason}
                                    onChange={(e) => setPostponeReason(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <Button variant="outline" className="flex-1" onClick={() => setShowPostponeModal(false)}>Cancelar</Button>
                            <Button className="flex-1" onClick={handlePostpone} loading={isPostponing}>Confirmar Adiamento</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Proof Modal */}
            {proofModal && occurrenceForProof && (
                <div className="fixed inset-0 bg-black/60 dark:bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="glass-panel border border-slate-200 dark:border-white/10 w-full max-w-md p-6 animate-in fade-in zoom-in duration-200 bg-white dark:bg-slate-900">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Comprovação Necessária</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Esta tarefa requer uma breve descrição ou link do resultado para ser concluída.</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">O que foi feito? (Ex: Link do drive ou descrição)</label>
                                <textarea
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white outline-none focus:border-zaia-500 h-32 resize-none"
                                    placeholder="Descreva aqui o resultado ou cole o link da comprovação..."
                                    value={proofDescription}
                                    onChange={(e) => setProofDescription(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <Button variant="outline" className="flex-1" onClick={() => {
                                setProofModal(false)
                                setOccurrenceForProof(null)
                                setProofDescription('')
                            }}>Cancelar</Button>
                            <Button className="flex-1" onClick={handleProofSubmit} disabled={!proofDescription.trim()}>Concluir Tarefa</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
