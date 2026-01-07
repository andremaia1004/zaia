
export interface Professional {
    id: string
    name: string
    role: string
    active: boolean
    email?: string // Optional for invites
    user_id?: string // Linked Auth User ID
    store_id?: string | null
}

export interface Lead {
    id: string
    client_id: string
    status: string
    channel: string
    interest: string
    client?: Client
    created_at?: string
    reminder_sent?: boolean
    tasks?: LeadTask[]
    store_id?: string
}

export interface LeadTask {
    id: string
    text: string
    completed: boolean
}

export interface Client {
    id: string
    name: string
    phone: string
    email?: string
    store_id?: string
}

export interface Appointment {
    id: string
    date: string
    client_id: string
    professional_id: string
    status: 'AGENDADO' | 'COMPARECEU' | 'FALTOU' | 'REMARCADO' | 'CANCELADO'
    result: 'NAO_DEFINIDO' | 'COMPROU' | 'NAO_COMPROU'
    notes?: string
    origin?: string
    value?: number
    client?: Client // Joined
    professional?: Professional // Joined
    store_id?: string
}
