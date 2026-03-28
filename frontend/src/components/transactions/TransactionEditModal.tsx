import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Transaction, TransactionType } from '../../types/transaction.types'
import { useUpdateTransaction, useUpdateBulkCurrency } from '../../hooks/useTransactions'
import { useCategories } from '../../hooks/useCategories'
import { useSettings, useExchangeRates } from '../../hooks/useSettings'
import { ConfirmModal } from '../ui/ConfirmModal'
import { useToast } from '../../context/ToastContext'

interface Props {
  transaction: Transaction | null
  onClose: () => void
}

export function TransactionEditModal({ transaction, onClose }: Props) {
  const { data: categories } = useCategories()
  const updateMutation = useUpdateTransaction()
  const toast = useToast()

  const { data: settingsData } = useSettings()
  const { data: rates } = useExchangeRates()
  const baseCurrency = settingsData?.settings?.baseCurrency || 'DOP'
  
  const bulkCurrencyMutation = useUpdateBulkCurrency()
  const [pendingCurrency, setPendingCurrency] = useState<string | null>(null)

  const [form, setForm] = useState({
    description: '',
    merchant: '',
    amount: '',
    currency: 'DOP',
    type: 'EXPENSE' as TransactionType,
    categoryId: '',
    notes: '',
    date: '',
  })

  useEffect(() => {
    if (transaction) {
      setForm({
        description: transaction.description,
        merchant:    transaction.merchant ?? '',
        amount:      String(transaction.originalAmount ?? transaction.amount),
        currency:    transaction.currency || baseCurrency,
        type:        transaction.type,
        categoryId:  transaction.categoryId ?? '',
        notes:       transaction.notes ?? '',
        date:        transaction.date ? transaction.date.split('T')[0] : '',
      })
    }
  }, [transaction, baseCurrency])

  const [debouncedAmount, setDebouncedAmount] = useState(form.amount)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedAmount(form.amount), 300)
    return () => clearTimeout(t)
  }, [form.amount])

  const showPreview = form.currency !== baseCurrency && debouncedAmount && !isNaN(Number(debouncedAmount))
  const targetRate = rates?.find(r => r.from === form.currency)
  const isRateAvailable = !!targetRate
  const previewAmount = targetRate ? Number(debouncedAmount) * targetRate.rate : 0

  if (!transaction) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    let finalAmount = Number(form.amount)
    if (form.currency !== baseCurrency) {
       const fallbackRate = rates?.find(r => r.from === form.currency)
       if (fallbackRate) finalAmount = Number(form.amount) * fallbackRate.rate
    }

    await updateMutation.mutateAsync({
      id:          transaction.id,
      description: form.description,
      merchant:    form.merchant || undefined,
      originalAmount: Number(form.amount),
      amount:      finalAmount,
      currency:    form.currency,
      type:        form.type,
      categoryId:  form.categoryId || undefined,
      notes:       form.notes || undefined,
      date:        new Date(form.date).toISOString(),
    }, {
      onSuccess: () => { toast.success('Transacción actualizada'); onClose() },
      onError:   () => toast.error('Error al guardar'),
    })
  }
  
  const handleCurrencyConfirm = async () => {
    if (!pendingCurrency || !transaction) return
    await bulkCurrencyMutation.mutateAsync({
      transactionIds: [transaction.id],
      currency: pendingCurrency
    }, {
      onSuccess: () => {
        toast.success('Moneda actualizada correctamente')
        setPendingCurrency(null)
        onClose()
      },
      onError: () => {
        toast.error('Error al recalcular moneda')
        setPendingCurrency(null)
      }
    })
  }

  const pendingRate = rates?.find(r => r.from === pendingCurrency)
  const pendingAmountPreview = pendingRate ? Number(transaction.originalAmount ?? transaction.amount) * pendingRate.rate : 0

  return (
    <>
    <Modal isOpen={!!transaction} onClose={onClose} title="Editar movimiento">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Descripción *</label>
          <input
            className="input"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Monto y Moneda *</label>
            <div className="flex gap-2">
              <input
                type="number" step="0.01" min="0" required
                className="input flex-1 min-w-0"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
              />
              <select 
                className="input w-[100px] shrink-0 font-medium px-2"
                value={form.currency}
                onChange={(e) => {
                  if (e.target.value !== transaction.currency) {
                    setPendingCurrency(e.target.value)
                  }
                }}
              >
                <option value="DOP">🇩🇴 DOP</option>
                <option value="USD">🇺🇸 USD</option>
                <option value="EUR">🇪🇺 EUR</option>
                <option value="GBP">🇬🇧 GBP</option>
                <option value="CAD">🇨🇦 CAD</option>
              </select>
            </div>
            
            {showPreview && (
               <div className="mt-1.5 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-300">
                  {isRateAvailable ? (
                    <span className="text-xs text-muted-foreground font-medium">
                       ≈ {new Intl.NumberFormat('es-DO', { style: 'currency', currency: baseCurrency }).format(previewAmount)}
                    </span>
                  ) : (
                    <span className="text-xs text-warning font-medium">
                       Tasa no disponible
                    </span>
                  )}
               </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Tipo</label>
            <select
              className="input"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as TransactionType }))}
            >
              <option value="EXPENSE">Gasto</option>
              <option value="INCOME">Ingreso</option>
              <option value="TRANSFER">Transferencia</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Comercio</label>
            <input
              className="input"
              value={form.merchant}
              onChange={(e) => setForm((f) => ({ ...f, merchant: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Fecha</label>
            <input
              type="date" required
              className="input"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Categoría</label>
          <select
            className="input"
            value={form.categoryId}
            onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
          >
            <option value="">— Sin categoría —</option>
            {categories?.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Notas</label>
          <textarea
            className="input resize-none"
            rows={2}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Detalles adicionales, número de referencia..."
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary flex-1" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </Modal>
    <ConfirmModal 
      isOpen={!!pendingCurrency} 
      onClose={() => setPendingCurrency(null)}
      title="¿Cambiar moneda?"
      description={`El monto convertido se recalculará usando la tasa del ${transaction.date ? new Date(transaction.date).toLocaleDateString() : 'día original'}.\nMonto original: ${transaction.currency} ${transaction.originalAmount ?? transaction.amount} → ${pendingCurrency} ${transaction.originalAmount ?? transaction.amount} ≈ ${baseCurrency} ${pendingAmountPreview.toFixed(2)}`}
      confirmLabel="Confirmar cambio"
      destructive={false}
      onConfirm={handleCurrencyConfirm}
    />
    </>
  )
}
