'use client'
import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { appointmentService } from '@/services/appointments'
import { clientService } from '@/services/clients'
import type { Client, Appointment } from '@/services/types'
import { format } from 'date-fns'
import { Calendar, User, Phone, Tag } from 'lucide-react'

interface ClientDetailsModalProps {
    isOpen: boolean
    onClose: () => void
    client: Client | null
}

export function ClientDetailsModal({ isOpen, onClose, client }: ClientDetailsModalProps) {
    const [history, setHistory] = useState<Appointment[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isOpen && client) {
            fetchHistory(client.id)
        }
    }, [isOpen, client])

    const fetchHistory = async (id: string) => {
        setLoading(true)
        const data = await appointmentService.getByClientId(id)
        setHistory(data)
        setLoading(false)
    }

    if (!client) return null

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Histórico do Cliente">
            <div className="space-y-6">

                {/* Header Info */}
                <div className="flex items-start justify-between bg-slate-800/50 p-4 rounded-lg border border-white/5">
                    <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-full bg-zaia-500/20 flex items-center justify-center text-zaia-300 font-bold text-xl">
                            {client.name.charAt(0)}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white mb-1">{client.name}</h3>
                            <div className="flex items-center gap-4 text-sm text-slate-400">
                                <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {client.phone}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Timeline / History */}
                <div>
                    <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">Histórico de Atendimentos</h4>

                    {loading ? (
                        <div className="text-center py-4 text-slate-500">Carregando histórico...</div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-8 bg-slate-800/30 rounded-lg text-slate-500">
                            Nenhum atendimento registrado.
                        </div>
                    ) : (
                        <div className="space-y-3 relative before:absolute before:left-4 before:top-0 before:bottom-0 before:w-px before:bg-white/10 before:z-0">
                            {history.map(app => (
                                <div key={app.id} className="relative z-10 pl-10 group">
                                    <div className="absolute left-1.5 top-2 w-5 h-5 rounded-full bg-slate-900 border-2 border-slate-700 group-hover:border-zaia-500 transition-colors flex items-center justify-center">
                                        <div className={`w-2 h-2 rounded-full ${app.result === 'COMPROU' ? 'bg-green-500' : 'bg-slate-500'}`} />
                                    </div>

                                    <div className="glass-card p-4 hover:bg-slate-800/80 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-zaia-400" />
                                                <span className="font-semibold text-white">
                                                    {format(new Date(app.date), 'dd/MM/yyyy')}
                                                </span>
                                            </div>
                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${app.status === 'COMPARECEU' ? 'bg-green-500/10 text-green-400' :
                                                app.status === 'FALTOU' ? 'bg-red-500/10 text-red-400' :
                                                    'bg-blue-500/10 text-blue-400'
                                                }`}>
                                                {app.status}
                                            </span>
                                        </div>

                                        <div className="text-sm text-slate-300 mb-1">
                                            Profissional: <span className="text-white">{app.professional?.name}</span>
                                        </div>

                                        {app.result === 'COMPROU' && (
                                            <div className="text-sm text-emerald-400 font-medium">
                                                Venda: R$ {app.value ? app.value.toFixed(2) : '0.00'}
                                            </div>
                                        )}

                                        {app.notes && (
                                            <div className="mt-2 text-xs text-slate-500 italic border-t border-white/5 pt-2">
                                                "{app.notes}"
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    )
}
