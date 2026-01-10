'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { tasksService } from '@/services/tasks'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Edit2, Users, Building, Calendar, CheckSquare, Loader2, Clock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import { clsx } from 'clsx'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function ConfigTasksPage() {
    const { profile } = useAuth()
    const [templates, setTemplates] = useState<any[]>([])
    const [staff, setStaff] = useState<any[]>([])
    const [stores, setStores] = useState<any[]>([])
    const [assignments, setAssignments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [newAssignment, setNewAssignment] = useState({ template_id: '', staff_id: '', store_id: '' })
    const [showAssignModal, setShowAssignModal] = useState(false)
    const [showTemplateModal, setShowTemplateModal] = useState(false)
    const [newTemplate, setNewTemplate] = useState({ title: '', description: '', recurrence: 'weekly', target_value: 1, requires_proof: false, default_due_time: '' })

    useEffect(() => {
        fetchData()
    }, [profile])

    const fetchData = async () => {
        try {
            setLoading(true)
            const supabase = createClient()

            // 1. Templates
            const templatesData = await tasksService.getTemplates()
            if (!templatesData || templatesData.length === 0) {
                console.warn('No task templates found')
            }
            setTemplates(templatesData || [])

            // 2. Staff (Profiles) - Fetch staff and store_admin since both can have tasks
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('id, name, role, store_id')
                .in('role', ['staff', 'store_admin'])

            if (profileError) {
                console.error('Error fetching profiles:', profileError.message)
                toast.error('Erro ao carregar colaboradores')
            }
            setStaff(profiles || [])

            // 3. Stores
            const { data: storesData, error: storesError } = await supabase
                .from('stores')
                .select('id, name')

            if (storesError) {
                console.error('Error fetching stores:', storesError.message)
                toast.error('Erro ao carregar lojas')
            }
            setStores(storesData || [])

            // 4. Assignments
            const { data: assignmentsData } = await supabase
                .from('task_assignments')
                .select('*, task_templates(title, recurrence), profiles:staff_id(name), stores(name)')
            setAssignments(assignmentsData || [])

        } catch (error) {
            console.error('Error fetching config data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleAssign = async () => {
        if (!newAssignment.template_id || !newAssignment.staff_id || !newAssignment.store_id) {
            toast.error('Preencha todos os campos da atribuição')
            return
        }

        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('task_assignments')
                .insert(newAssignment)

            if (error) throw error

            // Trigger task generation job
            await fetch('/api/jobs/tasks?type=weekly', { method: 'POST' })

            setShowAssignModal(false)
            toast.success('Tarefa atribuída com sucesso!')
            fetchData()
        } catch (error: any) {
            console.error('Error creating assignment:', error)
            toast.error(`Erro ao atribuir: ${error.message}`)
        }
    }

    const handleDeleteAssignment = async (id: string) => {
        if (!confirm('Tem certeza que deseja remover esta atribuição?')) return
        try {
            await tasksService.deleteAssignment(id)
            toast.success('Atribuição removida')
            fetchData()
        } catch (error) {
            console.error('Error deleting assignment:', error)
            toast.error('Erro ao remover atribuição')
        }
    }

    const handleCreateTemplate = async () => {
        if (!newTemplate.title || !newTemplate.target_value) {
            toast.error('Preencha o título e a meta')
            return
        }
        try {
            if (profile?.role !== 'super_admin') {
                toast.error('Apenas SuperAdmins podem criar modelos de tarefas')
                return
            }

            // Sanitize default_due_time: empty string should be null for the database
            const templateToSave = {
                ...newTemplate,
                default_due_time: newTemplate.default_due_time.trim() || null
            }

            await tasksService.createTemplate(templateToSave)
            setShowTemplateModal(false)
            setNewTemplate({ title: '', description: '', recurrence: 'weekly', target_value: 1, requires_proof: false, default_due_time: '' })
            toast.success('Modelo de tarefa criado!')
            fetchData()
        } catch (error: any) {
            console.error('Error creating template:', error)
            toast.error(`Erro ao salvar: ${error.message}`)
        }
    }

    const handleDeleteTemplate = async (id: string) => {
        if (!confirm('Tem certeza que deseja remover este modelo? Isso pode afetar atribuições existentes.')) return
        try {
            await tasksService.deleteTemplate(id)
            fetchData()
        } catch (error) {
            console.error('Error deleting template:', error)
        }
    }

    if (loading) return <div className="p-8"><Loader2 className="w-8 h-8 animate-spin text-zaia-500" /></div>

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <header className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Configurar Tarefas</h1>
                    <p className="text-slate-600 dark:text-slate-400">Gerencie modelos de métricas e atribuições para os colaboradores.</p>
                </div>
                <Button onClick={() => setShowAssignModal(true)} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Atribuir Tarefa
                </Button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Column 1: Templates */}
                <div className="lg:col-span-1">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <CheckSquare className="w-5 h-5 text-zaia-600 dark:text-zaia-400" />
                            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Modelos</h2>
                        </div>
                        <Button size="icon" variant="outline" onClick={() => setShowTemplateModal(true)}>
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                    <div className="space-y-3">
                        {templates.map(template => (
                            <div key={template.id} className="glass-panel p-4 border border-slate-200 dark:border-white/5 relative group">
                                <button
                                    onClick={() => handleDeleteTemplate(template.id)}
                                    className="absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-400 transition-all"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <h3 className="font-medium text-slate-900 dark:text-white pr-6">{template.title}</h3>
                                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-500">
                                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {template.recurrence}</span>
                                    <span className="flex items-center gap-1 font-bold text-zaia-600 dark:text-zaia-400">Meta: {template.target_value}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Column 2: Current Assignments */}
                <div className="lg:col-span-2">
                    <div className="flex items-center gap-2 mb-4">
                        <Users className="w-5 h-5 text-zaia-600 dark:text-zaia-400" />
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Atribuições Atuais</h2>
                    </div>
                    <div className="glass-panel border border-white/5 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5">
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Tarefa</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Staff</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Loja</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Status</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {assignments.map(assign => (
                                    <tr key={assign.id} className="hover:bg-white/5 dark:hover:bg-white/5 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-slate-900 dark:text-white">{assign.task_templates?.title}</div>
                                            <div className="text-[10px] text-slate-500 dark:text-slate-500 uppercase">{assign.task_templates?.recurrence}</div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{assign.profiles?.name}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{assign.stores?.name}</td>
                                        <td className="px-4 py-3">
                                            <span className={clsx(
                                                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                                assign.active ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                                            )}>
                                                {assign.active ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => handleDeleteAssignment(assign.id)}
                                                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Assignment Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-black/60 dark:bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="glass-panel border border-slate-200 dark:border-white/10 w-full max-w-md p-6 animate-in fade-in zoom-in duration-200 bg-white dark:bg-slate-900">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Nova Atribuição</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Modelo de Tarefa</label>
                                <select
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white outline-none focus:border-zaia-500 appearance-none"
                                    value={newAssignment.template_id}
                                    onChange={(e) => setNewAssignment({ ...newAssignment, template_id: e.target.value })}
                                >
                                    <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Selecione um modelo</option>
                                    {templates.map(t => <option key={t.id} value={t.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{t.title} ({t.recurrence})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Loja</label>
                                <select
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white outline-none focus:border-zaia-500 appearance-none"
                                    value={newAssignment.store_id}
                                    onChange={(e) => setNewAssignment({ ...newAssignment, store_id: e.target.value })}
                                >
                                    <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Selecione a loja</option>
                                    {stores.map(s => <option key={s.id} value={s.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Colaborador (Staff)</label>
                                <select
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white outline-none focus:border-zaia-500 appearance-none"
                                    value={newAssignment.staff_id}
                                    onChange={(e) => setNewAssignment({ ...newAssignment, staff_id: e.target.value })}
                                >
                                    <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Selecione o staff</option>
                                    {staff.map(u => <option key={u.id} value={u.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{u.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <Button variant="outline" className="flex-1" onClick={() => setShowAssignModal(false)}>Cancelar</Button>
                            <Button className="flex-1" onClick={handleAssign}>Atribuir Agora</Button>
                        </div>
                    </div>
                </div>
            )}
            {showTemplateModal && (
                <div className="fixed inset-0 bg-black/60 dark:bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="glass-panel border border-slate-200 dark:border-white/10 w-full max-w-md p-6 animate-in fade-in zoom-in duration-200 bg-white dark:bg-slate-900">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Novo Modelo de Tarefa</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Título</label>
                                <input
                                    type="text"
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white outline-none focus:border-zaia-500"
                                    placeholder="Ex: Abrir 10 novos leads"
                                    value={newTemplate.title}
                                    onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Recorrência</label>
                                <select
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white outline-none focus:border-zaia-500 appearance-none"
                                    value={newTemplate.recurrence}
                                    onChange={(e) => setNewTemplate({ ...newTemplate, recurrence: e.target.value })}
                                >
                                    <option value="daily">Diária</option>
                                    <option value="weekly">Semanal</option>
                                    <option value="monthly">Mensal</option>
                                    <option value="once">Única (Uma vez)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Horário Limite (Opcional)</label>
                                <input
                                    type="time"
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white outline-none focus:border-zaia-500"
                                    value={newTemplate.default_due_time}
                                    onChange={(e) => setNewTemplate({ ...newTemplate, default_due_time: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Valor Meta</label>
                                <input
                                    type="number"
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-900 dark:text-white outline-none focus:border-zaia-500"
                                    value={newTemplate.target_value}
                                    onChange={(e) => setNewTemplate({ ...newTemplate, target_value: parseInt(e.target.value) || 1 })}
                                />
                            </div>
                            <div className="flex items-center gap-3 py-2">
                                <input
                                    type="checkbox"
                                    id="requires_proof"
                                    checked={newTemplate.requires_proof}
                                    onChange={(e) => setNewTemplate({ ...newTemplate, requires_proof: e.target.checked })}
                                    className="w-4 h-4 text-zaia-600 border-slate-300 rounded focus:ring-zaia-500"
                                />
                                <label htmlFor="requires_proof" className="text-sm text-slate-600 dark:text-slate-300">Exigir prova (observação/anexo)</label>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <Button variant="outline" className="flex-1" onClick={() => setShowTemplateModal(false)}>Cancelar</Button>
                            <Button className="flex-1" onClick={handleCreateTemplate}>Criar Modelo</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
