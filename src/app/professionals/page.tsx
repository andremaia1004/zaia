'use client'
import { useState, useEffect } from 'react'
import { professionalService } from '@/services/professionals'
import { type Professional } from '@/services/types'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Modal } from '@/components/ui/Modal'
import { UserCheck, UserX, Briefcase } from 'lucide-react'

export default function ProfessionalsPage() {
    const { selectedStore } = useAuth()
    const [professionals, setProfessionals] = useState<Professional[]>([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [loading, setLoading] = useState(true)
    const [editingId, setEditingId] = useState<string | null>(null) // New state

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        role: 'Optometrista',
        phone: '',
        email: '',
        active: true
    })

    useEffect(() => {
        fetchProfessionals()
    }, [selectedStore])

    const fetchProfessionals = async () => {
        setLoading(true)
        const supabase = createClient()
        let query = supabase.from('professionals').select('*').order('name')

        if (selectedStore?.id) {
            query = query.or(`store_id.eq.${selectedStore.id},store_id.is.null`)
        }
        // If no selectedStore (Visão Global), show ALL (default behavior of select * without filter)
        // But maybe we want explicit indication.

        const { data: allData } = await query
        if (allData) setProfessionals(allData)
        setLoading(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            if (editingId) {
                await professionalService.update(editingId, formData)
            } else {
                await professionalService.create({
                    ...formData,
                    // If selectedStore is null, pass null for global professional
                    store_id: selectedStore?.id || null
                })
            }
            setIsModalOpen(false)
            fetchProfessionals()
            setFormData({ name: '', role: 'Optometrista', phone: '', email: '', active: true })
            setEditingId(null)
        } catch (error: unknown) {
            console.error('Error creating/updating professional:', error)
            const msg = error instanceof Error ? error.message : 'Erro ao salvar profissional'
            alert(`Erro: ${msg}`)
        }
    }

    const handleEdit = (p: Professional) => {
        setEditingId(p.id)
        setFormData({
            name: p.name,
            role: p.role,
            phone: '',
            email: p.email || '',
            active: p.active
        })
        setIsModalOpen(true)
    }

    const toggleActive = async (id: string, current: boolean) => {
        const supabase = createClient()
        await supabase.from('professionals').update({ active: !current }).eq('id', id)
        fetchProfessionals()
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold font-display text-white">Profissionais</h1>
                <button
                    className="btn-primary"
                    onClick={() => {
                        setEditingId(null)
                        setFormData({ name: '', role: 'Optometrista', phone: '', email: '', active: true })
                        setIsModalOpen(true)
                    }}
                >
                    + Novo Profissional
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {professionals.map(p => (
                    <div key={p.id} className="glass-card p-5 flex items-start justify-between group">
                        <div className="space-y-2 cursor-pointer" onClick={() => handleEdit(p)}>
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-zaia-300 font-bold text-lg">
                                    {p.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white group-hover:text-zaia-300 transition-colors">{p.name}</h3>
                                    <p className="text-xs text-slate-400 flex items-center gap-1">
                                        <Briefcase className="w-3 h-3" />
                                        {p.role}
                                    </p>
                                    {p.email && (
                                        <p className="text-xs text-slate-500 mt-1">
                                            {p.email}
                                        </p>
                                    )}
                                    <div className="mt-2">
                                        {p.user_id ? (
                                            <span className="text-[10px] font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                                                Conta Vinculada
                                            </span>
                                        ) : p.email ? (
                                            <span className="text-[10px] font-medium text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                                                Convite Pendente
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-medium text-slate-500">
                                                Sem Acesso
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="pt-2">
                                <span className={`text-xs px-2 py-1 rounded-full border ${p.active ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-slate-600 bg-slate-700 text-slate-400'}`}>
                                    {p.active ? 'Ativo' : 'Inativo'}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                toggleActive(p.id, p.active)
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white"
                            title={p.active ? "Desativar" : "Ativar"}
                        >
                            {p.active ? <UserX className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                        </button>
                    </div>
                ))}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Editar Profissional" : "Novo Profissional"}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm text-slate-400">Nome</label>
                        <input
                            className="input-field text-white"
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm text-slate-400">Email (Opcional)</label>
                        <input
                            className="input-field text-white"
                            type="email"
                            placeholder="Para convite de acesso (opcional)"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm text-slate-400">Função</label>
                        <select
                            className="input-field text-white"
                            value={formData.role}
                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                        >
                            <option>Optometrista</option>
                            <option>Consultor</option>
                            <option>Recepção</option>
                            <option>Gerente</option>
                        </select>
                    </div>
                    {/* Phone field removed/kept based on DB? Keeping UI for now but it might not persist if not in interface/DB */}
                    <div className="space-y-1">
                        <label className="text-sm text-slate-400">Telefone (Opcional)</label>
                        <input
                            className="input-field text-white"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>
                    <div className="flex justify-end pt-4">
                        <button type="submit" className="btn-primary">Salvar</button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
