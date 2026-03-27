import { AlertTriangle } from 'lucide-react'
import { Modal } from './Modal'

interface Props {
  isOpen: boolean
  title: string
  description: string
  confirmLabel?: string
  onConfirm: () => void
  onClose: () => void
  destructive?: boolean
}

export function ConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirmar',
  onConfirm,
  onClose,
  destructive = true,
}: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-xl bg-destructive/5 border border-destructive/20">
          <AlertTriangle size={16} className="text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-foreground">{description}</p>
        </div>
        <div className="flex gap-3">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className={destructive ? 'btn-destructive flex-1' : 'btn-primary flex-1'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
