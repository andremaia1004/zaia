import { Modal } from './Modal'

interface ConfirmModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    description: string
    confirmText?: string
    cancelText?: string
    variant?: 'danger' | 'warning' | 'info'
    loading?: boolean
}

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    variant = 'danger',
    loading = false
}: ConfirmModalProps) {

    // Variant styles for the confirm button
    const variantStyles = {
        danger: 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20',
        warning: 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20',
        info: 'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/20'
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-6">
                <p className="text-slate-600 dark:text-slate-300">
                    {description}
                </p>

                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className={`px-4 py-2 rounded-lg font-medium shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]}`}
                    >
                        {loading ? 'Processando...' : confirmText}
                    </button>
                </div>
            </div>
        </Modal>
    )
}
