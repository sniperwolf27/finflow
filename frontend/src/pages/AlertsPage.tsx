import { useState } from 'react'
import { Bell, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { useCategories } from '../hooks/useCategories'
import { Modal } from '../components/ui/Modal'

interface Alert {
  id: string
  name: string
  type: string
  threshold: number | null
  period: string | null
  isActive: boolean
  categoryId: string | null
  category: { name: string; color: string } | null
}

const TYPE_LABELS: Record<string, string> = {
  BUDGET_LIMIT:      'Límite de presupuesto',
  LARGE_TRANSACTION: 'Transacción grande',
  MONTHLY_SUMMARY:   'Resumen mensual',
}

const PERIOD_LABELS: Record<string, string> = {
  DAILY:   'diario',
  WEEKLY:  'semanal',
  MONTHLY: 'mensual',
}

export function AlertsPage() {
  const qc = useQueryClient()
  const { data: categories } = useCategories()
  const { data: alerts, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => api.get<Alert[]>('/alerts').then((r) => r.data),
  })

  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    name: '', type: 'LARGE_TRANSACTION', threshold: '', period: 'MONTHLY', categoryId: '',
  })

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/alerts', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['alerts'] }); setShowCreate(false) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/alerts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/alerts/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  })

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Alertas</h1>
          <p className="text-sm text-muted-foreground">Recibí notificaciones sobre tus patrones de gasto</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={14} /> Nueva alerta
        </button>
      </div>

      <div className="card p-5">
        {isLoading ? (
          <div className="space-y-3 py-4">
            {[1,2,3].map(i => (
              <div key={i} className="h-14 animate-shimmer rounded-xl" />
            ))}
          </div>
        ) : !alerts?.length ? (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
              <Bell size={24} className="text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Sin alertas configuradas</p>
            <p className="text-xs text-muted-foreground">Creá una para recibir avisos sobre anomalías de gasto</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                  alert.isActive ? 'bg-primary/10' : 'bg-muted'
                }`}>
                  <Bell size={15} className={alert.isActive ? 'text-primary' : 'text-muted-foreground'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{alert.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">{TYPE_LABELS[alert.type] ?? alert.type}</span>
                    {alert.threshold != null && (
                      <span className="text-xs text-muted-foreground">
                        · ${alert.threshold}
                        {alert.period && ` / ${PERIOD_LABELS[alert.period] ?? alert.period.toLowerCase()}`}
                      </span>
                    )}
                    {alert.category && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: `${alert.category.color}25`, color: alert.category.color }}
                      >
                        {alert.category.name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="text-muted-foreground hover:text-primary transition-colors"
                    onClick={() => toggleMutation.mutate({ id: alert.id, isActive: !alert.isActive })}
                    title={alert.isActive ? 'Desactivar' : 'Activar'}
                  >
                    {alert.isActive
                      ? <ToggleRight size={24} className="text-primary" />
                      : <ToggleLeft size={24} />
                    }
                  </button>
                  <button
                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-colors"
                    onClick={() => confirm('¿Eliminar esta alerta?') && deleteMutation.mutate(alert.id)}
                    title="Eliminar"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nueva alerta" size="sm">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form) }} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Nombre *</label>
            <input
              className="input" required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="ej. Gasto alto en comida"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Tipo</label>
            <select className="input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              <option value="LARGE_TRANSACTION">Transacción grande</option>
              <option value="BUDGET_LIMIT">Límite de presupuesto</option>
              <option value="MONTHLY_SUMMARY">Resumen mensual</option>
            </select>
          </div>
          {(form.type === 'LARGE_TRANSACTION' || form.type === 'BUDGET_LIMIT') && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Umbral ($)</label>
              <input
                type="number" min="0" step="0.01"
                className="input"
                value={form.threshold}
                onChange={(e) => setForm((f) => ({ ...f, threshold: e.target.value }))}
                placeholder="100"
              />
            </div>
          )}
          {form.type === 'BUDGET_LIMIT' && (
            <>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Período</label>
                <select className="input" value={form.period} onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}>
                  <option value="DAILY">Diario</option>
                  <option value="WEEKLY">Semanal</option>
                  <option value="MONTHLY">Mensual</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Categoría (opcional)</label>
                <select className="input" value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}>
                  <option value="">Todas las categorías</option>
                  {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" className="btn-secondary flex-1" onClick={() => setShowCreate(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
