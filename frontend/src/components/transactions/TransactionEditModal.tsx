import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Transaction, TransactionType } from '../../types/transaction.types'
import { useUpdateTransaction } from '../../hooks/useTransactions'
import { useCategories } from '../../hooks/useCategories'
import { useToast } from '../../context/ToastContext'

interface Props {
  transaction: Transaction | null
  onClose: () => void
}

export function TransactionEditModal({ transaction, onClose }: Props) {
  const { data: categories } = useCategories()
  const updateMutation = useUpdateTransaction()
  const toast = useToast()

  const [form, setForm] = useState({
    description: '',
    merchant: '',
    amount: '',
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
        amount:      String(transaction.amount),
        type:        transaction.type,
        categoryId:  transaction.categoryId ?? '',
        notes:       transaction.notes ?? '',
        date:        transaction.date ? transaction.date.split('T')[0] : '',
      })
    }
  }, [transaction])

  if (!transaction) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await updateMutation.mutateAsync({
      id:          transaction.id,
      description: form.description,
      merchant:    form.merchant || undefined,
      amount:      Number(form.amount),
      type:        form.type,
      categoryId:  form.categoryId || undefined,
      notes:       form.notes || undefined,
      date:        new Date(form.date).toISOString(),
    }, {
      onSuccess: () => { toast.success('Transacción actualizada'); onClose() },
      onError:   () => toast.error('Error al guardar'),
    })
  }

  return (
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
            <label className="block text-xs font-medium text-muted-foreground mb-1">Monto *</label>
            <input
              type="number" step="0.01" min="0" required
              className="input"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            />
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
  )
}
