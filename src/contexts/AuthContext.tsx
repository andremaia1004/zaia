'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Session } from '@supabase/supabase-js'
import { useRouter, usePathname } from 'next/navigation'

export interface Profile {
    id: string
    name: string
    role: 'super_admin' | 'store_admin' | 'staff'
    store_id: string
    store?: {
        name: string
    }
    avatar_url?: string
}

type AuthContextType = {
    user: User | null
    session: Session | null
    profile: Profile | null
    loading: boolean
    signOut: () => Promise<void>
    // Super Admin Context
    selectedStore: { id: string, name: string } | null
    setSelectedStore: (store: { id: string, name: string } | null) => void
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    profile: null,
    loading: true,
    signOut: async () => { },
    selectedStore: null,
    setSelectedStore: () => { }
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [selectedStore, setSelectedStore] = useState<{ id: string, name: string } | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    const pathname = usePathname()
    const supabase = createClient()

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                // Get initial session
                const { data: { session: initialSession } } = await supabase.auth.getSession()

                if (initialSession?.user) {
                    setSession(initialSession)
                    setUser(initialSession.user)

                    // Fetch Profile
                    const { data: profileData } = await supabase
                        .from('profiles')
                        .select('*, store:stores(name)')
                        .eq('id', initialSession.user.id)
                        .single()

                    if (profileData) {
                        setProfile(profileData as Profile)
                    }
                }

                setLoading(false)

                // Listen for changes
                const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
                    setSession(newSession)
                    setUser(newSession?.user ?? null)

                    if (newSession?.user) {
                        const { data: profileData } = await supabase
                            .from('profiles')
                            .select('*, store:stores(name)')
                            .eq('id', newSession.user.id)
                            .single()
                        setProfile(profileData as Profile)
                    } else {
                        setProfile(null)
                    }

                    setLoading(false)

                    if (!newSession && !['/login', '/setup'].includes(window.location.pathname)) {
                        router.push('/login')
                    }
                })

                return () => subscription.unsubscribe()
            } catch (error) {
                console.error('Auth init error:', error)
                setLoading(false)
            }
        }

        initializeAuth()
    }, [supabase, router, pathname])

    // Persistence of Selected Store
    useEffect(() => {
        if (!loading && profile?.role === 'super_admin') {
            const savedStore = localStorage.getItem('@zaia:selectedStore')
            if (savedStore) {
                try {
                    const parsed = JSON.parse(savedStore)
                    if (parsed && parsed.id) {
                        setSelectedStore(parsed)
                    }
                } catch (e) {
                    localStorage.removeItem('@zaia:selectedStore')
                }
            }
        }
    }, [loading, profile])

    const handleSetSelectedStore = (store: { id: string, name: string } | null) => {
        setSelectedStore(store)
        if (store) {
            localStorage.setItem('@zaia:selectedStore', JSON.stringify(store))
        } else {
            localStorage.removeItem('@zaia:selectedStore')
        }
    }

    // Route Protection Logic
    useEffect(() => {
        const publicRoutes = ['/login', '/setup', '/signup', '/forgot-password', '/reset-password']

        if (!loading && !user && !publicRoutes.includes(pathname)) {
            router.push('/login')
        }
        if (!loading && user && pathname === '/login') {
            router.push('/dashboard')
        }
    }, [user, loading, pathname, router])

    const signOut = async () => {
        try {
            await supabase.auth.signOut()
        } catch (error) {
            console.error('Error signing out:', error)
        } finally {
            setProfile(null)
            setUser(null)
            setSession(null)
            localStorage.removeItem('@zaia:selectedStore')
            // Hard reload to ensure all states appear cleared
            window.location.href = '/login'
        }
    }

    return (
        <AuthContext.Provider value={{ user, session, profile, loading, signOut, selectedStore, setSelectedStore: handleSetSelectedStore }}>
            {!loading ? children : (
                <div className="min-h-screen bg-[#0f1014] flex items-center justify-center">
                    <div className="animate-spin w-8 h-8 border-2 border-zaia-500 border-t-transparent rounded-full font-display"></div>
                </div>
            )}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
