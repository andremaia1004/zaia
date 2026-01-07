import type { Metadata } from 'next'
import { Inter, Outfit } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import AppWrapper from '@/components/layout/AppWrapper'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' })

export const metadata: Metadata = {
  title: 'Zaia - Gestão Ótica',
  description: 'Sistema de gestão para óticas',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${outfit.variable} font-sans bg-[#0f1014] text-slate-200 antialiased`}>
        <AuthProvider>
          <div className="flex min-h-screen">
            <AppWrapper>
              {children}
            </AppWrapper>
          </div>
          <Toaster theme="dark" richColors />
        </AuthProvider>
      </body>
    </html>
  )
}
