'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'

export default function AppWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const isPublicPage = pathname === '/login' || pathname === '/setup'

    return (
        <>
            {!isPublicPage && <Sidebar />}
            <main className={`flex-1 ${!isPublicPage ? 'p-4 md:p-8' : ''} overflow-y-auto`}>
                <div className={!isPublicPage ? "max-w-7xl mx-auto" : "w-full"}>
                    {children}
                </div>
            </main>
        </>
    )
}
