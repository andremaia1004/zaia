'use client'
import { startOfWeek, endOfWeek, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

interface WeekSelectorProps {
    currentDate: Date
    onPrev: () => void
    onNext: () => void
}

export function WeekSelector({ currentDate, onPrev, onNext }: WeekSelectorProps) {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 }) // Monday
    const end = endOfWeek(currentDate, { weekStartsOn: 1 })

    return (
        <div className="glass-card p-4 flex items-center justify-between w-full max-w-md">
            <button
                onClick={onPrev}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
                <ChevronLeft className="w-5 h-5 text-slate-400 hover:text-white" />
            </button>

            <div className="flex items-center gap-3">
                <CalendarIcon className="w-5 h-5 text-zaia-400" />
                <span className="text-lg font-medium text-white">
                    {format(start, "d 'de' MMM", { locale: ptBR })} - {format(end, "d 'de' MMM", { locale: ptBR })}
                </span>
            </div>

            <button
                onClick={onNext}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
                <ChevronRight className="w-5 h-5 text-slate-400 hover:text-white" />
            </button>
        </div>
    )
}
