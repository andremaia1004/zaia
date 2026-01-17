'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { leadService } from '@/services/leads'
import { appointmentService } from '@/services/appointments'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { clientService } from '@/services/clients'
import { professionalService } from '@/services/professionals'
import { type Professional } from '@/services/types'
import { useEffect } from 'react'

interface NewLeadModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export function NewLeadModal({ isOpen, onClose, onSuccess }: NewLeadModalProps) {
    const { selectedStore, profile } = useAuth()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        channel: 'Whatsapp',
        interest: '',
        notes: '',
        scheduleAppointment: false,
        appointmentDate: '',
        professionalId: ''
    })
    const [professionals, setProfessionals] = useState<Professional[]>([])

    useEffect(() => {
        if (isOpen) {
            fetchProfessionals()
        }
    }, [isOpen, selectedStore, profile])

    const fetchProfessionals = async () => {
        const targetStoreId = selectedStore?.id || profile?.store_id
        if (targetStoreId || profile?.role === 'super_admin') {
            const data = await professionalService.getAllActive(targetStoreId)
            setProfessionals(data)
            // Auto-select first if available
            if (data.length > 0) {
                setFormData(prev => ({ ...prev, professionalId: data[0].id }))
            }
        }
    }

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const targetStoreId = selectedStore?.id || profile?.store_id
            if (!targetStoreId && profile?.role !== 'super_admin') {
                throw new Error('Nenhuma loja selecionada.')
            }

            const supabase = createClient()

            // 1. Create or Find Client (Optimized into 1 call)
            let clientId = ''
            try {
                const client = await clientService.upsert({
                    name: formData.name,
                    phone: formData.phone,
                    store_id: targetStoreId
                })
                clientId = client.id
            } catch (clientError: any) {
                // Handle case where phone exists in another store if constraint wasn't perfectly fixed
                if (clientError.code === '23505') {
                    throw new Error('Este telefone já está cadastrado em outra unidade.')
                }
                throw clientError
            }

            // 2. Parallel Creation (Lead + Optional Appointment)
            const promises: Promise<any>[] = []

            promises.push(leadService.create({
                client_id: clientId,
                store_id: targetStoreId,
                status: formData.scheduleAppointment ? 'AGENDADO' : 'NOVO',
                channel: formData.channel,
                interest: formData.interest,
                notes: formData.notes
            }))

            if (formData.scheduleAppointment && formData.appointmentDate) {
                if (!formData.professionalId) {
                    throw new Error('Por favor, selecione um profissional para o agendamento.')
                }
                const dateTime = `${formData.appointmentDate}T09:00:00`
                promises.push(appointmentService.create({
                    client_id: clientId,
                    professional_id: formData.professionalId,
                    store_id: targetStoreId,
                    date: dateTime,
                    status: 'AGENDADO',
                    notes: `Agendamento via Novo Lead. Interesse: ${formData.interest}`
                }))
            }

            await Promise.all(promises)

            toast.success('Lead cadastrado com sucesso!')
            onSuccess()
            onClose()
            setFormData({
                name: '', phone: '', channel: 'Whatsapp', interest: '', notes: '',
                scheduleAppointment: false, appointmentDate: '', professionalId: professionals[0]?.id || ''
            })

        } catch (error: any) {
            console.error(error)
            toast.error(error.message || 'Erro ao criar lead')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Novo Lead">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Nome *</label>
                        <input
                            required
                            className="input-field w-full"
                            placeholder="Nome do cliente"
                            value={formData.name}
                            onChange={e => handleChange('name', e.target.value)}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">WhatsApp *</label>
                        <input
                            required
                            className="input-field w-full"
                            placeholder="(00) 00000-0000"
                            value={formData.phone}
                            onChange={e => handleChange('phone', e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Canal de Origem</label>
                        <select
                            className="input-field w-full"
                            value={formData.channel}
                            onChange={e => handleChange('channel', e.target.value)}
                        >
                            <option value="Whatsapp">WhatsApp</option>
                            <option value="Instagram">Instagram</option>
                            <option value="Google">Google</option>
                            <option value="Indicação">Indicação</option>
                            <option value="Facebook">Facebook</option>
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Interesse</label>
                        <input
                            className="input-field w-full"
                            placeholder="Ex: Lentes Multifocais"
                            value={formData.interest}
                            onChange={e => handleChange('interest', e.target.value)}
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Observações</label>
                    <textarea
                        className="input-field w-full h-18 resize-none"
                        placeholder="Detalhes adicionais..."
                        value={formData.notes}
                        onChange={e => handleChange('notes', e.target.value)}
                    />
                </div>

                {/* Scheduling Toggle */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${formData.scheduleAppointment ? 'bg-zaia-500/10 text-zaia-600 dark:text-zaia-300' : 'bg-slate-200 dark:bg-slate-700/50 text-slate-500'}`}>
                                <Calendar className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium text-slate-900 dark:text-white">Agendar Visita Agora?</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={formData.scheduleAppointment}
                                onChange={e => handleChange('scheduleAppointment', e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zaia-500"></div>
                        </label>
                    </div>

                    {formData.scheduleAppointment && (
                        <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Data</label>
                                <input
                                    type="date"
                                    required={formData.scheduleAppointment}
                                    className="input-field w-full dark:[&::-webkit-calendar-picker-indicator]:invert"
                                    value={formData.appointmentDate}
                                    onChange={e => handleChange('appointmentDate', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Profissional</label>
                                <select
                                    required={formData.scheduleAppointment}
                                    className="input-field w-full"
                                    value={formData.professionalId}
                                    onChange={e => handleChange('professionalId', e.target.value)}
                                >
                                    <option value="">Selecione...</option>
                                    {professionals.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full btn-primary py-3 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Cadastrar Lead'}
                    </button>
                </div>
            </form>
        </Modal>
    )
}
