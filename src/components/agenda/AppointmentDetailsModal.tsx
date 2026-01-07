'use client'
import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { appointmentService } from '@/services/appointments'
import { professionalService } from '@/services/professionals'
import type { Appointment, Professional } from '@/services/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Pencil, Save, X } from 'lucide-react'

interface AppointmentDetailsModalProps {
    isOpen: boolean
    onClose: () => void
    onUpdate: () => void
    appointment: Appointment | null
}

export function AppointmentDetailsModal({ isOpen, onClose, onUpdate, appointment }: AppointmentDetailsModalProps) {
    const [loading, setLoading] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [professionals, setProfessionals] = useState<Professional[]>([])
    const [editForm, setEditForm] = useState({
        date: '',
        professional_id: '',
        notes: ''
    })
    const [rescheduleDate, setRescheduleDate] = useState('')
    const [showRescheduleInput, setShowRescheduleInput] = useState(false)

    useEffect(() => {
        if (isOpen && appointment) {
            setIsEditing(false)
            setShowRescheduleInput(false)
            setRescheduleDate('')
            setEditForm({
                date: appointment.date,
                professional_id: appointment.professional_id,
                notes: appointment.notes || ''
            })
            professionalService.getAllActive().then(setProfessionals)
        }
    }, [isOpen, appointment])

    if (!appointment) return null

    const handleSaveEdit = async () => {
        setLoading(true)
        try {
            await appointmentService.update(appointment.id, {
                date: editForm.date,
                professional_id: editForm.professional_id,
                notes: editForm.notes
            })
            setIsEditing(false)
            onUpdate()
        } catch (error) {
            console.error(error)
            alert('Erro ao atualizar agendamento')
        } finally {
            setLoading(false)
        }
    }

    const handleStatusChange = async (newStatus: string) => {
        if (newStatus === 'REMARCADO') {
            setShowRescheduleInput(true)
            return
        }

        // Changing to any other status hides the reschedule input
        setShowRescheduleInput(false)

        setLoading(true)
        try {
            // Logic: If status is not COMPARECEU, we must reset result and value
            const updates: Partial<Appointment> = { status: newStatus as Appointment['status'] }
            if (newStatus !== 'COMPARECEU') {
                updates.result = 'NAO_DEFINIDO'
                updates.value = 0 // or null, depending on DB. 0 is safer for number? Let's check interface. Optional number.
                // If I send null via partial dictionary it might work.
                // Let's assume sending result 'NAO_DEFINIDO' is enough to hide UI.
            }

            await appointmentService.update(appointment.id, updates)

            onUpdate()
            if (newStatus === 'CANCELADO' || newStatus === 'FALTOU') {
                onClose()
            }
        } catch (error) {
            console.error(error)
            alert('Erro ao atualizar status')
        } finally {
            setLoading(false)
        }
    }

    const handleRescheduleConfirm = async () => {
        if (!rescheduleDate) return
        setLoading(true)
        try {
            // Move appointment to new date and reset status to 'AGENDADO'
            await appointmentService.update(appointment.id, {
                date: rescheduleDate,
                status: 'AGENDADO',
                result: 'NAO_DEFINIDO' // Reset result too just in case
            })
            onUpdate() // List updates
            onClose()  // Close modal as it moved
        } catch (error) {
            console.error(error)
            alert('Erro ao remarcar')
        } finally {
            setLoading(false)
        }
    }

    const handleResultChange = async (newResult: string) => {
        setLoading(true)
        try {
            // Ensure status is 'COMPARECEU' if we are setting a result
            await appointmentService.updateStatus(appointment.id, 'COMPARECEU', newResult)
            onUpdate()
        } catch (error) {
            console.error(error)
            alert('Erro ao atualizar resultado')
        } finally {
            setLoading(false)
        }
    }

    const handleRejectionReasonSave = async (reason: string) => {
        // Save explanation to notes
        try {
            await appointmentService.update(appointment.id, { notes: reason })
            onUpdate()
        } catch (error) {
            console.error(error)
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Agendamento">
            <div className="space-y-6">
                <div className="space-y-2 relative">
                    <div className="absolute right-0 top-0">
                        {!isEditing ? (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                        ) : (
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="p-2 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={handleSaveEdit}
                                    disabled={loading}
                                    className="p-2 text-green-400 hover:text-green-300 rounded-lg hover:bg-green-500/10"
                                >
                                    <Save className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    <h3 className="text-xl font-bold text-white pr-10">{appointment.client?.name}</h3>
                    <p className="text-slate-400">{appointment.client?.phone}</p>

                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        {isEditing ? (
                            <input
                                type="date"
                                className="input-field py-1 text-sm w-auto"
                                value={editForm.date}
                                onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                            />
                        ) : (
                            <span>{format(new Date(appointment.date), "dd 'de' MMMM", { locale: ptBR })}</span>
                        )}
                        <span>•</span>
                        <span>{appointment.origin}</span>
                    </div>

                    {isEditing ? (
                        <div className="space-y-2 mt-2">
                            <select
                                className="input-field py-1 text-sm text-white bg-slate-800 border-white/10"
                                value={editForm.professional_id}
                                onChange={e => setEditForm({ ...editForm, professional_id: e.target.value })}
                            >
                                <option value="">Selecione...</option>
                                {professionals.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            <textarea
                                className="input-field text-sm min-h-[60px]"
                                value={editForm.notes}
                                onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                                placeholder="Observações..."
                            />
                        </div>
                    ) : (
                        appointment.notes && (
                            <div className="bg-slate-800/50 p-3 rounded-lg text-sm text-slate-300 italic border border-white/5 mt-2">
                                "{appointment.notes}"
                            </div>
                        )
                    )}
                </div>

                <div className="space-y-4 pt-4 border-t border-white/10">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">Status</label>
                        <div className="flex flex-wrap gap-2">
                            {['AGENDADO', 'COMPARECEU', 'FALTOU', 'REMARCADO', 'CANCELADO'].map(status => (
                                <button
                                    key={status}
                                    disabled={loading}
                                    onClick={() => handleStatusChange(status)}
                                    className={`px-3 py-1.5 rounded-lg text-sm transition-all border ${appointment.status === status && !showRescheduleInput
                                        ? 'bg-zaia-600 border-zaia-500 text-white shadow-lg shadow-zaia-500/20'
                                        : status === 'REMARCADO' && showRescheduleInput
                                            ? 'bg-orange-500/20 border-orange-500 text-orange-300'
                                            : 'bg-slate-800 border-white/5 text-slate-400 hover:bg-slate-700 hover:text-white'
                                        }`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>

                        {showRescheduleInput && (
                            <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                                <label className="text-sm text-slate-400 block mb-1">Para qual data?</label>
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        className="input-field text-white"
                                        value={rescheduleDate}
                                        onChange={e => setRescheduleDate(e.target.value)}
                                    />
                                    <button
                                        onClick={handleRescheduleConfirm}
                                        disabled={!rescheduleDate || loading}
                                        className="btn-primary whitespace-nowrap"
                                    >
                                        Confirmar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {!showRescheduleInput && appointment.status === 'COMPARECEU' && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">Resultado da Venda</label>
                            <div className="flex gap-2">
                                <button
                                    disabled={loading}
                                    onClick={() => handleResultChange('COMPROU')}
                                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${appointment.result === 'COMPROU'
                                        ? 'bg-green-600/20 border-green-500 text-green-300'
                                        : 'bg-slate-800 border-white/5 text-slate-400 hover:bg-green-600/10 hover:border-green-500/50 hover:text-green-300'
                                        }`}
                                >
                                    💵 Vendeu
                                </button>
                                <button
                                    disabled={loading}
                                    onClick={() => handleResultChange('NAO_COMPROU')}
                                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${appointment.result === 'NAO_COMPROU'
                                        ? 'bg-red-600/20 border-red-500 text-red-300'
                                        : 'bg-slate-800 border-white/5 text-slate-400 hover:bg-red-600/10 hover:border-red-500/50 hover:text-red-300'
                                        }`}
                                >
                                    ❌ Não Vendeu
                                </button>
                            </div>

                            {appointment.result === 'COMPROU' && (
                                <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <label className="text-sm font-medium text-green-400 uppercase tracking-wider block mb-1">Valor da Venda (R$)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="0,00"
                                            className="input-field text-white font-mono text-lg"
                                            defaultValue={appointment.value}
                                            id="sales-value-input"
                                        />
                                        <button
                                            onClick={() => {
                                                const el = document.getElementById('sales-value-input') as HTMLInputElement
                                                const val = parseFloat(el.value)
                                                if (!isNaN(val)) {
                                                    setLoading(true)
                                                    appointmentService.update(appointment.id, { value: val })
                                                        .then(() => {
                                                            onUpdate()
                                                            setLoading(false)
                                                            alert('Valor salvo!')
                                                        })
                                                }
                                            }}
                                            disabled={loading}
                                            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors"
                                        >
                                            Salvar
                                        </button>
                                    </div>
                                </div>
                            )}

                            {appointment.result === 'NAO_COMPROU' && (
                                <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <label className="text-sm font-medium text-red-400 uppercase tracking-wider block mb-1">Motivo / Observação</label>
                                    <div className="space-y-2">
                                        <textarea
                                            placeholder="Por que o cliente não comprou?"
                                            className="input-field text-white min-h-[80px]"
                                            defaultValue={appointment.notes}
                                            id="rejection-reason-input"
                                        />
                                        <div className="flex justify-end">
                                            <button
                                                onClick={() => {
                                                    const el = document.getElementById('rejection-reason-input') as HTMLTextAreaElement
                                                    handleRejectionReasonSave(el.value)
                                                }}
                                                disabled={loading}
                                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                                            >
                                                Salvar Observação
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="pt-4 flex justify-end">
                    <button
                        onClick={onClose}
                        className="text-slate-500 hover:text-white text-sm"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </Modal>
    )
}
