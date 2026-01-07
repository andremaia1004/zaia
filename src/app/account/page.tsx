'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { User, Lock, Save, Loader2, Store, Camera, Upload } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'

export default function AccountPage() {
    const { profile, user, session } = useAuth()
    const [name, setName] = useState('')
    const [avatarUrl, setAvatarUrl] = useState('')
    const [uploading, setUploading] = useState(false)
    const [loading, setLoading] = useState(false)

    // Password State
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    useEffect(() => {
        if (profile) {
            setName(profile.name)
            setAvatarUrl(profile.avatar_url || '')
        }
    }, [profile])

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        const supabase = createClient()

        try {
            // Update Profile Name (and avatar if changed, though avatar updates instantly on upload usually)
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ name })
                .eq('id', user?.id)

            if (profileError) throw profileError

            toast.success('Perfil atualizado com sucesso!')

            // Wait a bit and reload to reflect changes in Context
            setTimeout(() => {
                window.location.reload()
            }, 1000)

        } catch (error: any) {
            console.error(error)
            toast.error('Erro ao atualizar perfil.')
        } finally {
            setLoading(false)
        }
    }

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true)
            const file = event.target.files?.[0]
            if (!file) return

            const fileExt = file.name.split('.').pop()
            const fileName = `${user?.id}-${Math.random()}.${fileExt}`
            const filePath = `${fileName}`

            const supabase = createClient()

            // 1. Upload to Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // 2. Get Public URL
            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
            const publicUrl = data.publicUrl

            // 3. Update Profile
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user?.id)

            if (updateError) throw updateError

            setAvatarUrl(publicUrl)
            toast.success('Foto atualizada!')

            // Force reload context eventually or relying on page refresh for sidebar
            // ideally context should subscribe to profile changes or we manually update session

        } catch (error: any) {
            console.error(error)
            toast.error('Erro ao fazer upload da foto.')
        } finally {
            setUploading(false)
        }
    }

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (newPassword !== confirmPassword) {
            toast.error('As senhas não conferem.')
            return
        }
        if (newPassword.length < 6) {
            toast.error('A senha deve ter no mínimo 6 caracteres.')
            return
        }

        setLoading(true)
        const supabase = createClient()

        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            })

            if (error) throw error

            toast.success('Senha alterada com sucesso!')
            setNewPassword('')
            setConfirmPassword('')
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || 'Erro ao alterar senha.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold font-display text-white mb-2">Minha Conta</h1>
                <p className="text-slate-400">Gerencie suas informações pessoais e segurança.</p>
            </div>

            {/* Profile Info Card */}
            <div className="glass-panel p-6 space-y-6">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-zaia-400" />
                    Informações Pessoais
                </h2>

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm text-slate-400">Email (Não alterável)</label>
                            <input
                                className="input-field text-slate-500 bg-slate-900/50 cursor-not-allowed"
                                value={user?.email || ''}
                                disabled
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm text-slate-400">Função</label>
                            <input
                                className="input-field text-slate-500 bg-slate-900/50 cursor-not-allowed capitalize"
                                value={profile?.role?.replace('_', ' ') || ''}
                                disabled
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm text-slate-400">Loja Vinculada</label>
                        <div className="flex items-center gap-2 input-field text-slate-500 bg-slate-900/50 cursor-not-allowed">
                            <Store className="w-4 h-4" />
                            {profile?.store?.name || 'Não vinculada'}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm text-slate-400">Nome Completo</label>
                        <input
                            className="input-field text-white"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-slate-400">Foto de Perfil</label>
                        <div className="flex items-center gap-4">
                            <div className="relative w-16 h-16 rounded-full overflow-hidden bg-slate-800 border-2 border-slate-700">
                                {avatarUrl ? (
                                    <Image
                                        src={avatarUrl}
                                        alt="Avatar"
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-500">
                                        <User className="w-8 h-8" />
                                    </div>
                                )}
                                {uploading && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <label
                                    htmlFor="avatar-upload"
                                    className="btn-secondary cursor-pointer inline-flex items-center gap-2 text-xs"
                                >
                                    <Camera className="w-4 h-4" />
                                    Alterar Foto
                                </label>
                                <input
                                    id="avatar-upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarUpload}
                                    className="hidden"
                                    disabled={uploading}
                                />
                                <p className="text-xs text-slate-500 mt-1">Recomendado: 400x400px</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Salvar Alterações
                        </button>
                    </div>
                </form>
            </div>

            {/* Password Management Card */}
            <div className="glass-panel p-6 space-y-6">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Lock className="w-5 h-5 text-zaia-400" />
                    Segurança
                </h2>

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm text-slate-400">Nova Senha</label>
                        <input
                            type="password"
                            className="input-field text-white"
                            placeholder="Mínimo 6 caracteres"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            minLength={6}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm text-slate-400">Confirmar Nova Senha</label>
                        <input
                            type="password"
                            className="input-field text-white"
                            placeholder="Repita a senha"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            minLength={6}
                        />
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={loading || !newPassword}
                            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Alterar Senha
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
