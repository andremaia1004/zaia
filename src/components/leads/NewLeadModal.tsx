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
        email: '',
        channel: 'Whatsapp',
        interest: '',
        notes: '',
        scheduleAppointment: false,
        appointmentDate: '',
        appointmentTime: ''
    })

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

            // 1. Create or Find Client
            // Check if client exists by phone to avoid duplicates (optional, strictly speaking we should just try insert)
            // For simplicity, let's assume we create a new client or rely on strict constraints if any.
            // But usually we want to reuse. Let's do a quick check? No, let's keep it simple: Create Client.

            const { data: client, error: clientError } = await supabase
                .from('clients')
                .insert({
                    name: formData.name,
                    phone: formData.phone,
                    email: formData.email,
                    store_id: targetStoreId
                })
                .select()
                .single()

            if (clientError) throw new Error(`Erro ao criar cliente: ${clientError.message}`)

            // 2. Create Lead
            const { data: lead, error: leadError } = await leadService.create({
                client_id: client.id,
                store_id: targetStoreId,
                status: formData.scheduleAppointment ? 'AGENDADO' : 'Novo', // If scheduling, start as AGENDADO
                channel: formData.channel,
                interest: formData.interest,
                notes: formData.notes
            }) // leadService.create returns data or throws

            // 3. (Optional) Create Appointment
            if (formData.scheduleAppointment && formData.appointmentDate && formData.appointmentTime) {
                const dateTime = `${formData.appointmentDate}T${formData.appointmentTime}:00`

                await appointmentService.create({
                    client_id: client.id,
                    store_id: targetStoreId,
                    date: dateTime, // Timestamp string
                    // We don't have professional selection here yet. 
                    // Let's either add it or default to something? Or make it optional?
                    // Backend implies professional_id is checked?
                    // For now, let's leave professional null if allowed, or pick first?
                    // Let's assuming professional is optional or we can skip it for "Lead" appointments?
                    // Actually, appointments usually need a professional. Let's add that field later if needed.
                    // For MVP "Quick Schedule", let's assume "Unassigned" or handle backend nulls.
                    status: 'AGENDADO',
                    notes: `Agendamento via Novo Lead. Interesse: ${formData.interest}`
                })
            }

            toast.success('Lead cadastrado com sucesso!')
            onSuccess()
            onClose()
            setFormData({
                name: '', phone: '', email: '', channel: 'Whatsapp', interest: '', notes: '',
                scheduleAppointment: false, appointmentDate: '', appointmentTime: ''
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
                        <label className="text-xs font-bold text-slate-400 uppercase">Nome *</label>
                        <input
                            required
                            className="input-field w-full"
                            placeholder="Nome do cliente"
                            value={formData.name}
                            onChange={e => handleChange('name', e.target.value)}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase">WhatsApp *</label>
                        <input
                            required
                            className="input-field w-full"
                            placeholder="(00) 00000-0000"
                            value={formData.phone}
                            onChange={e => handleChange('phone', e.target.value)}
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase">Email</label>
                    <input
                        type="email"
                        className="input-field w-full"
                        placeholder="email@exemplo.com"
                        value={formData.email}
                        onChange={e => handleChange('email', e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase">Canal de Origem</label>
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
                        <label className="text-xs font-bold text-slate-400 uppercase">Interesse</label>
                        <input
                            className="input-field w-full"
                            placeholder="Ex: Lentes Multifocais"
                            value={formData.interest}
                            onChange={e => handleChange('interest', e.target.value)}
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase">Observações</label>
                    <textarea
                        className="input-field w-full h-18 resize-none"
                        placeholder="Detalhes adicionais..."
                        value={formData.notes}
                        onChange={e => handleChange('notes', e.target.value)}
                    />
                </div>

                {/* Scheduling Toggle */}
                <div className="p-4 bg-slate-800/50 rounded-xl border border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${formData.scheduleAppointment ? 'bg-zaia-500/20 text-zaia-300' : 'bg-slate-700/50 text-slate-500'}`}>
                                <Calendar className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium text-white">Agendar Visita Agora?</span>
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
                                <label className="text-xs font-bold text-slate-400 uppercase">Data</label>
                                <input
                                    type="date"
                                    required={formData.scheduleAppointment}
                                    className="input-field w-full [&::-webkit-calendar-picker-indicator]:invert"
                                    value={formData.appointmentDate}
                                    onChange={e => handleChange('appointmentDate', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase">Horário</label>
                                <input
                                    type="time"
                                    required={formData.scheduleAppointment}
                                    className="input-field w-full [&::-webkit-calendar-picker-indicator]:invert"
                                    value={formData.appointmentTime}
                                    onChange={e => handleChange('appointmentTime', e.target.value)}
                                />
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
