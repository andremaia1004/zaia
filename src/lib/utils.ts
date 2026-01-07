import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, pattern: string = 'dd/MM/yyyy') {
    if (!date) return ''
    const d = typeof date === 'string' ? parseISO(date) : date
    try {
        return format(d, pattern, { locale: ptBR })
    } catch (e) {
        return ''
    }
}

export const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
};
