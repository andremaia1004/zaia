'use client'
import { Modal } from '@/components/ui/Modal'
import { leadService } from '@/services/leads'
import { type Lead } from '@/services/types'
import { Phone, User, Calendar, MessageCircle, MapPin, Check, Trash2 } from 'lucide-react'

interface LeadDetailsModalProps {
    isOpen: boolean
    onClose: () => void
    lead: Lead | null
    onDelete?: (id: string) => Promise<void>
}

export function LeadDetailsModal({ isOpen, onClose, lead, onDelete }: LeadDetailsModalProps) {
    if (!lead) return null

    const handleWhatsAppClick = () => {
        if (!lead.client?.phone) return
        // Remove non-digits
        const phone = lead.client.phone.replace(/\D/g, '')
        const message = encodeURIComponent(`Olá ${lead.client.name}, tudo bem? Aqui é da Ótica ZAIA.`)
        window.open(`https://wa.me/55${phone}`, '_blank')
    }

    const handleAddTask = async (text: string, inputElement: HTMLInputElement | null) => {
        if (!text || !lead) return

        let currentTasks = lead.tasks || []
        if (currentTasks.length === 0) {
            currentTasks = [{ id: 'default-1', text: 'Aviso de Consulta Enviado', completed: lead.reminder_sent || false }]
        }

        const newTasks = [
            ...currentTasks,
            { id: crypto.randomUUID(), text, completed: false }
        ]

        try {
            await leadService.update(lead.id, { tasks: newTasks })
            if (inputElement) inputElement.value = ''
            onClose()
        } catch (err) {
            console.error(err)
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Lead">
            <div className="space-y-6">
                {/* Header with Avatar and Basic Info */}
                <div className="flex items-center gap-4 border-b border-slate-100 dark:border-white/10 pb-6">
                    <div className="w-16 h-16 rounded-full bg-zaia-500/10 dark:bg-zaia-600/20 flex items-center justify-center text-zaia-600 dark:text-zaia-300 font-bold text-2xl border border-zaia-500/20 dark:border-zaia-500/30">
                        {lead.client?.name?.charAt(0) || 'C'}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{lead.client?.name}</h3>
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mt-1">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/5 uppercase tracking-wider">
                                {lead.channel || 'Geral'}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/5">
                                {lead.status}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Contact Info */}
                <div className="grid gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-white/5 space-y-3">
                        <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                            <Phone className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                            <span>{lead.client?.phone || 'Sem telefone'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                            <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                            <span>Interesse: {lead.interest || 'Consulta Geral'}</span>
                        </div>
                    </div>
                </div>

                {/* Checklist / To-Do */}
                <div className="space-y-3 pt-2">
                    <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Checklist de Ações</h4>

                    <div className="space-y-2">
                        {/* Render existing tasks or default 'Aviso' if empty */}
                        {(lead.tasks && lead.tasks.length > 0 ? lead.tasks : [
                            // Fallback/Default task if array is empty
                            { id: 'default-1', text: 'Aviso de Consulta Enviado', completed: lead.reminder_sent || false }
                        ]).map((task, index) => (
                            <div
                                key={task.id || index}
                                className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
                                onClick={async () => {
                                    if (!lead) return

                                    // Construct new tasks array
                                    let currentTasks = lead.tasks || []
                                    if (currentTasks.length === 0) {
                                        // Initialize with default if it was empty
                                        currentTasks = [{ id: 'default-1', text: 'Aviso de Consulta Enviado', completed: lead.reminder_sent || false }]
                                    }

                                    const updatedTasks = currentTasks.map(t =>
                                        t.id === task.id ? { ...t, completed: !t.completed } : t
                                    )

                                    try {
                                        await leadService.update(lead.id, {
                                            tasks: updatedTasks,
                                            // Sync legacy field if it's the default task
                                            reminder_sent: task.text === 'Aviso de Consulta Enviado' ? !task.completed : lead.reminder_sent
                                        })
                                        onClose() // Trigger refresh via close (or ideally parent refresh)
                                    } catch (e) {
                                        console.error(e)
                                    }
                                }}
                            >
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${task.completed ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 dark:border-slate-500 text-transparent'}`}>
                                    <Check className="w-3.5 h-3.5" />
                                </div>
                                <span className={task.completed ? 'text-green-600 dark:text-green-300 line-through' : 'text-slate-700 dark:text-slate-300'}>
                                    {task.text}
                                </span>
                            </div>
                        ))}

                        {/* Add New Task Input & Button */}
                        <div className="flex gap-2 animate-in fade-in pt-1">
                            <div className="relative flex-1">
                                <input
                                    id="new-task-input"
                                    type="text"
                                    placeholder="Adicionar nova tarefa..."
                                    className="w-full input-field text-sm py-2 pl-3 pr-10 bg-white dark:bg-slate-900/50 border-dashed border-slate-300 dark:border-slate-700 focus:border-zaia-500 rounded-lg text-slate-900 dark:text-white"
                                    onKeyDown={async (e) => {
                                        if (e.key === 'Enter') {
                                            const input = e.currentTarget
                                            const text = input.value.trim()
                                            await handleAddTask(text, input)
                                        }
                                    }}
                                />
                            </div>
                            <button
                                onClick={async () => {
                                    const input = document.getElementById('new-task-input') as HTMLInputElement
                                    const text = input?.value.trim()
                                    await handleAddTask(text, input)
                                }}
                                className="px-3 py-2 bg-zaia-600 hover:bg-zaia-500 text-white rounded-lg transition-colors flex items-center justify-center"
                                title="Adicionar Tarefa"
                            >
                                <span className="text-xl font-bold leading-none mb-0.5">+</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 pt-2">
                    <button
                        onClick={() => {
                            if (!lead.client?.phone) return
                            const phone = lead.client.phone.replace(/\D/g, '')
                            window.open(`https://wa.me/55${phone}`, '_blank')
                        }}
                        className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-green-900/20 flex items-center justify-center gap-2"
                    >
                        <MessageCircle className="w-5 h-5" />
                        Enviar WhatsApp
                    </button>

                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl font-medium transition-all"
                    >
                        Fechar
                    </button>

                    {onDelete && (
                        <button
                            onClick={async () => {
                                if (!lead) return
                                if (confirm('Tem certeza que deseja excluir este lead?')) {
                                    await onDelete(lead.id)
                                    onClose()
                                }
                            }}
                            className="w-full py-3 bg-red-900/20 hover:bg-red-900/40 text-red-400 hover:text-red-300 border border-red-900/30 rounded-xl font-medium transition-all flex items-center justify-center gap-2 mt-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Excluir Lead
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    )
}
