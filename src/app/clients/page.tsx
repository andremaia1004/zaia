'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ImportClientsModal } from '@/components/clients/ImportClientsModal'
import { Search, User, Upload } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface Client {
    id: string
    name: string
    phone: string
    created_at: string
}

export default function ClientsPage() {
    const { selectedStore } = useAuth()
    const [clients, setClients] = useState<Client[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [debouncedTerm, setDebouncedTerm] = useState('')
    const [isImportOpen, setIsImportOpen] = useState(false)
    const [selectedClient, setSelectedClient] = useState<Client | null>(null)

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedTerm(searchTerm), 500)
        return () => clearTimeout(timer)
    }, [searchTerm])

    useEffect(() => {
        searchClients()
    }, [debouncedTerm, selectedStore])

    const searchClients = async () => {
        const supabase = createClient()
        let query = supabase.from('clients').select('*').order('created_at', { ascending: false }).limit(20)

        if (debouncedTerm) {
            query = query.or(`name.ilike.%${debouncedTerm}%,phone.ilike.%${debouncedTerm}%`)
        }

        if (selectedStore?.id) {
            query = query.eq('store_id', selectedStore.id)
        }

        const { data } = await query
        if (data) setClients(data)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold font-display text-white">Clientes</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsImportOpen(true)}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Upload className="w-4 h-4" /> Importar Planilha
                    </button>
                </div>
            </div>

            <ImportClientsModal
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
                onSuccess={() => {
                    setIsImportOpen(false)
                    searchClients()
                    alert('Importação concluída!')
                }}
            />

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                    className="input-field pl-10 text-white"
                    placeholder="Buscar por nome ou telefone..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="glass-panel p-0 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-900/50 text-slate-400 font-medium text-sm">
                        <tr>
                            <th className="p-4">Nome</th>
                            <th className="p-4">Telefone</th>
                            <th className="p-4">Cadastrado em</th>
                            <th className="p-4">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-200">
                        {clients.map(client => (
                            <tr
                                key={client.id}
                                className="hover:bg-white/5 transition-colors cursor-pointer"
                                onClick={() => setSelectedClient(client)}
                            >
                                <td className="p-4 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-zaia-900/50 flex items-center justify-center text-zaia-300">
                                        <User className="w-4 h-4" />
                                    </div>
                                    {client.name}
                                </td>
                                <td className="p-4">{client.phone}</td>
                                <td className="p-4 text-slate-500 text-sm">
                                    {new Date(client.created_at).toLocaleDateString('pt-BR')}
                                </td>
                                <td className="p-4">
                                    <button className="text-zaia-400 hover:text-zaia-300 text-sm font-medium">Ver Histórico</button>
                                </td>
                            </tr>
                        ))}
                        {clients.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-slate-500">
                                    Nhum cliente encontrado.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
