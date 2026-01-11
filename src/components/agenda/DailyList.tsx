'use client'
import { useState, useEffect } from 'react'
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { appointmentService } from '@/services/appointments'
import { type Appointment } from '@/services/types'
import { AppointmentDetailsModal } from '@/components/agenda/AppointmentDetailsModal'
import { CalendarX2, MessageCircle, Check, X, DollarSign, Undo2 } from 'lucide-react'
import { toast } from 'sonner'

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

    const handleStatusChange = async (e: React.MouseEvent, id: string, newStatus: string) => {
        e.stopPropagation() // Prevent opening modal
        try {
            await appointmentService.updateStatus(id, newStatus)
            toast.success(`Status atualizado para ${newStatus}`)
            fetchAppointments()
        } catch (error) {
            console.error(error)
            toast.error('Erro ao atualizar status')
        }
    }

    const handleWhatsApp = (e: React.MouseEvent, phone: string, clientName: string) => {
        e.stopPropagation()
        const cleanPhone = phone.replace(/\D/g, '')
        const message = `Olá ${clientName}, tudo bem? Gostaríamos de confirmar seu agendamento na *Zaia Ótica*.`
        const url = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`
        window.open(url, '_blank')
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
                                        className="group relative flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-white/5 hover:border-zaia-500/30 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:translate-x-1 cursor-pointer shadow-sm gap-4 sm:gap-0"
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-medium text-slate-900 dark:text-white group-hover:text-zaia-600 dark:group-hover:text-zaia-200 transition-colors text-base">{app.client?.name || 'Cliente sem nome'}</span>
                                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mt-1">
                                                <span>{app.client?.phone}</span>
                                                {app.origin && <span className="text-xs bg-slate-100 dark:bg-slate-700 px-1.5 rounded text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/5">{app.origin}</span>}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 self-end sm:self-auto">
                                            {/* Quick Actions */}
                                            <div className="flex items-center gap-1 mr-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
                                                <button
                                                    onClick={(e) => handleWhatsApp(e, app.client?.phone || '', app.client?.name || '')}
                                                    className="p-1.5 rounded-md hover:bg-green-100 text-green-600 dark:text-green-400 dark:hover:bg-green-900/30 transition-colors"
                                                    title="Enviar WhatsApp"
                                                >
                                                    <MessageCircle className="w-4 h-4" />
                                                </button>

                                                {app.status !== 'COMPARECEU' && (
                                                    <button
                                                        onClick={(e) => handleStatusChange(e, app.id, 'COMPARECEU')}
                                                        className="p-1.5 rounded-md hover:bg-blue-100 text-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
                                                        title="Marcar como Compareceu"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                )}

                                                {app.status !== 'FALTOU' && app.status !== 'CANCELADO' && (
                                                    <button
                                                        onClick={(e) => handleStatusChange(e, app.id, 'FALTOU')}
                                                        className="p-1.5 rounded-md hover:bg-red-100 text-red-600 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors"
                                                        title="Marcar como Faltou"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}

                                                {(app.status === 'FALTOU' || app.status === 'CANCELADO') && (
                                                    <button
                                                        onClick={(e) => handleStatusChange(e, app.id, 'AGENDADO')}
                                                        className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 dark:text-slate-400 dark:hover:bg-slate-700/30 transition-colors"
                                                        title="Desfazer / Reagendar"
                                                    >
                                                        <Undo2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="flex flex-col items-end gap-1 min-w-[100px]">
                                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{app.professional?.name}</span>
                                                <div className="flex items-center gap-2">
                                                    <StatusBadge status={app.status} />
                                                    {app.result && app.result !== 'NAO_DEFINIDO' && (
                                                        <span className={cn("text-xs px-2 py-0.5 rounded border font-bold flex items-center gap-1",
                                                            app.result === 'COMPROU' ? "border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/10" : "border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/10"
                                                        )}>
                                                            {app.result === 'COMPROU' ? <DollarSign className="w-3 h-3" /> : null}
                                                            {app.result === 'COMPROU' ? 'Venda' : 'Zero'}
                                                        </span>
                                                    )}
                                                </div>
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
