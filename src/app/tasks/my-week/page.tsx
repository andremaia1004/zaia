'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { tasksService, TaskOccurrence } from '@/services/tasks'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isAfter, parseISO, subWeeks, addWeeks, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CheckCircle2, Circle, Clock, ChevronRight, AlertCircle, Plus, Minus, ChevronLeft, Calendar as CalendarIcon, History } from 'lucide-react'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/Button'

export default function MyWeekPage() {
    const { profile } = useAuth()
    const [occurrences, setOccurrences] = useState<TaskOccurrence[]>([])
    const [backlog, setBacklog] = useState<TaskOccurrence[]>([])
    const [loading, setLoading] = useState(true)
    const [currentDate, setCurrentDate] = useState(new Date())

    // Modal states
    const [selectedOccurrence, setSelectedOccurrence] = useState<TaskOccurrence | null>(null)
    const [postponeDate, setPostponeDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [postponeReason, setPostponeReason] = useState('')
    const [isPostponing, setIsPostponing] = useState(false)
    const [proofModal, setProofModal] = useState(false)
    const [proofDescription, setProofDescription] = useState('')
    const [occurrenceForProof, setOccurrenceForProof] = useState<TaskOccurrence | null>(null)

    // Derived dates
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
    const isCurrentWeek = isSameDay(startOfWeek(new Date(), { weekStartsOn: 1 }), weekStart)

    useEffect(() => {
        if (profile?.id) {
            fetchData()
        }
    }, [profile, currentDate])

    const fetchData = async () => {
        try {
            setLoading(true)
            const [weekData, backlogData] = await Promise.all([
                tasksService.getOccurrencesByStaff(
                    profile!.id,
                    format(weekStart, 'yyyy-MM-dd'),
                    format(weekEnd, 'yyyy-MM-dd')
                ),
                tasksService.getBacklogByStaff(profile!.id, format(weekStart, 'yyyy-MM-dd'))
            ])
            setOccurrences(weekData)
            setBacklog(backlogData)
        } catch (error) {
            console.error('Error fetching tasks:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleIncrement = async (occ: TaskOccurrence) => {
        if (occ.status === 'FEITA') return

        if (occ.requires_proof && occ.current_value + 1 >= occ.target_value) {
            setOccurrenceForProof(occ)
            setProofModal(true)
            return
        }

        // OPTIMISTIC UPDATE
        const updateInList = (list: TaskOccurrence[]) =>
            list.map(o => o.id === occ.id ? { ...o, current_value: o.current_value + 1, status: (o.current_value + 1 >= o.target_value) ? 'FEITA' : o.status } as TaskOccurrence : o)

        setOccurrences(prev => updateInList(prev))
        setBacklog(prev => updateInList(prev))

        try {
            await tasksService.incrementCounter(occ.id, occ.current_value, occ.target_value)
            // No need to re-fetch if optimistic update is correct, but could re-sync if needed
        } catch (error) {
            console.error('Error incrementing counter:', error)
            fetchData() // Revert on error
        }
    }

    const handleMarkDone = async (occ: TaskOccurrence) => {
        if (occ.requires_proof) {
            setOccurrenceForProof(occ)
            setProofModal(true)
            return
        }

        const updateInList = (list: TaskOccurrence[]) =>
            list.map(o => o.id === occ.id ? { ...o, status: 'FEITA', current_value: o.target_value } as TaskOccurrence : o)

        setOccurrences(prev => updateInList(prev))
        setBacklog(prev => updateInList(prev))

        try {
            await tasksService.updateOccurrence(occ.id, { status: 'FEITA', current_value: occ.target_value })
        } catch (error) {
            console.error('Error marking as done:', error)
            fetchData()
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

            const syncList = (list: TaskOccurrence[]) => list.map(o => o.id === updated.id ? updated : o)
            setOccurrences(prev => syncList(prev))
            setBacklog(prev => syncList(prev))

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
            fetchData()
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

    const TaskCard = ({ occ }: { occ: TaskOccurrence }) => (
        <div key={occ.id} className="glass-panel p-4 border border-white/5 hover:border-zaia-500/30 transition-all group bg-white/5 shadow-lg mb-3">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    {getStatusIcon(occ.status)}
                    <h3 className="text-sm font-medium text-white group-hover:text-zaia-300 transition-colors leading-tight line-clamp-2">{occ.title}</h3>
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{occ.current_value} / {occ.target_value}</span>
                    {occ.due_at && (
                        <span className={clsx(
                            "flex items-center gap-1",
                            occ.status === 'PENDENTE' && isAfter(new Date(), parseISO(occ.due_at)) ? "text-rose-400 font-bold" : ""
                        )}>
                            <Clock className="w-3 h-3" /> {format(parseISO(occ.due_at), "HH:mm")}
                        </span>
                    )}
                </div>

                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                    <div
                        className={clsx(
                            "h-full transition-all duration-500",
                            occ.status === 'FEITA' ? "bg-emerald-500" : "bg-zaia-500"
                        )}
                        style={{ width: `${Math.min((occ.current_value / occ.target_value) * 100, 100)}%` }}
                    />
                </div>

                {occ.status === 'PENDENTE' && (
                    <div className="flex gap-2 pt-1">
                        <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-8 text-[10px] border-white/10 hover:bg-white/5"
                            onClick={() => {
                                setSelectedOccurrence(occ)
                                setPostponeDate(format(new Date(), 'yyyy-MM-dd'))
                            }}
                        >
                            Adiar
                        </Button>
                        <Button
                            size="sm"
                            className="flex-1 h-8 text-[10px] bg-zaia-600 hover:bg-zaia-500"
                            onClick={() => occ.target_value > 1 ? handleIncrement(occ) : handleMarkDone(occ)}
                        >
                            {occ.target_value > 1 ? '+1' : 'Concluir'}
                        </Button>
                    </div>
                )}
                {occ.status === 'ADIADA' && <div className="text-[10px] text-amber-500 font-bold uppercase text-center bg-amber-500/10 py-1 rounded">Adiada</div>}
                {occ.status === 'FEITA' && <div className="text-[10px] text-emerald-500 font-bold uppercase text-center bg-emerald-500/10 py-1 rounded">Concluída</div>}
                {occ.status === 'ATRASA' && <div className="text-[10px] text-rose-500 font-bold uppercase text-center bg-rose-500/10 py-1 rounded cursor-pointer hover:bg-rose-500/20" onClick={() => handleMarkDone(occ)}>Em atraso - Resolver</div>}
            </div>
        </div>
    )

    if (loading && occurrences.length === 0) return <div className="p-8 text-slate-400">Carregando quadro de tarefas...</div>

    return (
        <div className="p-6 max-w-[1600px] mx-auto min-h-screen">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-1">Minha Semana</h1>
                    <p className="text-slate-400 text-sm">
                        Visualize e gerencie suas tarefas diárias de forma ágil.
                    </p>
                </div>

                <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-xl border border-white/10">
                    <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subWeeks(currentDate, 1))} className="hover:bg-white/10">
                        <ChevronLeft className="w-5 h-5 text-slate-400" />
                    </Button>

                    <div className="flex items-center gap-2 px-4 py-1.5 bg-white/5 rounded-lg border border-white/5">
                        <CalendarIcon className="w-4 h-4 text-zaia-400" />
                        <span className="text-sm font-medium text-white capitalize min-w-[180px] text-center">
                            {format(weekStart, "d 'de' MMM", { locale: ptBR })} - {format(weekEnd, "d 'de' MMM", { locale: ptBR })}
                        </span>
                    </div>

                    <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addWeeks(currentDate, 1))} className="hover:bg-white/10">
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                    </Button>

                    <div className="h-6 w-[1px] bg-white/10 mx-1" />

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentDate(new Date())}
                        className={clsx("text-xs font-semibold px-3", isCurrentWeek ? "text-zaia-400" : "text-slate-400")}
                    >
                        Hoje
                    </Button>
                </div>
            </header>

            {/* Trello Board */}
            <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {days.map((day) => {
                    const dayTasks = occurrences.filter(o => isSameDay(new Date(o.date + 'T12:00:00'), day))
                    const isToday = isSameDay(day, new Date())

                    return (
                        <div
                            key={day.toString()}
                            className={clsx(
                                "flex-shrink-0 w-80 flex flex-col rounded-2xl p-4 transition-colors",
                                isToday ? "bg-zaia-500/5 border border-zaia-500/20" : "bg-white/[0.02] border border-white/5"
                            )}
                        >
                            <div className="flex items-center justify-between mb-4 px-1">
                                <div>
                                    <h2 className={clsx("text-sm font-bold uppercase tracking-wider", isToday ? "text-zaia-400" : "text-slate-400")}>
                                        {format(day, 'EEEE', { locale: ptBR })}
                                    </h2>
                                    <span className="text-[10px] text-slate-500">{format(day, "dd 'de' MMMM", { locale: ptBR })}</span>
                                </div>
                                <div className="bg-white/5 text-[10px] font-bold px-2 py-1 rounded-full text-slate-400 border border-white/5">
                                    {dayTasks.length} {dayTasks.length === 1 ? 'Tarefa' : 'Tarefas'}
                                </div>
                            </div>

                            <div className="flex-1 space-y-1 min-h-[200px]">
                                {dayTasks.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center opacity-20 py-12">
                                        <Circle className="w-8 h-8 mb-2" />
                                        <span className="text-xs">Sem tarefas</span>
                                    </div>
                                ) : (
                                    dayTasks.map(occ => <TaskCard key={occ.id} occ={occ} />)
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Backlog Section */}
            {backlog.length > 0 && (
                <div className="mt-12">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-rose-500/10 rounded-lg border border-rose-500/20">
                            <History className="w-5 h-5 text-rose-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Pendências do Passado</h2>
                            <p className="text-xs text-slate-500">Tarefas de semanas anteriores que ainda não foram concluídas ou adiadas.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {backlog.map(occ => (
                            <div key={occ.id} className="relative group">
                                <div className="absolute -top-2 -left-2 z-10 bg-rose-500 text-[8px] font-bold text-white px-2 py-0.5 rounded-full shadow-lg">
                                    ATRASADA: {format(parseISO(occ.date), 'dd/MM')}
                                </div>
                                <TaskCard occ={occ} />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modals - Same logic keep for consistency */}
            {selectedOccurrence && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="glass-panel border border-white/10 w-full max-w-md p-6 animate-in fade-in zoom-in duration-200 bg-slate-900 shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-amber-400" /> Adiar Tarefa
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 uppercase mb-1.5">Nova Data</label>
                                <input
                                    type="date"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none focus:border-zaia-500 transition-colors"
                                    value={postponeDate}
                                    onChange={(e) => setPostponeDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 uppercase mb-1.5">Motivo</label>
                                <textarea
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none focus:border-zaia-500 h-24 resize-none transition-colors"
                                    placeholder="Opcional: explique por que está adiando..."
                                    value={postponeReason}
                                    onChange={(e) => setPostponeReason(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <Button variant="outline" className="flex-1 border-white/10" onClick={() => setSelectedOccurrence(null)}>Cancelar</Button>
                            <Button className="flex-1 bg-zaia-600 hover:bg-zaia-500" onClick={handlePostpone} loading={isPostponing}>Confirmar</Button>
                        </div>
                    </div>
                </div>
            )}

            {proofModal && occurrenceForProof && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="glass-panel border border-white/10 w-full max-w-md p-6 animate-in fade-in zoom-in duration-200 bg-slate-900 shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-2">Comprovação</h3>
                        <p className="text-sm text-slate-400 mb-6">Descreva o resultado para concluir esta tarefa.</p>

                        <div className="space-y-4">
                            <textarea
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none focus:border-zaia-500 h-32 resize-none transition-colors"
                                placeholder="Link do drive, resultado alcançado ou observação..."
                                value={proofDescription}
                                onChange={(e) => setProofDescription(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-3 mt-8">
                            <Button variant="outline" className="flex-1 border-white/10" onClick={() => {
                                setProofModal(false)
                                setOccurrenceForProof(null)
                                setProofDescription('')
                            }}>Cancelar</Button>
                            <Button
                                className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                                onClick={handleProofSubmit}
                                disabled={!proofDescription.trim()}
                            >
                                Concluir
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
