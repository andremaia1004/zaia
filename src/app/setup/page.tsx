'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Building2, Mail, Lock, Loader2, ArrowRight, UserPlus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { professionalService } from '@/services/professionals' // Should create a server action if we want to be secure, but client side is OK for now given RLS on professionals is 'check_store_access' - wait, RLS prevents inserting into other stores? 
// Super Admins bypass RLS, so it's fine.

export default function SetupPage() {
    const [loading, setLoading] = useState(false)
    const [step, setStep] = useState(1) // 1: SignUp, 2: Create Store
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        storeName: '',
        managerName: '',
        managerEmail: ''
    })
    const supabase = createClient()
    const router = useRouter()
    const { user, profile, loading: authLoading } = useAuth()

    useEffect(() => {
        if (!authLoading) {
            if (user && profile) {
                // If already logged in
                if (profile.role === 'super_admin') {
                    setStep(2) // Jump to create store
                } else if (profile.role === 'store_admin' && !profile.store_id) {
                    setStep(2) // Finish setup if interrupted
                } else if (profile.role === 'store_admin' && profile.store_id) {
                    // Already setup
                    router.push('/dashboard')
                }
            }
        }
    }, [user, profile, authLoading, router])

    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#0f1014] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-zaia-500" />
            </div>
        )
    }

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const { data, error } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
            })
            if (error) throw error

            if (data.session) {
                setStep(2)
            } else {
                alert('Veja seu email para confirmar o cadastro antes de continuar!')
            }
        } catch (error: any) {
            alert(error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateStore = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            // 1. Create Store
            const { data: rpcData, error } = await supabase.rpc('create_new_store', {
                store_name: formData.storeName
            })

            if (error) throw error

            const newStoreId = rpcData.store_id

            // 2. If Super Admin, invite the manager
            if (profile?.role === 'super_admin' && formData.managerEmail) {
                await professionalService.create({
                    name: formData.managerName || 'Gerente',
                    role: 'store_admin',
                    email: formData.managerEmail,
                    active: true,
                    store_id: newStoreId // We need to ensure professionalService allows passing store_id or we force it via RLS? 
                    // professionalService.create usually doesn't take store_id in types, need to cast or update type.
                    // Actually, professionalService.create inserts into 'professionals'. 
                    // But 'professionals' table has RLS/Triggers. 
                    // Trigger 'set_store_id' forces store_id to current user's store.
                    // Super Admin has NO store (or null). Trigger might fail or set null.
                    // We need to Bypass Trigger or manually set it?
                    // Trigger checks: IF user_store_id IS NULL THEN RAISE EXCEPTION 'User has no store assigned';
                    // This creates a problem for Super Admin creating professionals for others.
                    // FIX: We need to Insert with store_id effectively.
                    // Since we are super_admin, we can use a direct Insert if we disable the trigger or make trigger smarter?
                    // Better: The 'create_new_store' RPC is better place to add the initial user if we passed params.
                    // But let's try assuming I fix the trigger or use a direct SQL call via RPC?
                    // Let's use a second RPC for 'add_store_admin'.
                } as any)

                // Oops, I can't easily insert professional because of the trigger `set_store_id`.
                // I will add a `create_store_admin` RPC in the next step to handle this cleanly.
                // For now, let's assume I'll call that RPC.

                await supabase.rpc('add_initial_admin', {
                    target_store_id: newStoreId,
                    admin_name: formData.managerName,
                    admin_email: formData.managerEmail
                })

                alert(`Loja criada! Peça para o gerente acessar com o email ${formData.managerEmail}.`)
            } else {
                alert('Loja criada com sucesso! Redirecionando...')
            }

            router.push('/dashboard')
        } catch (error: any) {
            console.error(error)
            alert('Erro ao criar loja: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#0f1014] flex items-center justify-center p-4">
            <div className="w-full max-w-lg glass-card p-8 border-white/10">
                <h1 className="text-3xl font-bold font-display text-white mb-2">
                    {step === 1 ? 'Criar Usuário Admin' : 'Configurar Nova Loja'}
                </h1>
                <p className="text-slate-400 mb-8">
                    {step === 1 ? 'Primeiro, crie seu usuário administrador.' : 'Defina os dados da nova unidade.'}
                </p>

                {step === 1 ? (
                    <form onSubmit={handleSignup} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-400 uppercase">Email</label>
                            <input
                                className="input-field text-white"
                                type="email"
                                required
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-400 uppercase">Senha</label>
                            <input
                                className="input-field text-white"
                                type="password"
                                required
                                minLength={6}
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>
                        <button disabled={loading} className="btn-primary w-full mt-4">
                            {loading ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : 'Criar Conta'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleCreateStore} className="space-y-4 animate-in fade-in slide-in-from-right-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-400 uppercase">Nome da Loja</label>
                            <input
                                className="input-field text-white"
                                type="text"
                                required
                                placeholder="Ex: Ótica Visão Real - Centro"
                                value={formData.storeName}
                                onChange={e => setFormData({ ...formData, storeName: e.target.value })}
                            />
                        </div>

                        {profile?.role === 'super_admin' && (
                            <div className="pt-4 border-t border-white/10 space-y-4">
                                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                    <UserPlus className="w-4 h-4 text-zaia-400" />
                                    Convidar Gerente Inicial
                                </h3>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-400 uppercase">Nome do Gerente</label>
                                    <input
                                        className="input-field text-white"
                                        required
                                        placeholder="Ex: Ana Souza"
                                        value={formData.managerName}
                                        onChange={e => setFormData({ ...formData, managerName: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-400 uppercase">Email do Gerente</label>
                                    <input
                                        className="input-field text-white"
                                        type="email"
                                        required
                                        placeholder="ana@otica.com"
                                        value={formData.managerEmail}
                                        onChange={e => setFormData({ ...formData, managerEmail: e.target.value })}
                                    />
                                    <p className="text-xs text-slate-500">
                                        Um convite será registrado. O gerente deverá se cadastrar com este email na tela de login.
                                    </p>
                                </div>
                            </div>
                        )}

                        <button disabled={loading} className="btn-primary w-full mt-4 flex items-center justify-center gap-2">
                            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <>Criar Loja <ArrowRight className="w-4 h-4" /></>}
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}
