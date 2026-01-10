'use client'
import { useState, useEffect } from 'react'
import { startOfMonth, endOfMonth, format, isSameDay, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { appointmentService } from '@/services/appointments'
import { type Appointment } from '@/services/types'
import { useAuth } from '@/contexts/AuthContext'
import { AppointmentDetailsModal } from '@/components/agenda/AppointmentDetailsModal'
import { CalendarX2, Calendar, Loader2 } from 'lucide-react'

export function MonthlyList({ currentDate }: { currentDate: Date }) {
    const { selectedStore, profile } = useAuth()
    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)

    const start = startOfMonth(currentDate)
    const end = endOfMonth(currentDate)

    useEffect(() => {
        fetchAppointments()
    }, [currentDate, selectedStore, profile])

    const fetchAppointments = async () => {
        setLoading(true)
        const startDate = format(start, 'yyyy-MM-dd')
        const endDate = format(end, 'yyyy-MM-dd')

        const targetStoreId = selectedStore?.id || profile?.store_id

        // Prevent fetching if no store context (unless super admin viewing all? No, we want filtered views)
        if (!targetStoreId && profile?.role !== 'super_admin') {
            setAppointments([])
            setLoading(false)
            return
        }

        try {
            const data = await appointmentService.getByDateRange(startDate, endDate, targetStoreId)
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

    // Group appointments by date
    const groupedAppointments = appointments.reduce((groups, app) => {
        const dateKey = app.date
        if (!groups[dateKey]) {
            groups[dateKey] = []
        }
        groups[dateKey].push(app)
        return groups
    }, {} as Record<string, Appointment[]>)

    // Sort dates
    const sortedDates = Object.keys(groupedAppointments).sort()

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-12 h-12 text-zaia-500 animate-spin opacity-50" />
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {sortedDates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 glass-panel">
                    <CalendarX2 className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium">Nenhuma consulta neste mês</p>
                    <p className="text-sm">Utilize o botão "Adicionar Consulta" para agendar.</p>
                </div>
            ) : (
                sortedDates.map((dateKey) => {
                    const dayAppointments = groupedAppointments[dateKey]
                    const dateObj = parseISO(dateKey)
                    const isToday = isSameDay(dateObj, new Date())

                    return (
                        <div key={dateKey} className="relative pl-8 border-l border-zaia-500/20 pb-4 last:pb-0">
                            {/* Timeline dot */}
                            <div className={cn(
                                "absolute -left-1.5 top-0 w-3 h-3 rounded-full ring-4 ring-white dark:ring-slate-950",
                                isToday ? "bg-zaia-500" : "bg-slate-300 dark:bg-slate-700"
                            )} />

                            <h3 className={cn("text-xl font-display font-semibold mb-4 capitalize flex items-center gap-3", isToday ? "text-zaia-600 dark:text-zaia-300" : "text-slate-800 dark:text-slate-200")}>
                                {format(dateObj, "dd 'de' MMMM", { locale: ptBR })}
                                <span className="opacity-50 text-base font-normal">- {format(dateObj, 'EEEE', { locale: ptBR })}</span>
                                {isToday && <span className="text-xs bg-zaia-600 text-white px-2 py-0.5 rounded-full font-sans shadow-lg shadow-zaia-600/20">Hoje</span>}
                            </h3>

                            <div className="grid gap-3">
                                {dayAppointments.map(app => (
                                    <div
                                        key={app.id}
                                        onClick={() => setSelectedAppointment(app)}
                                        className="group relative flex items-center justify-between bg-white dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-white/5 hover:border-zaia-500/30 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer shadow-sm hover:transform hover:translate-x-1"
                                    >
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-slate-900 dark:text-white text-lg group-hover:text-zaia-600 dark:group-hover:text-zaia-200 transition-colors">{app.client?.name || 'Cliente sem nome'}</span>
                                                {app.origin && <span className="text-xs bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/5">{app.origin}</span>}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                                <span className="flex items-center gap-1">
                                                    📱 {app.client?.phone}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{app.professional?.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <StatusBadge status={app.status} />
                                                {app.result && app.result !== 'NAO_DEFINIDO' && (
                                                    <span className={cn("text-xs px-2 py-1 rounded border font-bold",
                                                        app.result === 'COMPROU' ? "border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/10" : "border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/10"
                                                    )}>
                                                        {app.result === 'COMPROU' ? 'VENDA' : 'SEM VENDA'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })
            )}

            <AppointmentDetailsModal
                isOpen={!!selectedAppointment}
                onClose={() => setSelectedAppointment(null)}
                appointment={selectedAppointment}
                onUpdate={() => {
                    fetchAppointments()
                    // If we updated the currently selected appointment (e.g. status change), 
                    // we might want to close it or keep it open. 
                    // The original list logic just re-fetched. Let's stick to that.
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
        'CANCELADO': 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-500 border-slate-200 dark:border-slate-600/50 line-through',
    }
    return (
        <span className={cn("text-xs px-2.5 py-1 rounded-md border font-medium shadow-sm backdrop-blur-sm", styles[status] || styles['AGENDADO'])}>
            {status}
        </span>
    )
}
