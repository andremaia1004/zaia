"use client"

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Menu } from 'lucide-react'

export default function AppWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const isPublicPage = pathname === '/login' || pathname === '/setup'

    if (isPublicPage) {
        return <main className="w-full">{children}</main>
    }

    return (
        <div className="flex min-h-screen w-full bg-[var(--background)]">
            {/* Sidebar */}
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            {/* Backdrop Mobile */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-300"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Layout Principal */}
            <div className="flex-1 flex flex-col min-w-0 md:pl-64 transition-all duration-300">
                {/* Header Mobile */}
                <header className="md:hidden flex items-center justify-between p-4 glass-panel border-b border-white/10 rounded-none z-30 sticky top-0">
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-zaia-400 to-pink-400 font-display">
                        ZAIA 2.0
                    </h1>
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 text-slate-400 hover:text-white transition-colors"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                </header>

                <main className="p-4 md:p-8 overflow-y-auto">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}
