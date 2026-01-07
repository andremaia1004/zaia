'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Calendar, Users, Briefcase, Layers, TrendingUp, Shield, LogOut, ChevronDown, Store, Settings, User } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { ThemeToggle } from '../ui/ThemeToggle'

const adminNavItems = [
    { name: 'Command Center', href: '/admin', icon: Shield },
    { name: 'Profissionais', href: '/professionals', icon: Briefcase },
    { name: 'Configurações', href: '/settings', icon: Settings },
]

const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Agenda', href: '/agenda', icon: Calendar },
    { name: 'Clientes', href: '/clients', icon: Users },
    { name: 'Profissionais', href: '/professionals', icon: Briefcase },
    { name: 'Pipeline', href: '/leads', icon: Layers },
    { name: 'Relatórios', href: '/reports', icon: TrendingUp },
    { name: 'Configurações', href: '/settings', icon: Settings },
]

export function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const { profile, signOut, selectedStore, setSelectedStore } = useAuth()
    const [stores, setStores] = useState<{ id: string, name: string }[]>([])
    const [showStoreMenu, setShowStoreMenu] = useState(false)

    useEffect(() => {
        if (profile?.role === 'super_admin') {
            const fetchStores = async () => {
                const supabase = createClient()
                const { data } = await supabase.from('stores').select('id, name').order('name')
                if (data) setStores(data)
            }
            fetchStores()
        }
    }, [profile])

    import { ThemeToggle } from '../ui/ThemeToggle'

    // ... existing code ...

    return (
        <aside className="w-64 h-screen fixed left-0 top-0 glass-panel border-r border-white/10 rounded-none z-50 flex flex-col">
            <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                    <Link href="/dashboard">
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-zaia-400 to-pink-400 font-display cursor-pointer bg-300% animate-gradient">
                            ZAIA 2.0
                        </h1>
                    </Link>
                    <ThemeToggle />
                </div>

                {/* Super Admin Store Selector */}
                {profile?.role === 'super_admin' && (
                    <div className="mt-6 relative">
                        <button
                            onClick={() => setShowStoreMenu(!showStoreMenu)}
                            className="w-full flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-colors text-sm"
                        >
                            <div className="flex items-center gap-2 overflow-hidden">
                                <Store className="w-4 h-4 text-zaia-400 shrink-0" />
                                <span className="truncate text-slate-200 font-medium">
                                    {selectedStore ? selectedStore.name : 'Visão Global'}
                                </span>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${showStoreMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {showStoreMenu && (
                            <div className="absolute top-full left-0 w-full mt-2 bg-[#1e293b] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                                <button
                                    onClick={() => {
                                        setSelectedStore(null)
                                        setShowStoreMenu(false)
                                        router.push('/admin')
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-zaia-500/20 hover:text-white transition-colors border-b border-white/5"
                                >
                                    Visão Global (Todas)
                                </button>
                                {stores.map(store => (
                                    <button
                                        key={store.id}
                                        onClick={() => {
                                            setSelectedStore(store)
                                            setShowStoreMenu(false)
                                            router.push('/dashboard')
                                        }}
                                        className={clsx(
                                            "w-full text-left px-3 py-2 text-sm transition-colors",
                                            selectedStore?.id === store.id ? "bg-zaia-500/20 text-zaia-300" : "text-slate-400 hover:bg-white/5 hover:text-white"
                                        )}
                                    >
                                        {store.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
                {(profile?.role === 'super_admin' && !selectedStore ? adminNavItems : navItems).map((item) => {
                    // 1. Permission Check for Super Admin Only Items
                    // User Request: "Profissionais" and "Relatórios" only for Super Admin
                    if (['/professionals', '/reports'].includes(item.href)) {
                        if (profile?.role !== 'super_admin') return null
                    }

                    // 2. Permission Check for Staff
                    if (profile?.role === 'staff') {
                        if (['/settings'].includes(item.href)) return null
                    }

                    const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
                    const Icon = item.icon

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={clsx(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                                isActive
                                    ? "bg-zaia-600/20 text-zaia-300 border border-zaia-500/30"
                                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <Icon className={clsx("w-5 h-5", isActive ? "text-zaia-400" : "group-hover:text-white")} />
                            <span className="font-medium">{item.name}</span>
                        </Link>
                    )
                })}
            </nav>

            <div className="p-4 border-t border-white/5">
                <Link href="/account">
                    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 mb-2 hover:bg-white/10 transition-colors cursor-pointer group">
                        <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-zaia-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-lg shadow-zaia-500/20">
                            {profile?.avatar_url ? (
                                <Image
                                    src={profile.avatar_url}
                                    alt="Avatar"
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <span>{profile?.name?.substring(0, 2).toUpperCase() || 'U'}</span>
                            )}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-sm font-medium text-white truncate group-hover:text-zaia-300 transition-colors" title={profile?.name}>
                                {profile?.name || 'Usuário'}
                            </span>
                            <span className="text-xs text-slate-500 truncate group-hover:text-slate-400 transition-colors" title={selectedStore?.name || profile?.store?.name}>
                                {profile?.role === 'super_admin'
                                    ? (selectedStore ? selectedStore.name : 'Global Admin')
                                    : (profile?.store?.name || 'Minha Loja')}
                            </span>
                        </div>
                    </div>
                </Link>

                <button
                    onClick={() => signOut()}
                    className="flex items-center gap-2 w-full px-4 py-2 text-xs font-medium text-slate-500 hover:text-red-400 transition-colors"
                >
                    <LogOut className="w-3 h-3" />
                    Sair da conta
                </button>
            </div>
        </aside>
    )
}
