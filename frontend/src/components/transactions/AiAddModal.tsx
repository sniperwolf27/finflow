import { useState } from 'react'
import { Sparkles, ArrowRight, AlertCircle, ArrowLeft } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Spinner } from '../ui/Spinner'
import { transactionsApi } from '../../api/transactions.api'
import { useCreateTransaction } from '../../hooks/useTransactions'
import { useCategories } from '../../hooks/useCategories'
import { TransactionType } from '../../types/transaction.types'
import { useToast } from '../../context/ToastContext'
import { cn } from '../../lib/utils'

interface Props {
  isOpen: boolean
  onClose: () => void
}

type Step = 'input' | 'review'

const EMPTY_FORM = {
  description: '',
  merchant:    '',
  amount:      '',
  currency:    'USD',
  type:        'EXPENSE' as TransactionType,
  date:        new Date().toISOString().split('T')[0],
  categoryId:  '',
}

const CONFIDENCE_CONFIG = {
  high:   { label: 'Alta',  color: 'text-success' },
  medium: { label: 'Media', color: 'text-warning' },
  low:    { label: 'Baja',  color: 'text-destructive' },
} as const

export function AiAddModal({ isOpen, onClose }: Props) {
  const { data: categories } = useCategories()
  const createMutation = useCreateTransaction()
  const toast = useToast()

  const [step, setStep] = useState<Step>('input')
  const [text, setText] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [parseError, setParseError] = useState('')
  const [aiCategory, setAiCategory] = useState('')
  const [confidence, setConfidence] = useState<number | undefined>()
  const [form, setForm] = useState(EMPTY_FORM)

  const handleClose = () => {
    setStep('input')
    setText('')
    setParseError('')
    setAiCategory('')
    setConfidence(undefined)
    setForm(EMPTY_FORM)
    onClose()
  }

  const handleParse = async () => {
    if (!text.trim()) return
    setIsParsing(true)
    setParseError('')
    try {
      const result = await transactionsApi.aiParse(text)
      if (!result.found) {
        setParseError('La IA no pudo identificar una transacción financiera. Intentá ser más específico (ej. "Gasté $50 en el supermercado hoy").')
        return
      }

      const matchedCategory = categories?.find(
        (c) => c.name.toLowerCase() === (result.category ?? '').toLowerCase()
      )

      setAiCategory(result.category ?? '')
      setConfidence(result.confidence)
      setForm({
        description: result.description ?? '',
        merchant:    result.merchant ?? '',
        amount:      result.amount != null ? String(result.amount) : '',
        currency:    result.currency ?? 'USD',
        type:        (result.type as TransactionType) ?? 'EXPENSE',
        date:        result.date ? result.date.split('T')[0] : new Date().toISOString().split('T')[0],
        categoryId:  matchedCategory?.id ?? '',
      })
      setStep('review')
    } catch {
      setParseError('No se pudo conectar con la IA. Intentá de nuevo.')
    } finally {
      setIsParsing(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    await createMutation.mutateAsync({
      amount:      Number(form.amount),
      currency:    form.currency,
      type:        form.type,
      date:        form.date,
      description: form.description,
      merchant:    form.merchant || undefined,
      categoryId:  form.categoryId || undefined,
    }, {
      onSuccess: () => { toast.success('Movimiento guardado'); handleClose() },
      onError:   () => toast.error('Error al guardar'),
    })
  }

  const confidenceKey =
    confidence == null ? null
    : confidence >= 0.85 ? 'high'
    : confidence >= 0.6  ? 'medium'
    : 'low'

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 'input' ? 'Agregar con IA' : 'Revisar y confirmar'}
    >
      {step === 'input' ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Describí tu transacción en lenguaje natural. La IA extraerá todos los datos automáticamente.
          </p>
          <textarea
            className="input resize-none w-full"
            rows={3}
            placeholder="ej. 'Gasté 200 pesos en el supermercado hoy' o 'Suscripción Netflix $15.99'"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleParse()
            }}
            autoFocus
          />
          {parseError && (
            <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/8 border border-destructive/20 rounded-xl p-3">
              <AlertCircle size={13} className="mt-0.5 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" className="btn-secondary flex-1" onClick={handleClose}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn-primary flex-1"
              onClick={handleParse}
              disabled={isParsing || !text.trim()}
            >
              {isParsing ? (
                <><Spinner className="h-3.5 w-3.5" /> Analizando...</>
              ) : (
                <><Sparkles size={14} /> Analizar <ArrowRight size={13} /></>
              )}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          {/* AI confidence strip */}
          {confidenceKey && (
            <div className="flex items-center gap-2 text-xs bg-secondary/60 rounded-xl px-3 py-2.5 border border-border">
              <Sparkles size={12} className="text-primary shrink-0" />
              <span className="text-muted-foreground">Confianza IA:</span>
              <span className={cn('font-semibold', CONFIDENCE_CONFIG[confidenceKey].color)}>
                {CONFIDENCE_CONFIG[confidenceKey].label}
              </span>
              {aiCategory && (
                <>
                  <span className="text-border mx-0.5">·</span>
                  <span className="text-muted-foreground">Categoría sugerida:</span>
                  <span className="font-medium text-foreground">{aiCategory}</span>
                </>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Descripción *</label>
            <input
              className="input" required
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
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
              <label className="block text-xs font-medium text-muted-foreground mb-1">Moneda</label>
              <input
                className="input uppercase"
                value={form.currency}
                maxLength={3}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Fecha *</label>
              <input
                type="date" required
                className="input"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
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
              <label className="block text-xs font-medium text-muted-foreground mb-1">Categoría</label>
              <select
                className="input"
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              >
                <option value="">— Sin categoría —</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              className="btn-ghost px-3"
              onClick={() => setStep('input')}
            >
              <ArrowLeft size={13} /> Volver
            </button>
            <button type="button" className="btn-secondary flex-1" onClick={handleClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Guardando...' : 'Confirmar y guardar'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
