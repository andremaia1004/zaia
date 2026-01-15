'use client'
import { useState, useEffect } from 'react'
import { professionalService } from '@/services/professionals'
import { clientService } from '@/services/clients'
import { appointmentService } from '@/services/appointments'
import { leadService } from '@/services/leads'
import { notificationService } from '@/services/notifications'
import type { Professional, Client } from '@/services/types'
import { Modal } from '@/components/ui/Modal'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import { Search, X } from 'lucide-react'

const appointmentSchema = z.object({
    date: z.string().min(1, 'Data é obrigatória'),
    professional_id: z.string().min(1, 'Selecione um profissional'),
    client_name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    client_phone: z.string().min(10, 'Telefone inválido'),
    client_email: z.string().email('Email inválido').optional().or(z.literal('')),
    notes: z.string().optional(),
    origin: z.string().min(1, 'Selecione a origem')
})


type AppointmentFormData = z.infer<typeof appointmentSchema>

interface AppointmentModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    preselectedDate?: Date
    initialData?: {
        client_name?: string
        client_phone?: string
        notes?: string
        origin?: string
    }
}

export function AppointmentModal({ isOpen, onClose, onSuccess, preselectedDate, initialData }: AppointmentModalProps) {
    const { selectedStore, profile } = useAuth()
    const [loading, setLoading] = useState(false)
    const [loadingProfessionals, setLoadingProfessionals] = useState(false)
    const [professionals, setProfessionals] = useState<Professional[]>([])
    const [isExistingClient, setIsExistingClient] = useState(false)
    const [clientSearchTerm, setClientSearchTerm] = useState('')
    const [clientSearchResults, setClientSearchResults] = useState<Client[]>([])
    const [isSearchingClient, setIsSearchingClient] = useState(false)
    const [selectedClient, setSelectedClient] = useState<Client | null>(null)

    // Determine the target store: selected store (for super admin) or user's assigned store
    const targetStoreId = selectedStore?.id || profile?.store_id

    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<AppointmentFormData>({
        resolver: zodResolver(appointmentSchema),
        defaultValues: {
            date: format(new Date(), 'yyyy-MM-dd'),
            professional_id: '',
            client_name: '',
            client_phone: '',
            client_email: '',
            notes: '',
            origin: 'WhatsApp'
        }
    })

    useEffect(() => {
        if (isOpen && targetStoreId) {
            setLoadingProfessionals(true)
            professionalService.getAllActive(targetStoreId)
                .then(setProfessionals)
                .finally(() => setLoadingProfessionals(false))

            setValue('date', preselectedDate ? format(preselectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'))

            if (initialData) {
                setValue('client_name', initialData.client_name || '')
                setValue('client_phone', initialData.client_phone || '')
                setValue('notes', initialData.notes || '')
                setValue('origin', initialData.origin || 'WhatsApp')
            }
        } else {
            if (!isOpen) {
                reset()
                setIsExistingClient(false)
                setSelectedClient(null)
                setClientSearchTerm('')
                setClientSearchResults([])
            }
        }
    }, [isOpen, targetStoreId, initialData, preselectedDate, setValue, reset])

    useEffect(() => {
        const searchClients = async () => {
            if (!clientSearchTerm || clientSearchTerm.length < 3) {
                setClientSearchResults([])
                return
            }
            setIsSearchingClient(true)
            try {
                const results = await clientService.search(clientSearchTerm, targetStoreId)
                setClientSearchResults(results)
            } catch (error) {
                console.error(error)
            } finally {
                setIsSearchingClient(false)
            }
        }

        const timeout = setTimeout(searchClients, 500)
        return () => clearTimeout(timeout)
    }, [clientSearchTerm, targetStoreId])

    const handleSelectClient = (client: Client) => {
        setSelectedClient(client)
        setValue('client_name', client.name)
        setValue('client_phone', client.phone)
        setValue('client_email', client.email || '')
        setClientSearchTerm('')
        setClientSearchResults([])
    }

    const clearSelectedClient = () => {
        setSelectedClient(null)
        setValue('client_name', '')
        setValue('client_phone', '')
        setValue('client_email', '')
    }

    const onSubmit = async (data: AppointmentFormData) => {
        setLoading(true)

        try {
            let client;

            if (isExistingClient && selectedClient) {
                client = selectedClient
            } else {
                // 1. Search for existing client or create new
                client = await clientService.getByPhone(data.client_phone)

                if (!client) {
                    client = await clientService.create({
                        name: data.client_name,
                        phone: data.client_phone,
                        email: data.client_email || undefined,
                        store_id: targetStoreId
                    })
                }
            }

            if (!client) throw new Error("Falha ao identificar cliente")

            // 2. Create Appointment
            await appointmentService.create({
                date: data.date,
                professional_id: data.professional_id,
                client_id: client.id,
                notes: data.notes,
                origin: data.origin,
                status: 'AGENDADO',
                result: 'NAO_DEFINIDO',
                store_id: targetStoreId
            })

            // 3. Side effects in parallel (don't block the UI)
            Promise.allSettled([
                // Create Notification for the Professional
                (async () => {
                    const targetProfessional = professionals.find(p => p.id === data.professional_id)
                    if (targetProfessional?.user_id) {
                        await notificationService.create({
                            user_id: targetProfessional.user_id,
                            store_id: targetStoreId!,
                            title: 'Nova Consulta Agendada',
                            message: `Nova consulta para ${client.name} em ${format(new Date(data.date + 'T12:00:00'), 'dd/MM/yyyy')}.`,
                            type: 'info',
                            link: '/agenda'
                        })
                    }
                })(),
                // Auto-create/Update Lead in Pipeline
                leadService.create({
                    client_id: client.id,
                    status: 'AGENDADO',
                    channel: data.origin,
                    interest: 'Consulta Geral',
                    store_id: targetStoreId
                })
            ]).then(results => {
                results.forEach((res, i) => {
                    if (res.status === 'rejected') {
                        console.error(`Side effect ${i} failed:`, res.reason)
                    }
                })
            })

            onSuccess()
            toast.success('Consulta agendada com sucesso!')
            onClose()
        } catch (error) {
            console.error(error)
            toast.error('Erro ao agendar. Verifique os dados.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Adicionar Consulta">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-sm text-slate-500 dark:text-slate-400">Data da Consulta</label>
                        <input
                            type="date"
                            className="input-field text-slate-900 dark:text-white bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10"
                            {...register('date')}
                        />
                        {errors.date && <p className="text-xs text-red-500 underline">{errors.date.message}</p>}
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm text-slate-500 dark:text-slate-400">Origem</label>
                        <select
                            className="input-field text-slate-900 dark:text-white bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10"
                            {...register('origin')}
                        >
                            <option value="WhatsApp">WhatsApp</option>
                            <option value="Instagram">Instagram</option>
                            <option value="Indicação">Indicação</option>
                            <option value="Passante">Passante</option>
                        </select>
                        {errors.origin && <p className="text-xs text-red-500 underline">{errors.origin.message}</p>}
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-sm text-slate-500 dark:text-slate-400">Profissional</label>
                    <select
                        className="input-field text-slate-900 dark:text-white bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10"
                        {...register('professional_id')}
                        disabled={loadingProfessionals}
                    >
                        <option value="">{loadingProfessionals ? 'Carregando...' : 'Selecione...'}</option>
                        {professionals.map(p => (
                            <option key={p.id} value={p.id}>{p.name} - {p.role}</option>
                        ))}
                    </select>
                    {errors.professional_id && <p className="text-xs text-red-500 underline">{errors.professional_id.message}</p>}
                </div>

                <div className="flex items-center gap-2 pb-2 mt-4">
                    <input
                        type="checkbox"
                        id="existingClient"
                        checked={isExistingClient}
                        onChange={(e) => {
                            setIsExistingClient(e.target.checked)
                            if (!e.target.checked) {
                                clearSelectedClient()
                            }
                        }}
                        className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                    />
                    <label htmlFor="existingClient" className="text-sm font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
                        Já é cliente?
                    </label>
                </div>

                {isExistingClient && !selectedClient && (
                    <div className="space-y-1 relative">
                        <label className="text-sm text-slate-500 dark:text-slate-400">Buscar Cliente</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                className="input-field pl-9 text-slate-900 dark:text-white bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10"
                                placeholder="Buscar por nome ou telefone..."
                                value={clientSearchTerm}
                                onChange={(e) => setClientSearchTerm(e.target.value)}
                            />
                            {isSearchingClient && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                                </div>
                            )}
                        </div>
                        {clientSearchResults.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {clientSearchResults.map(client => (
                                    <button
                                        key={client.id}
                                        type="button"
                                        onClick={() => handleSelectClient(client)}
                                        className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                                    >
                                        <div className="font-medium text-slate-900 dark:text-white">{client.name}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">{client.phone}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {isExistingClient && selectedClient && (
                    <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 flex items-center justify-between mb-4">
                        <div>
                            <div className="text-sm font-medium text-primary">Cliente Selecionado</div>
                            <div className="text-slate-900 dark:text-white font-medium">{selectedClient.name}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{selectedClient.phone}</div>
                        </div>
                        <button
                            type="button"
                            onClick={clearSelectedClient}
                            className="p-1 hover:bg-primary/20 rounded-full text-primary transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}

                <div className="space-y-1">
                    <label className="text-sm text-slate-500 dark:text-slate-400">Nome do Cliente</label>
                    <input
                        type="text"
                        className="input-field text-slate-900 dark:text-white bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800/50"
                        placeholder="Nome completo"
                        {...register('client_name')}
                        readOnly={isExistingClient && !!selectedClient}
                    />
                    {errors.client_name && <p className="text-xs text-red-500 underline">{errors.client_name.message}</p>}
                </div>

                <div className="space-y-1">
                    <label className="text-sm text-slate-500 dark:text-slate-400">Telefone</label>
                    <input
                        type="tel"
                        className="input-field text-slate-900 dark:text-white bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800/50"
                        placeholder="(00) 00000-0000"
                        {...register('client_phone')}
                        readOnly={isExistingClient && !!selectedClient}
                    />
                    {errors.client_phone && <p className="text-xs text-red-500 underline">{errors.client_phone.message}</p>}
                </div>

                <div className="space-y-1">
                    <label className="text-sm text-slate-500 dark:text-slate-400">Email (Opcional)</label>
                    <input
                        type="email"
                        className="input-field text-slate-900 dark:text-white bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800/50"
                        placeholder="cliente@email.com"
                        {...register('client_email')}
                        readOnly={isExistingClient && !!selectedClient}
                    />
                    {errors.client_email && <p className="text-xs text-red-500 underline">{errors.client_email.message}</p>}
                </div>

                <div className="space-y-1">
                    <label className="text-sm text-slate-500 dark:text-slate-400">Observações</label>
                    <textarea
                        className="input-field text-slate-900 dark:text-white bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10 min-h-[80px]"
                        {...register('notes')}
                    />
                </div>

                <div className="pt-4 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Salvando...' : 'Adicionar Consulta'}
                    </button>
                </div>
            </form>
        </Modal>
    )
}
