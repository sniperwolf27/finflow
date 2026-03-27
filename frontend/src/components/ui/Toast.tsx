import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react'
import { cn } from '../../lib/utils'

export type ToastType = 'success' | 'error' | 'warning'

export interface ToastMessage {
  id: string
  type: ToastType
  message: string
}

interface ToastProps {
  toasts: ToastMessage[]
  onDismiss: (id: string) => void
}

const icons = {
  success: <CheckCircle2 size={16} className="text-income shrink-0" />,
  error:   <XCircle     size={16} className="text-destructive shrink-0" />,
  warning: <AlertCircle size={16} className="text-warning shrink-0" />,
}

const borders = {
  success: 'border-l-[hsl(var(--income))]',
  error:   'border-l-destructive',
  warning: 'border-l-[hsl(var(--warning))]',
}

function Toast({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Trigger enter animation
    const show = requestAnimationFrame(() => setVisible(true))
    // Auto dismiss
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onDismiss(toast.id), 300)
    }, 3500)
    return () => {
      cancelAnimationFrame(show)
      clearTimeout(timer)
    }
  }, [toast.id, onDismiss])

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border border-l-4 shadow-lg',
        'transition-all duration-300 max-w-sm w-full',
        borders[toast.type],
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
      )}
    >
      {icons[toast.type]}
      <p className="text-sm text-foreground flex-1 font-medium">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export function ToastContainer({ toasts, onDismiss }: ToastProps) {
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-20 lg:bottom-5 right-4 z-[100] flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <Toast toast={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  )
}
