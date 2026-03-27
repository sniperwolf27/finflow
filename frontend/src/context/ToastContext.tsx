import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { ToastMessage, ToastType, ToastContainer } from '../components/ui/Toast'

interface ToastContextValue {
  success: (msg: string) => void
  error:   (msg: string) => void
  warning: (msg: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let idCounter = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const add = useCallback((message: string, type: ToastType) => {
    const id = String(++idCounter)
    setToasts((prev) => [...prev, { id, type, message }])
  }, [])

  const success = useCallback((msg: string) => add(msg, 'success'), [add])
  const error   = useCallback((msg: string) => add(msg, 'error'),   [add])
  const warning = useCallback((msg: string) => add(msg, 'warning'), [add])

  return (
    <ToastContext.Provider value={{ success, error, warning }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider')
  return ctx
}
