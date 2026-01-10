'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Calendar, Users, Briefcase, Layers, TrendingUp, Shield, LogOut, ChevronDown, Store, Settings, User, CheckSquare } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { ThemeToggle } from '../ui/ThemeToggle'

const adminNavItems = [
    { name: 'Painel Administrativo', href: '/admin', icon: Shield },
    { name: 'Profissionais', href: '/professionals', icon: Briefcase },
    { name: 'Configurações', href: '/settings', icon: Settings },
]

const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Agenda', href: '/agenda', icon: Calendar },
    {
        name: 'Tarefas',
        href: '/tasks',
        icon: CheckSquare,
        children: [
            { name: 'Minha Semana', href: '/tasks/my-week' },
            { name: 'Calendário', href: '/tasks/calendar' },
            { name: 'Ranking', href: '/tasks/ranking', roles: ['super_admin'] },
            { name: 'Configurações', href: '/tasks/config', roles: ['super_admin', 'admin'] },
        ]
    },
    { name: 'Clientes', href: '/clients', icon: Users },
    { name: 'Profissionais', href: '/professionals', icon: Briefcase, roles: ['super_admin'] },
    { name: 'Pipeline', href: '/leads', icon: Layers },
    { name: 'Relatórios', href: '/reports', icon: TrendingUp, roles: ['super_admin'] },
    { name: 'Configurações', href: '/settings', icon: Settings, roles: ['super_admin', 'admin'] },
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
                {(profile?.role === 'super_admin' && !selectedStore ? adminNavItems : navItems).map((item: any) => {
                    // Role Checks
                    if (item.roles && !item.roles.includes(profile?.role)) return null

                    const isActive = pathname === item.href || (item.children ? item.children.some((c: any) => pathname === c.href) : pathname?.startsWith(`${item.href}/`))
                    const Icon = item.icon
                    const hasChildren = item.children && item.children.length > 0

                    return (
                        <div key={item.href} className="space-y-1">
                            {hasChildren ? (
                                <>
                                    <div className={clsx(
                                        "flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group cursor-default",
                                        isActive ? "text-zaia-300" : "text-slate-400 group-hover:text-white"
                                    )}>
                                        <div className="flex items-center gap-3">
                                            <Icon className={clsx("w-5 h-5", isActive ? "text-zaia-400" : "group-hover:text-white")} />
                                            <span className="font-medium">{item.name}</span>
                                        </div>
                                    </div>
                                    <div className="ml-9 space-y-1">
                                        {item.children.map((child: any) => {
                                            if (child.roles && !child.roles.includes(profile?.role)) return null
                                            const isChildActive = pathname === child.href

                                            return (
                                                <Link
                                                    key={child.href}
                                                    href={child.href}
                                                    className={clsx(
                                                        "block px-4 py-2 text-sm rounded-lg transition-all duration-200",
                                                        isChildActive
                                                            ? "bg-zaia-600/20 text-zaia-300 font-medium"
                                                            : "text-slate-500 hover:bg-white/5 hover:text-slate-300"
                                                    )}
                                                >
                                                    {child.name}
                                                </Link>
                                            )
                                        })}
                                    </div>
                                </>
                            ) : (
                                <Link
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
                            )}
                        </div>
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
