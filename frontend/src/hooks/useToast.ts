import { useState, useCallback } from 'react'
import { ToastMessage, ToastType } from '../components/ui/Toast'

let idCounter = 0

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = String(++idCounter)
    setToasts((prev) => [...prev, { id, type, message }])
  }, [])

  const success = useCallback((msg: string) => toast(msg, 'success'), [toast])
  const error   = useCallback((msg: string) => toast(msg, 'error'),   [toast])
  const warning = useCallback((msg: string) => toast(msg, 'warning'), [toast])

  return { toasts, dismiss, toast, success, error, warning }
}
