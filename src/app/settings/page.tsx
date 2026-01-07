'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Store, Save, Loader2, Info } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
    const { profile, selectedStore, user } = useAuth()
    const [name, setName] = useState('')
    const [slug, setSlug] = useState('')
    const [storeId, setStoreId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const router = useRouter()

    useEffect(() => {
        // Determine which store to edit
        let currentStoreId = null
        if (profile?.role === 'super_admin') {
            currentStoreId = selectedStore?.id
        } else if (profile?.role === 'store_admin') {
            currentStoreId = profile.store_id
        }

        setStoreId(currentStoreId || null)

        if (currentStoreId) {
            fetchStoreDetails(currentStoreId)
        }
    }, [profile, selectedStore])

    const fetchStoreDetails = async (id: string) => {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('stores')
            .select('*')
            .eq('id', id)
            .single()

        if (data) {
            setName(data.name)
            setSlug(data.slug)
        }
    }

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!storeId) return

        setLoading(true)
        setMessage(null)
        const supabase = createClient()

        try {
            const { error } = await supabase
                .from('stores')
                .update({ name })
                .eq('id', storeId)

            if (error) throw error

            setMessage({ type: 'success', text: 'Configurações atualizadas com sucesso!' })
            router.refresh()
        } catch (error: any) {
            console.error(error)
            setMessage({ type: 'error', text: 'Erro ao atualizar loja.' })
        } finally {
            setLoading(false)
        }
    }

    if (profile?.role === 'staff') {
        return <div className="p-8 text-center text-slate-500">Você não tem permissão para acessar esta página.</div>
    }

    if (!storeId) {
        return (
            <div className="p-8 text-center text-slate-500 glass-panel">
                <Store className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Nenhuma loja selecionada.</p>
                <p className="text-sm">Selecione uma loja no menu lateral para configurar.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold font-display text-white mb-2">Configurações da Loja</h1>
                <p className="text-slate-400">Gerencie as informações da sua unidade.</p>
            </div>

            {message && (
                <div className={`p-4 rounded-lg border ${message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                    {message.text}
                </div>
            )}

            <div className="glass-panel p-6 space-y-6">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Store className="w-5 h-5 text-zaia-400" />
                    Dados Cadastrais
                </h2>

                <form onSubmit={handleUpdate} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm text-slate-400">Nome da Loja</label>
                        <input
                            className="input-field text-white"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                            <Info className="w-3 h-3" />
                            Este nome aparecerá para seus clientes e funcionários.
                        </p>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm text-slate-400">Identificador (Slug)</label>
                        <input
                            className="input-field text-slate-500 bg-slate-900/50 cursor-not-allowed"
                            value={slug}
                            disabled
                        />
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                            <Info className="w-3 h-3" />
                            Utilizado para URLs e identificação única. Não pode ser alterado.
                        </p>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Salvar Dados
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
