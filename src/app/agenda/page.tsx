'use client'
import { useState } from 'react'
import { subMonths, addMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MonthlyList } from '@/components/agenda/MonthlyList'
import { AppointmentModal } from '@/components/agenda/AppointmentModal'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function AgendaPage() {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [refreshKey, setRefreshKey] = useState(0) // Simple way to trigger re-fetch in children

    const handlePrevMonth = () => setCurrentDate(prev => subMonths(prev, 1))
    const handleNextMonth = () => setCurrentDate(prev => addMonths(prev, 1))
    const handleSuccess = () => {
        setRefreshKey(k => k + 1)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-display text-slate-900 dark:text-white mb-1">Agenda de Consultas</h1>
                    <p className="text-slate-600 dark:text-slate-400">Gerencie todas as consultas do mês</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="btn-primary"
                >
                    + Adicionar Consulta
                </button>
            </div>

            {/* Month Selector */}
            <div className="flex items-center justify-between glass-panel p-4">
                <button
                    onClick={handlePrevMonth}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>

                <h2 className="text-xl font-semibold capitalize text-slate-900 dark:text-white">
                    {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                </h2>

                <button
                    onClick={handleNextMonth}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                    <ChevronRight className="w-6 h-6" />
                </button>
            </div>

            <MonthlyList currentDate={currentDate} key={refreshKey} />

            <AppointmentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleSuccess}
                preselectedDate={currentDate}
            />
        </div>
    )
}
