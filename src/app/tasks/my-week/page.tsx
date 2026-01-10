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
    const [selectedOccurrence, setSelectedOccurrence] = useState<TaskOccurrence | null>(null)
    const [postponeDate, setPostponeDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [postponeReason, setPostponeReason] = useState('')
    const [isPostponing, setIsPostponing] = useState(false)
    const [proofModal, setProofModal] = useState(false)
    const [proofDescription, setProofDescription] = useState('')
    const [occurrenceForProof, setOccurrenceForProof] = useState<TaskOccurrence | null>(null)

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

    const handleIncrement = async (occ: TaskOccurrence) => {
        if (occ.status === 'FEITA') return

        // Check if proof is required for the LAST increment (reaching target)
        if (occ.requires_proof && occ.current_value + 1 >= occ.target_value) {
            setOccurrenceForProof(occ)
            setProofModal(true)
            return
        }

        try {
            const updated = await tasksService.incrementCounter(occ.id, occ.current_value, occ.target_value)
            setOccurrences(prev => prev.map(o => o.id === updated.id ? updated : o))
        } catch (error) {
            console.error('Error incrementing counter:', error)
        }
    }

    const handleMarkDone = async (occ: TaskOccurrence) => {
        if (occ.requires_proof) {
            setOccurrenceForProof(occ)
            setProofModal(true)
            return
        }

        try {
            const updated = await tasksService.updateOccurrence(occ.id, { status: 'FEITA', current_value: occ.target_value })
            setOccurrences(prev => prev.map(o => o.id === updated.id ? updated : o))
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
            setSelectedOccurrence(null)
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

    if (loading) return <div className="p-8 text-slate-400">Carregando tarefas...</div>

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Minha Semana</h1>
                <p className="text-slate-600 dark:text-slate-400">
                    Acompanhe suas metas de {format(weekStart, "d 'de' MMMM", { locale: ptBR })} a {format(weekEnd, "d 'de' MMMM", { locale: ptBR })}
                </p>
            </header>

            {/* Daily Progress summary */}
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
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-500 uppercase mb-1">
                                {format(day, 'eee', { locale: ptBR })}
                            </span>
                            <span className={clsx("text-lg font-bold mb-2", isToday ? "text-zaia-600 dark:text-zaia-400" : "text-slate-900 dark:text-white")}>
                                {format(day, 'dd')}
                            </span>
                            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                <div
                                    className="bg-zaia-500 h-full transition-all duration-500"
                                    style={{ width: totalCount > 0 ? `${(doneCount / totalCount) * 100}%` : '0%' }}
                                />
                            </div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-500 mt-1">{doneCount}/{totalCount}</span>
                        </div>
                    )
                })}
            </div>

            {/* Task list grouped by day */}
            <div className="space-y-8">
                {days.map((day) => {
                    const dayTasks = occurrences.filter(o => isSameDay(new Date(o.date + 'T12:00:00'), day))
                    if (dayTasks.length === 0) return null

                    return (
                        <section key={day.toString()}>
                            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <span className={isSameDay(day, today) ? "text-zaia-400" : ""}>
                                    {format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                                </span>
                                {isSameDay(day, today) && <span className="text-[10px] bg-zaia-500/20 text-zaia-400 px-2 py-0.5 rounded-full">HOJE</span>}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {dayTasks.map((occ) => (
                                    <div key={occ.id} className="glass-panel p-5 border border-white/5 hover:border-white/10 dark:border-white/5 dark:hover:border-white/10 transition-colors group">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                {getStatusIcon(occ.status)}
                                                <div>
                                                    <h3 className="font-medium text-slate-900 dark:text-white group-hover:text-zaia-600 dark:group-hover:text-zaia-300 transition-colors">{occ.title}</h3>
                                                    <p className="text-xs text-slate-500 dark:text-slate-500">Meta: {occ.target_value}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-slate-500 dark:text-slate-400">Progresso</span>
                                                    <span className="text-slate-900 dark:text-white font-medium">{occ.current_value} / {occ.target_value}</span>
                                                </div>
                                                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                                    <div
                                                        className={clsx(
                                                            "h-full transition-all duration-500",
                                                            occ.status === 'FEITA' ? "bg-emerald-500" : "bg-zaia-500"
                                                        )}
                                                        style={{ width: `${Math.min((occ.current_value / occ.target_value) * 100, 100)}%` }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex gap-2 shrink-0">
                                                {occ.status === 'PENDENTE' && (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedOccurrence(occ)
                                                                setPostponeDate(format(new Date(), 'yyyy-MM-dd'))
                                                            }}
                                                            className="p-2 text-slate-400 hover:text-zaia-400 hover:bg-zaia-500/10 rounded-lg transition-colors border border-white/5"
                                                            title="Adiar Tarefa"
                                                        >
                                                            <Clock className="w-4 h-4" />
                                                        </button>
                                                        {occ.target_value > 1 ? (
                                                            <button
                                                                onClick={() => handleIncrement(occ)}
                                                                className="flex items-center gap-2 px-3 py-1.5 bg-zaia-600/10 hover:bg-zaia-500 text-zaia-600 dark:text-zaia-300 hover:text-white rounded-lg transition-all text-xs font-bold border border-zaia-500/20"
                                                            >
                                                                <Plus className="w-3.5 h-3.5" />
                                                                +1
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleMarkDone(occ)}
                                                                className="flex items-center gap-2 px-3 py-1.5 bg-zaia-600/10 hover:bg-emerald-500 text-zaia-600 dark:text-zaia-300 hover:text-white rounded-lg transition-all text-xs font-bold border border-zaia-500/20"
                                                            >
                                                                Concluir
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                                {occ.status === 'ADIADA' && (
                                                    <span className="text-[10px] text-amber-500 font-bold uppercase py-1 px-2 bg-amber-500/10 rounded">Adiada</span>
                                                )}
                                                {occ.status === 'FEITA' && (
                                                    <span className="text-[10px] text-emerald-500 font-bold uppercase py-1 px-2 bg-emerald-500/10 rounded">Feito</span>
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

            {/* Postpone Modal */}
            {selectedOccurrence && (
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
                            <Button variant="outline" className="flex-1" onClick={() => setSelectedOccurrence(null)}>Cancelar</Button>
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
