'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Lock, Loader2, ArrowRight } from 'lucide-react'

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: 'As senhas não conferem.' })
            return
        }

        setLoading(true)
        setMessage(null)
        const supabase = createClient()

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            })

            if (error) throw error

            setMessage({ type: 'success', text: 'Senha redefinida com sucesso! Redirecionando...' })
            setTimeout(() => {
                router.push('/dashboard')
            }, 2000)
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Erro ao redefinir senha.' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#0f1014] flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="text-center">
                    <h1 className="text-3xl font-bold font-display text-white mb-2">Redefinir Senha</h1>
                    <p className="text-slate-400">Crie uma nova senha segura para sua conta.</p>
                </div>

                <div className="glass-card p-8 border-white/10">
                    {message && (
                        <div className={`p-4 mb-6 rounded-lg border text-sm ${message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Nova Senha</label>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-zaia-400 transition-colors" />
                                <input
                                    type="password"
                                    required
                                    className="input-field pl-10 bg-slate-900/50 border-white/10 focus:border-zaia-500/50 text-white placeholder:text-slate-600 w-full"
                                    placeholder="Mínimo 6 caracteres"
                                    value={password}
                                    minLength={6}
                                    onChange={e => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Confirmar Senha</label>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-zaia-400 transition-colors" />
                                <input
                                    type="password"
                                    required
                                    className="input-field pl-10 bg-slate-900/50 border-white/10 focus:border-zaia-500/50 text-white placeholder:text-slate-600 w-full"
                                    placeholder="Repita a senha"
                                    value={confirmPassword}
                                    minLength={6}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !password}
                            className="btn-primary w-full flex items-center justify-center py-3 gap-2"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Salvar Nova Senha <ArrowRight className="w-4 h-4" /></>}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
