import { useState, useMemo } from 'react'
import { format, subMonths, addMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Plus, Trash2, ChevronLeft, ChevronRight, Wallet,
  TrendingDown, CheckCircle2, AlertCircle, Pencil,
} from 'lucide-react'
import { Modal } from '../components/ui/Modal'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { Spinner } from '../components/ui/Spinner'
import { cn } from '../lib/utils'
import { useToast } from '../context/ToastContext'
import { useBudgetProgress, useUpsertBudget, useDeleteBudget } from '../hooks/useBudgets'
import { fmtRound as fmt } from '../lib/currency'
import { useCategories } from '../hooks/useCategories'
import { BudgetWizard } from '../components/budget/BudgetWizard'
import type { BudgetProgress } from '../api/budgets.api'


/* ─── Budget progress bar card ─── */
function BudgetCard({
  budget,
  onEdit,
  onDelete,
}: {
  budget: BudgetProgress
  onEdit: (b: BudgetProgress) => void
  onDelete: (b: BudgetProgress) => void
}) {
  const pct = Math.min(budget.percent, 100)
  const isOver   = budget.exceeded
  const isDanger = budget.percent >= 80 && !isOver
  const isOk     = budget.percent < 60

  const barColor = isOver
    ? 'bg-destructive'
    : isDanger
      ? 'bg-[hsl(var(--warning))]'
      : 'bg-[hsl(var(--income))]'

  const statusIcon = isOver
    ? <AlertCircle size={14} className="text-destructive" />
    : isDanger
      ? <AlertCircle size={14} className="text-warning" />
      : <CheckCircle2 size={14} className="text-income" />

  const catColor = budget.category?.color ?? '#6366f1'

  return (
    <div className={cn(
      'card p-5 group transition-all duration-200 hover:shadow-md',
      isOver && 'ring-1 ring-destructive/40',
      isDanger && 'ring-1 ring-[hsl(var(--warning)/0.3)]',
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
            style={{ backgroundColor: catColor }}
          >
            {budget.category?.icon || <Wallet size={16} className="text-white" />}
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">{budget.name}</p>
            <p className="text-xs text-muted-foreground">
              {budget.category ? budget.category.name : 'Presupuesto total'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => onEdit(budget)}
            title="Editar"
          >
            <Pencil size={13} />
          </button>
          <button
            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            onClick={() => onDelete(budget)}
            title="Eliminar"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Amounts */}
      <div className="flex items-end justify-between mb-2">
        <div>
          <span className="text-xl font-bold text-foreground">{fmt(budget.spent)}</span>
          <span className="text-xs text-muted-foreground ml-1.5">de {fmt(budget.amount)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {statusIcon}
          <span className={cn(
            'text-xs font-semibold',
            isOver ? 'text-destructive' : isDanger ? 'text-warning' : 'text-income'
          )}>
            {budget.percent}%
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden mb-2">
        <div
          className={cn('h-full rounded-full transition-all duration-700', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Status message */}
      <p className={cn(
        'text-xs font-medium',
        isOver   ? 'text-destructive'
        : isDanger ? 'text-warning'
        : isOk     ? 'text-income'
        : 'text-muted-foreground'
      )}>
        {isOver
          ? `Superaste el presupuesto por ${fmt(budget.spent - budget.amount)}`
          : isDanger
            ? `Quedan ${fmt(budget.remaining)} — cuidado con el gasto`
            : `Quedan ${fmt(budget.remaining)} disponibles`}
      </p>
    </div>
  )
}

/* ─── Empty state ─── */
function EmptyState({ onAdd, onWizard }: { onAdd: () => void; onWizard: () => void }) {
  return (
    <div className="card border-dashed border-2 border-primary/20 bg-primary/5 p-8 sm:p-12 text-center relative overflow-hidden group hover:border-primary/40 transition-colors">
      <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <Wallet size={28} className="text-primary group-hover:scale-110 transition-transform duration-300" />
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">Configura tu presupuesto inteligente</h3>
      <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto">
        Analizamos tus últimos 3 meses y creamos un presupuesto personalizado basado en tus hábitos y metas de ahorro.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <button className="btn-primary w-full sm:w-auto px-6 py-2.5 bg-foreground text-background shadow-lg" onClick={onWizard}>
          ✨ Crear con wizard
        </button>
        <button className="btn-secondary w-full sm:w-auto px-6 py-2.5 text-muted-foreground" onClick={onAdd}>
          + Crear manualmente
        </button>
      </div>
    </div>
  )
}

/* ─── Summary strip ─── */
function SummaryStrip({ budgets }: { budgets: BudgetProgress[] }) {
  if (!budgets.length) return null

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0)
  const totalSpent  = budgets.reduce((s, b) => s + b.spent, 0)
  const exceeded    = budgets.filter((b) => b.exceeded).length
  const onTrack     = budgets.filter((b) => !b.exceeded && b.percent < 80).length

  return (
    <div className="card p-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border">
        <div className="text-center px-4">
          <p className="text-xs text-muted-foreground mb-0.5">Presupuestado</p>
          <p className="text-lg font-bold text-foreground">{fmt(totalBudget)}</p>
        </div>
        <div className="text-center px-4">
          <p className="text-xs text-muted-foreground mb-0.5">Gastado</p>
          <p className="text-lg font-bold text-foreground">{fmt(totalSpent)}</p>
        </div>
        <div className="text-center px-4">
          <p className="text-xs text-muted-foreground mb-0.5">En control</p>
          <p className="text-lg font-bold text-income">{onTrack}</p>
        </div>
        <div className="text-center px-4">
          <p className="text-xs text-muted-foreground mb-0.5">Superados</p>
          <p className={cn('text-lg font-bold', exceeded > 0 ? 'text-destructive' : 'text-muted-foreground')}>
            {exceeded}
          </p>
        </div>
      </div>
      {totalBudget > 0 && (
        <div className="mt-3 h-2 w-full bg-secondary rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-700',
              totalSpent > totalBudget ? 'bg-destructive' : 'bg-primary'
            )}
            style={{ width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}

/* ─── Main page ─── */
const BLANK_FORM = { categoryId: '', name: '', amount: '' }

export function BudgetPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const monthStr = format(currentMonth, 'yyyy-MM')
  const monthLabel = format(currentMonth, 'MMMM yyyy', { locale: es })
  const isCurrentMonth = format(new Date(), 'yyyy-MM') === monthStr

  const { data: budgets = [], isLoading } = useBudgetProgress(monthStr)
  const { data: categories = [] } = useCategories()
  const upsertMutation = useUpsertBudget()
  const deleteMutation = useDeleteBudget()
  const toast = useToast()

  const [showForm, setShowForm] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const [editingBudget, setEditingBudget] = useState<BudgetProgress | null>(null)
  const [deletingBudget, setDeletingBudget] = useState<BudgetProgress | null>(null)
  const [form, setForm] = useState(BLANK_FORM)

  // Only expense categories
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.name !== 'Income' && c.name !== 'Ingresos'),
    [categories],
  )

  const openCreate = () => { setForm(BLANK_FORM); setEditingBudget(null); setShowForm(true) }

  const openEdit = (b: BudgetProgress) => {
    setForm({ categoryId: b.categoryId ?? '', name: b.name, amount: String(b.amount) })
    setEditingBudget(b)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.amount) return

    // Auto-name from category if not provided
    const cat = expenseCategories.find((c) => c.id === form.categoryId)
    const name = form.name || cat?.name || 'Presupuesto'

    await upsertMutation.mutateAsync({
      categoryId: form.categoryId || null,
      name,
      amount: Number(form.amount),
    }, {
      onSuccess: () => {
        toast.success(editingBudget ? 'Presupuesto actualizado' : 'Presupuesto creado')
        setShowForm(false)
        setForm(BLANK_FORM)
        setEditingBudget(null)
      },
      onError: () => toast.error('Error al guardar el presupuesto'),
    })
  }

  const handleDelete = async () => {
    if (!deletingBudget) return
    await deleteMutation.mutateAsync(deletingBudget.id, {
      onSuccess: () => toast.success('Presupuesto eliminado'),
      onError:   () => toast.error('Error al eliminar'),
    })
    setDeletingBudget(null)
  }

  // Separate exceeded from normal
  const exceeded = budgets.filter((b) => b.exceeded)
  const normal   = budgets.filter((b) => !b.exceeded)

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Presupuestos</h1>
          <p className="text-sm text-muted-foreground">
            Límites mensuales por categoría
          </p>
        </div>
        <div className="flex items-center gap-2">
          {budgets.length > 0 && (
            <button className="btn-secondary" onClick={() => setShowWizard(true)}>
              ✨ Regenerar
            </button>
          )}
          <button className="btn-primary flex-1 sm:flex-none" onClick={openCreate}>
            <Plus size={14} /> Manual
          </button>
        </div>
      </div>

      {/* Month navigator */}
      <div className="flex items-center gap-3">
        <button
          className="btn-secondary py-1.5 px-3"
          onClick={() => setCurrentMonth((d) => subMonths(d, 1))}
        >
          <ChevronLeft size={15} />
        </button>
        <span className="text-sm font-semibold text-foreground capitalize flex-1 text-center">
          {monthLabel}
          {isCurrentMonth && (
            <span className="ml-2 text-xs font-normal text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              este mes
            </span>
          )}
        </span>
        <button
          className="btn-secondary py-1.5 px-3"
          onClick={() => setCurrentMonth((d) => addMonths(d, 1))}
          disabled={isCurrentMonth}
        >
          <ChevronRight size={15} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      ) : budgets.length === 0 ? (
        <EmptyState onAdd={openCreate} onWizard={() => setShowWizard(true)} />
      ) : (
        <>
          <SummaryStrip budgets={budgets} />

          {/* Exceeded budgets first */}
          {exceeded.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-destructive uppercase tracking-wider mb-3 flex items-center gap-2">
                <TrendingDown size={12} /> Presupuestos superados
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {exceeded.map((b) => (
                  <BudgetCard key={b.id} budget={b} onEdit={openEdit} onDelete={setDeletingBudget} />
                ))}
              </div>
            </div>
          )}

          {/* Normal budgets */}
          {normal.length > 0 && (
            <div>
              {exceeded.length > 0 && (
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">En control</h2>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {normal.map((b) => (
                  <BudgetCard key={b.id} budget={b} onEdit={openEdit} onDelete={setDeletingBudget} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── Create / Edit Modal ─── */}
      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingBudget(null) }}
        title={editingBudget ? 'Editar presupuesto' : 'Nuevo presupuesto'}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Categoría (opcional)</label>
            <select
              className="input"
              value={form.categoryId}
              onChange={(e) => {
                const cat = expenseCategories.find((c) => c.id === e.target.value)
                setForm((f) => ({
                  ...f,
                  categoryId: e.target.value,
                  name: cat?.name ?? f.name,
                }))
              }}
            >
              <option value="">— Sin categoría (presupuesto general) —</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Nombre *</label>
            <input
              className="input" required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="ej. Comida, Transporte, Entretenimiento..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Límite mensual *</label>
            <input
              type="number" step="0.01" min="1" required
              className="input"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="500"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" className="btn-secondary flex-1" onClick={() => { setShowForm(false); setEditingBudget(null) }}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? 'Guardando...' : (editingBudget ? 'Guardar cambios' : 'Crear presupuesto')}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── Confirm Delete ─── */}
      <ConfirmModal
        isOpen={!!deletingBudget}
        title="Eliminar presupuesto"
        description={`¿Querés eliminar el presupuesto "${deletingBudget?.name}"? El historial de gastos no se verá afectado.`}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onClose={() => setDeletingBudget(null)}
      />

      {/* ─── Wizard Integration ─── */}
      <BudgetWizard open={showWizard} onClose={() => setShowWizard(false)} />
    </div>
  )
}
