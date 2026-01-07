'use client'
import { useState, useEffect } from 'react'
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent } from '@dnd-kit/core'
import { useSortable, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { leadService } from '@/services/leads'
import { type Lead } from '@/services/types'
import { useAuth } from '@/contexts/AuthContext'
import { AppointmentModal } from '@/components/agenda/AppointmentModal'
import { LeadDetailsModal } from '@/components/leads/LeadDetailsModal'
import { Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

// Updated Columns to match Agenda Statuses
const COLUMNS = [
    { id: 'Novo', title: 'Novos Leads' }, // Keep logic for incoming
    { id: 'AGENDADO', title: 'Agendado' },
    { id: 'COMPARECEU', title: 'Compareceu' },
    { id: 'FALTOU', title: 'Faltou' },
    { id: 'CANCELADO', title: 'Cancelado' }
]

export default function LeadsPage() {
    const { selectedStore } = useAuth()
    const [items, setItems] = useState<Lead[]>([])
    const [activeId, setActiveId] = useState<string | null>(null)
    const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false)
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

    const [convertingLead, setConvertingLead] = useState<Lead | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchLeads()
    }, [selectedStore])

    const fetchLeads = async () => {
        setLoading(true)
        try {
            const data = await leadService.getAll(selectedStore?.id)
            setItems(data)
        } finally {
            setLoading(false)
        }
    }

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string)
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event

        if (!over) {
            setActiveId(null)
            return
        }

        const activeId = active.id as string
        const overId = over.id as string

        // Determine target column
        let targetStatus = overId
        // If overId is not a column, find the item's status
        if (!COLUMNS.find(c => c.id === overId)) {
            const overItem = items.find(i => i.id === overId)
            if (overItem) targetStatus = overItem.status
        }

        // Update Local State immediately
        const oldItem = items.find(i => i.id === activeId)
        if (!oldItem || oldItem.status === targetStatus) {
            setActiveId(null)
            return
        }

        setItems(items.map(i => i.id === activeId ? { ...i, status: targetStatus } : i))
        setActiveId(null)

        // Trigger Side Effects
        // If moved to 'AGENDADO' (case insensitive check might be needed if I mixed legacy 'Agendou')
        if (targetStatus === 'AGENDADO' && oldItem.status !== 'AGENDADO') {
            setConvertingLead(oldItem)
            setIsAppointmentModalOpen(true)
        }

        // Persist to DB
        try {
            await leadService.updateStatus(activeId, targetStatus)
        } catch (error) {
            console.error("Failed to update status", error)
        }
    }

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold font-display text-white">Pipeline de Leads</h1>
                <button className="btn-primary flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Novo Lead
                </button>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-zaia-500 animate-spin" />
                    </div>
                ) : (
                    <div className="flex gap-4 min-w-full overflow-x-auto flex-1 pb-4">
                        {COLUMNS.map(col => (
                            <div key={col.id} className="w-80 min-w-[320px] glass-panel flex flex-col h-full bg-slate-900/40 border border-white/5">
                                <div className="p-4 border-b border-white/5 font-semibold text-slate-300 flex justify-between items-center">
                                    {col.title}
                                    <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full text-slate-500">
                                        {items.filter(i => i.status === col.id).length}
                                    </span>
                                </div>

                                <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                                    {items.filter(i => i.status === col.id).map(item => (
                                        <SortableItem
                                            key={item.id}
                                            id={item.id}
                                            item={item}
                                            onClick={() => setSelectedLead(item)}
                                        />
                                    ))}
                                    {items.filter(i => i.status === col.id).length === 0 && (
                                        <div className="h-20 border-2 border-dashed border-white/5 rounded-lg flex items-center justify-center text-slate-600 text-sm">
                                            Arraste aqui
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <DragOverlay>
                    {activeId ? (
                        <div className="glass-card p-4 border-zaia-500/50 shadow-2xl cursor-grabbing rotate-2 scale-105">
                            <span className="text-white font-medium">
                                {items.find(i => i.id === activeId)?.client?.name || 'Lead'}
                            </span>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* Appointment Modal Logic for "AGENDADO" column drag */}
            <AppointmentModal
                isOpen={isAppointmentModalOpen}
                onClose={() => {
                    setIsAppointmentModalOpen(false)
                    setConvertingLead(null)
                }}
                onSuccess={() => {
                    fetchLeads()
                }}
                initialData={convertingLead ? {
                    client_name: convertingLead.client?.name,
                    client_phone: convertingLead.client?.phone,
                    origin: convertingLead.channel,
                    notes: `Agendamento via Lead Kanban. Interesse: ${convertingLead.interest || 'N/A'}`
                } : undefined}
            />

            {/* Lead Details Modal */}
            <LeadDetailsModal
                isOpen={!!selectedLead}
                onClose={() => setSelectedLead(null)}
                lead={selectedLead}
                onDelete={async (id) => {
                    await leadService.delete(id)
                    fetchLeads()
                    toast.success('Lead excluído com sucesso')
                }}
            />
        </div>
    )
}

function SortableItem({ id, item, onClick }: { id: string, item: Lead, onClick?: () => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={onClick}
            className="glass-card p-4 cursor-pointer active:cursor-grabbing hover:border-zaia-500/50 group"
        >
            <div className="flex flex-col gap-1">
                <span className="text-white font-medium group-hover:text-zaia-300 transition-colors">
                    {item.client?.name || 'Novo Lead'}
                </span>
                <span className="text-xs text-slate-500">
                    {item.client?.phone || 'Sem telefone'}
                </span>
                <div className="mt-2 flex gap-2">
                    <span className="text-[10px] uppercase tracking-wider bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                        {item.channel || 'Geral'}
                    </span>
                    {item.status && (
                        <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${item.status === 'AGENDADO' ? 'bg-blue-900/30 text-blue-400' :
                            item.status === 'COMPARECEU' ? 'bg-green-900/30 text-green-400' :
                                'bg-slate-800 text-slate-400'
                            }`}>
                            {item.status}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
