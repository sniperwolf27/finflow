import { useState } from 'react'
import { Plus, Target, Trash2, Pencil, Trophy, Calendar, TrendingUp, CheckCircle2 } from 'lucide-react'
import { format, differenceInDays, isPast } from 'date-fns'
import { es } from 'date-fns/locale'
import { Modal } from '../components/ui/Modal'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { Spinner } from '../components/ui/Spinner'
import { cn } from '../lib/utils'
import { useToast } from '../context/ToastContext'
import {
  useSavingsGoals,
  useCreateSavingsGoal,
  useUpdateSavingsGoal,
  useDeleteSavingsGoal,
} from '../hooks/useSavingsGoals'
import type { SavingsGoal } from '../api/savings-goals.api'
import { fmtRound as fmt } from '../lib/currency'

/* ─────────────────────────── constants ─────────────────────── */
const EMOJIS = ['🏠', '✈️', '🚗', '📱', '💻', '🎓', '💍', '🏖️', '🐾', '💪', '🛍️', '🏥', '🎮', '📷', '🌱', '💰']
const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#f97316', '#06b6d4', '#22c55e', '#ef4444']

/** Screen reader labels for emoji buttons */
const EMOJI_LABELS: Record<string, string> = {
  '🏠': 'Casa', '✈️': 'Viajes', '🚗': 'Auto', '📱': 'Celular',
  '💻': 'Computadora', '🎓': 'Educación', '💍': 'Anillo', '🏖️': 'Playa',
  '🐾': 'Mascota', '💪': 'Fitness', '🛍️': 'Compras', '🏥': 'Salud',
  '🎮': 'Videojuegos', '📷': 'Fotografía', '🌱': 'Inversión', '💰': 'Dinero',
}

/** Screen reader labels for color buttons */
const COLOR_LABELS: Record<string, string> = {
  '#6366f1': 'Índigo', '#3b82f6': 'Azul', '#10b981': 'Verde', '#f59e0b': 'Ámbar',
  '#ec4899': 'Rosa', '#8b5cf6': 'Morado', '#f97316': 'Naranja', '#06b6d4': 'Cian',
  '#22c55e': 'Verde claro', '#ef4444': 'Rojo',
}



/* ─────────────────────────── sub-components ────────────────── */
function ProgressRing({ percent, color, size = 72 }: { percent: number; color: string; size?: number }) {
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (Math.min(percent, 100) / 100) * circumference
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeWidth={6} fill="none" className="text-border" />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        stroke={color} strokeWidth={6} fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  )
}

function GoalCard({
  goal,
  onAddProgress,
  onEdit,
  onDelete,
}: {
  goal: SavingsGoal
  onAddProgress: (goal: SavingsGoal) => void
  onEdit: (goal: SavingsGoal) => void
  onDelete: (goal: SavingsGoal) => void
}) {
  const percent = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0
  const completed = percent >= 100
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount)
  const deadlineDate = goal.deadline ? new Date(goal.deadline) : null
  const daysLeft = deadlineDate ? differenceInDays(deadlineDate, new Date()) : null
  const overdue = deadlineDate ? isPast(deadlineDate) && !completed : false

  return (
    <div className={cn(
      'card p-5 transition-all duration-200 hover:shadow-md group',
      completed && 'ring-2 ring-[hsl(var(--income)/0.4)]'
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
            style={{ backgroundColor: `${goal.color}18` }}
          >
            {goal.emoji}
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm leading-tight">{goal.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {deadlineDate
                ? (completed
                  ? 'Meta cumplida 🎉'
                  : overdue
                    ? <span className="text-destructive">Venció {format(deadlineDate, "d 'de' MMM", { locale: es })}</span>
                    : `${daysLeft} días restantes`)
                : 'Sin fecha límite'
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(goal)}
            title="Editar"
          >
            <Pencil size={13} />
          </button>
          <button
            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            onClick={() => onDelete(goal)}
            title="Eliminar"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative shrink-0">
          <ProgressRing percent={percent} color={goal.color} />
          <div className="absolute inset-0 flex items-center justify-center rotate-0">
            {completed
              ? <CheckCircle2 size={20} className="text-income" />
              : <span className="text-xs font-bold" style={{ color: goal.color }}>{Math.round(percent)}%</span>
            }
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-end justify-between mb-1">
            <span className="text-lg font-bold text-foreground">{fmt(goal.currentAmount, goal.currency)}</span>
            <span className="text-xs text-muted-foreground">{fmt(goal.targetAmount, goal.currency)}</span>
          </div>
          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: goal.color }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {completed ? '¡Meta alcanzada!' : `Faltan ${fmt(remaining, goal.currency)}`}
          </p>
        </div>
      </div>

      {/* Action */}
      {!completed && (
        <button
          className="w-full btn-secondary text-xs justify-center"
          onClick={() => onAddProgress(goal)}
          style={{ borderColor: `${goal.color}40`, color: goal.color }}
        >
          <TrendingUp size={13} /> Registrar avance
        </button>
      )}
      {completed && (
        <div className="flex items-center justify-center gap-2 py-2 rounded-xl bg-income-subtle text-income text-xs font-semibold">
          <Trophy size={14} /> ¡Felicitaciones!
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────── main page ─────────────────────── */
const BLANK_FORM = {
  name: '', emoji: '🎯', color: '#6366f1', targetAmount: '', currentAmount: '',
  currency: 'USD', deadline: '',
}

export function SavingsGoalsPage() {
  const { data: goals = [], isLoading } = useSavingsGoals()
  const createMutation = useCreateSavingsGoal()
  const updateMutation = useUpdateSavingsGoal()
  const deleteMutation = useDeleteSavingsGoal()
  const toast = useToast()

  const [showCreate, setShowCreate] = useState(false)
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null)
  const [progressGoal, setProgressGoal] = useState<SavingsGoal | null>(null)
  const [deletingGoal, setDeletingGoal] = useState<SavingsGoal | null>(null)
  const [progressAmount, setProgressAmount] = useState('')
  const [form, setForm] = useState(BLANK_FORM)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await createMutation.mutateAsync({
      name:          form.name,
      emoji:         form.emoji,
      color:         form.color,
      targetAmount:  Number(form.targetAmount),
      currentAmount: Number(form.currentAmount) || 0,
      currency:      form.currency,
      deadline:      form.deadline || null,
    }, {
      onSuccess: () => { toast.success('Meta creada'); setShowCreate(false); setForm(BLANK_FORM) },
      onError:   () => toast.error('Error al crear la meta'),
    })
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingGoal) return
    await updateMutation.mutateAsync({
      id: editingGoal.id,
      data: {
        name:        form.name,
        emoji:       form.emoji,
        color:       form.color,
        targetAmount: Number(form.targetAmount),
        currency:    form.currency,
        deadline:    form.deadline || null,
      },
    }, {
      onSuccess: () => { toast.success('Meta actualizada'); setEditingGoal(null) },
      onError:   () => toast.error('Error al actualizar la meta'),
    })
  }

  const handleAddProgress = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!progressGoal) return
    const added = Number(progressAmount)
    if (!added || isNaN(added)) return
    const newAmount = Math.min(progressGoal.currentAmount + added, progressGoal.targetAmount)
    await updateMutation.mutateAsync({
      id: progressGoal.id,
      data: { currentAmount: newAmount },
    }, {
      onSuccess: () => {
        toast.success('Avance registrado')
        setProgressGoal(null)
        setProgressAmount('')
      },
      onError: () => toast.error('Error al registrar el avance'),
    })
  }

  const handleDelete = async () => {
    if (!deletingGoal) return
    await deleteMutation.mutateAsync(deletingGoal.id, {
      onSuccess: () => toast.success('Meta eliminada'),
      onError:   () => toast.error('Error al eliminar la meta'),
    })
    setDeletingGoal(null)
  }

  const openEdit = (goal: SavingsGoal) => {
    setForm({
      name:          goal.name,
      emoji:         goal.emoji,
      color:         goal.color,
      targetAmount:  String(goal.targetAmount),
      currentAmount: String(goal.currentAmount),
      currency:      goal.currency,
      deadline:      goal.deadline ? goal.deadline.split('T')[0] : '',
    })
    setEditingGoal(goal)
  }

  const openCreate = () => { setForm(BLANK_FORM); setShowCreate(true) }

  const completed = goals.filter((g) => g.currentAmount >= g.targetAmount)
  const active    = goals.filter((g) => g.currentAmount <  g.targetAmount)
  const totalSaved  = goals.reduce((s, g) => s + g.currentAmount, 0)
  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Metas de ahorro</h1>
          <p className="text-sm text-muted-foreground">
            {goals.length === 0
              ? 'Define objetivos y seguí tu progreso'
              : `${completed.length} de ${goals.length} metas completadas`}
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={14} /> Nueva meta
        </button>
      </div>

      {/* Summary banner */}
      {goals.length > 0 && (
        <div className="card p-4">
          <div className="grid grid-cols-3 divide-x divide-border">
            <div className="text-center px-4">
              <p className="text-xs text-muted-foreground mb-0.5">Total ahorrado</p>
              <p className="text-lg font-bold text-income">{fmt(totalSaved)}</p>
            </div>
            <div className="text-center px-4">
              <p className="text-xs text-muted-foreground mb-0.5">Total objetivo</p>
              <p className="text-lg font-bold text-foreground">{fmt(totalTarget)}</p>
            </div>
            <div className="text-center px-4">
              <p className="text-xs text-muted-foreground mb-0.5">Progreso global</p>
              <p className="text-lg font-bold text-primary">
                {totalTarget > 0 ? `${Math.round((totalSaved / totalTarget) * 100)}%` : '—'}
              </p>
            </div>
          </div>
          {totalTarget > 0 && (
            <div className="mt-3 h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-[hsl(var(--income))] rounded-full transition-all duration-700"
                style={{ width: `${Math.min((totalSaved / totalTarget) * 100, 100)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {goals.length === 0 && (
        <div className="card p-16 text-center">
          <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Target size={28} className="text-primary" />
          </div>
          <h3 className="font-semibold text-foreground mb-2">Definí tu primera meta</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
            Establecé objetivos de ahorro concretos y llevá el control de tu progreso día a día.
          </p>
          <button className="btn-primary mx-auto" onClick={openCreate}>
            <Plus size={14} /> Crear meta
          </button>
        </div>
      )}

      {/* Active goals */}
      {active.length > 0 && (
        <div>
          {completed.length > 0 && (
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">En progreso</h2>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {active.map((goal) => (
              <GoalCard key={goal.id} goal={goal} onAddProgress={setProgressGoal} onEdit={openEdit} onDelete={setDeletingGoal} />
            ))}
          </div>
        </div>
      )}

      {/* Completed goals */}
      {completed.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Trophy size={12} className="text-amber-500" /> Metas alcanzadas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {completed.map((goal) => (
              <GoalCard key={goal.id} goal={goal} onAddProgress={setProgressGoal} onEdit={openEdit} onDelete={setDeletingGoal} />
            ))}
          </div>
        </div>
      )}

      {/* ─── Create / Edit Modal ─── */}
      {(showCreate || editingGoal) && (
        <GoalFormModal
          title={editingGoal ? 'Editar meta' : 'Nueva meta de ahorro'}
          form={form}
          setForm={setForm}
          isEditing={!!editingGoal}
          isPending={createMutation.isPending || updateMutation.isPending}
          onSubmit={editingGoal ? handleEdit : handleCreate}
          onClose={() => { setShowCreate(false); setEditingGoal(null) }}
        />
      )}

      {/* ─── Add Progress Modal ─── */}
      <Modal
        isOpen={!!progressGoal}
        onClose={() => { setProgressGoal(null); setProgressAmount('') }}
        title="Registrar avance"
        size="sm"
      >
        {progressGoal && (
          <form onSubmit={handleAddProgress} className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <span className="text-2xl">{progressGoal.emoji}</span>
              <div>
                <p className="font-medium text-foreground text-sm">{progressGoal.name}</p>
                <p className="text-xs text-muted-foreground">
                  {fmt(progressGoal.currentAmount, progressGoal.currency)} de {fmt(progressGoal.targetAmount, progressGoal.currency)}
                </p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Monto a agregar ({progressGoal.currency})
              </label>
              <input
                type="number" step="0.01" min="0.01" required
                className="input"
                value={progressAmount}
                onChange={(e) => setProgressAmount(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-1">
                Faltan {fmt(Math.max(0, progressGoal.targetAmount - progressGoal.currentAmount), progressGoal.currency)} para completar la meta
              </p>
            </div>
            <div className="flex gap-3">
              <button type="button" className="btn-secondary flex-1" onClick={() => { setProgressGoal(null); setProgressAmount('') }}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary flex-1" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Guardando...' : 'Guardar avance'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ─── Confirm Delete Modal ─── */}
      <ConfirmModal
        isOpen={!!deletingGoal}
        title="Eliminar meta"
        description={`¿Querés eliminar la meta "${deletingGoal?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onClose={() => setDeletingGoal(null)}
      />
    </div>
  )
}

/* ─────────────────────────── form modal ────────────────────── */
function GoalFormModal({
  title, form, setForm, isEditing, isPending, onSubmit, onClose,
}: {
  title: string
  form: typeof BLANK_FORM
  setForm: React.Dispatch<React.SetStateAction<typeof BLANK_FORM>>
  isEditing: boolean
  isPending: boolean
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
}) {
  return (
    <Modal isOpen onClose={onClose} title={title}>
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Emoji picker */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-2">Ícono</label>
          <div
            role="group"
            aria-label="Seleccionar ícono para la meta"
            className="flex flex-wrap gap-2"
          >
            {EMOJIS.map((e) => (
              <button
                key={e} type="button"
                aria-label={`Ícono: ${EMOJI_LABELS[e] ?? e}`}
                aria-pressed={form.emoji === e}
                className={cn(
                  'w-9 h-9 text-lg rounded-xl transition-all duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  form.emoji === e ? 'bg-primary/15 ring-2 ring-primary scale-110' : 'hover:bg-accent'
                )}
                onClick={() => setForm((f) => ({ ...f, emoji: e }))}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Nombre *</label>
          <input
            className="input" required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="ej. Viaje a Europa, Auto nuevo, Fondo de emergencia..."
          />
        </div>

        {/* Amounts */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Objetivo *</label>
            <input
              type="number" step="0.01" min="1" required
              className="input"
              value={form.targetAmount}
              onChange={(e) => setForm((f) => ({ ...f, targetAmount: e.target.value }))}
              placeholder="5000"
            />
          </div>
          {!isEditing && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Ya tengo</label>
              <input
                type="number" step="0.01" min="0"
                className="input"
                value={form.currentAmount}
                onChange={(e) => setForm((f) => ({ ...f, currentAmount: e.target.value }))}
                placeholder="0"
              />
            </div>
          )}
          {isEditing && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Moneda</label>
              <select className="input" value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}>
                <option value="USD">USD</option><option value="MXN">MXN</option>
                <option value="ARS">ARS</option><option value="COP">COP</option>
                <option value="EUR">EUR</option><option value="BRL">BRL</option>
              </select>
            </div>
          )}
        </div>

        {/* Currency + Deadline */}
        <div className="grid grid-cols-2 gap-3">
          {!isEditing && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Moneda</label>
              <select className="input" value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}>
                <option value="USD">USD</option><option value="MXN">MXN</option>
                <option value="ARS">ARS</option><option value="COP">COP</option>
                <option value="EUR">EUR</option><option value="BRL">BRL</option>
              </select>
            </div>
          )}
          <div className={isEditing ? 'col-span-2' : ''}>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              <Calendar size={11} className="inline mr-1" />
              Fecha límite (opcional)
            </label>
            <input
              type="date" className="input"
              value={form.deadline}
              onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
            />
          </div>
        </div>

        {/* Color */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-2">Color</label>
          <div
            role="group"
            aria-label="Seleccionar color para la meta"
            className="flex flex-wrap gap-2"
          >
            {COLORS.map((c) => (
              <button
                key={c} type="button"
                aria-label={`Color: ${COLOR_LABELS[c] ?? c}${form.color === c ? ' (seleccionado)' : ''}`}
                aria-pressed={form.color === c}
                className={cn(
                  'w-7 h-7 rounded-full transition-all duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary',
                  form.color === c
                    ? 'ring-2 ring-offset-2 ring-foreground scale-110'
                    : 'hover:scale-110',
                )}
                style={{ backgroundColor: c }}
                onClick={() => setForm((f) => ({ ...f, color: c }))}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary flex-1" disabled={isPending}>
            {isPending ? 'Guardando...' : (isEditing ? 'Guardar cambios' : 'Crear meta')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
