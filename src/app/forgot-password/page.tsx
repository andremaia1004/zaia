'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Mail, Loader2, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)
        const supabase = createClient()

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            })

            if (error) throw error

            setMessage({
                type: 'success',
                text: 'Se o email estiver cadastrado, você receberá um link de recuperação em instantes.'
            })
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Erro ao enviar email.' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#0f1014] flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="text-center">
                    <h1 className="text-3xl font-bold font-display text-white mb-2">Recuperar Senha</h1>
                    <p className="text-slate-400">Digite seu email para receber o link de redefinição.</p>
                </div>

                <div className="glass-card p-8 border-white/10">
                    {message && (
                        <div className={`p-4 mb-6 rounded-lg border text-sm ${message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-zaia-400 transition-colors" />
                                <input
                                    type="email"
                                    required
                                    className="input-field pl-10 bg-slate-900/50 border-white/10 focus:border-zaia-500/50 text-white placeholder:text-slate-600 w-full"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !email}
                            className="btn-primary w-full flex items-center justify-center py-3"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar Link'}
                        </button>
                    </form>
                </div>

                <div className="text-center">
                    <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-2">
                        <ArrowLeft className="w-4 h-4" /> Voltar para o Login
                    </Link>
                </div>
            </div>
        </div>
    )
}
