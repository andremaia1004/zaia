'use client'
import { useState, useEffect } from 'react'
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { appointmentService } from '@/services/appointments'
import { type Appointment } from '@/services/types'
import { AppointmentDetailsModal } from '@/components/agenda/AppointmentDetailsModal'
import { CalendarX2 } from 'lucide-react'

export function DailyList({ currentDate }: { currentDate: Date }) {
    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)

    const start = startOfWeek(currentDate, { weekStartsOn: 1 })
    const end = endOfWeek(currentDate, { weekStartsOn: 1 })
    const days = eachDayOfInterval({ start, end })

    useEffect(() => {
        fetchAppointments()
    }, [currentDate])

    const fetchAppointments = async () => {
        setLoading(true)
        const startDate = format(start, 'yyyy-MM-dd')
        const endDate = format(end, 'yyyy-MM-dd')

        try {
            const data = await appointmentService.getByDateRange(startDate, endDate)
            setAppointments(data)

            // Update selectedAppointment with fresh data if it exists
            if (selectedAppointment) {
                const updated = data.find(a => a.id === selectedAppointment.id)
                if (updated) setSelectedAppointment(updated)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return <div className="p-8 text-center text-slate-500 animate-pulse">Carregando agenda...</div>
    }

    return (
        <div className="space-y-6">
            {days.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd')
                const dayAppointments = appointments.filter(a => a.date === dateKey)
                const isToday = isSameDay(day, new Date())

                return (
                    <div key={dateKey} className={cn("glass-panel p-4 transition-all duration-300", isToday ? "border-zaia-500/50 ring-1 ring-zaia-500/20 bg-zaia-50/50 dark:bg-slate-800/60" : "hover:bg-slate-50 dark:hover:bg-slate-900/60")}>
                        <h3 className={cn("text-lg font-semibold mb-4 capitalize flex items-center gap-2", isToday ? "text-zaia-600 dark:text-zaia-300" : "text-slate-700 dark:text-slate-300")}>
                            {format(day, 'EEEE, dd/MM', { locale: ptBR })}
                            {isToday && <span className="text-xs bg-zaia-600 text-white px-2 py-0.5 rounded-full shadow-lg shadow-zaia-600/20">Hoje</span>}
                            <span className="text-xs text-slate-500 font-normal ml-auto">{dayAppointments.length} agendamentos</span>
                        </h3>

                        {dayAppointments.length === 0 ? (
                            <div className="flex items-center gap-2 text-slate-600 italic text-sm py-4 justify-center border-t border-white/5 border-dashed">
                                <CalendarX2 className="w-4 h-4 opacity-50" />
                                <span>Livre</span>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {dayAppointments.map(app => (
                                    <div
                                        key={app.id}
                                        onClick={() => setSelectedAppointment(app)}
                                        className="group relative flex items-center justify-between bg-white dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-white/5 hover:border-zaia-500/30 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:translate-x-1 cursor-pointer shadow-sm"
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-medium text-slate-900 dark:text-white group-hover:text-zaia-600 dark:group-hover:text-zaia-200 transition-colors">{app.client?.name || 'Cliente sem nome'}</span>
                                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                                <span>{app.client?.phone}</span>
                                                {app.origin && <span className="text-xs bg-slate-100 dark:bg-slate-700 px-1.5 rounded text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/5">{app.origin}</span>}
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{app.professional?.name}</span>
                                            <div className="flex items-center gap-2">
                                                <StatusBadge status={app.status} />
                                                {app.result && app.result !== 'NAO_DEFINIDO' && (
                                                    <span className={cn("text-xs px-2 py-0.5 rounded border font-bold",
                                                        app.result === 'COMPROU' ? "border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/10" : "border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/10"
                                                    )}>
                                                        {app.result === 'COMPROU' ? '$$$' : 'Zero'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )
            })}

            <AppointmentDetailsModal
                isOpen={!!selectedAppointment}
                onClose={() => setSelectedAppointment(null)}
                appointment={selectedAppointment}
                onUpdate={() => {
                    fetchAppointments()
                    // Keep modal open to show updated state? Or close?
                    // Let's reload data. The modal uses the `appointment` prop which is local state.
                    // We need to update local state `selectedAppointment` as well or just close.
                    // Ideally, we re-fetch effectively.
                    // For now, let's just re-fetch LIST. The modal is controlled by `selectedAppointment`.
                    // If we want the modal to reflect changes immediately we'd need to update selectedAppointment too.
                    // But wait, `fetchAppointments` updates the list. 
                    // Let's close the modal on major status changes or just re-fetch.
                    // For better UX, let's close on success for now, or just re-fetch and rely on list update 
                    // but the modal might be stale.
                    // Improvement: Update selectedAppointment with new data from list?
                    // Simple fix: fetchAppointments() then update selectedAppointment manually or just close it?
                    // User might want to toggle status then toggle result.
                    // I'll leave it open but re-fetch. I probably need to update the `selectedAppointment` object 
                    // to reflect the UI change immediately to avoid staleness if I don't close it.
                    // I will add a small logic to update `selectedAppointment` inside `onUpdate`?
                    // No, `onUpdate` is void.
                    // I will make `fetchAppointments` update `selectedAppointment` if it matches.
                }}
            />
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        'AGENDADO': 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/20',
        'COMPARECEU': 'bg-green-500/10 text-green-600 dark:text-green-300 border-green-500/20',
        'FALTOU': 'bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/20',
        'REMARCADO': 'bg-orange-500/10 text-orange-600 dark:text-orange-300 border-orange-500/20',
        'CANCELADO': 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600',
    }
    return (
        <span className={cn("text-xs px-2 py-1 rounded border font-medium", styles[status] || styles['AGENDADO'])}>
            {status}
        </span>
    )
}
