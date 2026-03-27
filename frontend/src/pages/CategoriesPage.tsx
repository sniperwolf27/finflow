import { useState } from 'react'
import { Plus, Trash2, Tag } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCategories } from '../hooks/useCategories'
import { categoriesApi } from '../api/categories.api'
import { Modal } from '../components/ui/Modal'

const COLORS = [
  '#f97316', '#3b82f6', '#ec4899', '#8b5cf6', '#f59e0b',
  '#10b981', '#06b6d4', '#6366f1', '#22c55e', '#94a3b8',
  '#ef4444', '#14b8a6', '#a855f7', '#f43f5e', '#84cc16',
]

export function CategoriesPage() {
  const { data: categories, isLoading } = useCategories()
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', color: '#6366f1', icon: 'tag' })

  const createMutation = useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setShowCreate(false) },
  })

  const deleteMutation = useMutation({
    mutationFn: categoriesApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })

  const userCategories   = categories?.filter((c) => c.userId !== null) ?? []
  const systemCategories = categories?.filter((c) => c.userId === null) ?? []

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Categorías</h1>
          <p className="text-sm text-muted-foreground">Organizá tus movimientos por tipo de gasto</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={14} /> Nueva categoría
        </button>
      </div>

      {/* User categories */}
      {userCategories.length > 0 && (
        <div className="card p-5">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Mis categorías
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {userCategories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-border/80 hover:bg-accent/50 transition-all group"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${cat.color}20` }}
                >
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                </div>
                <span className="text-sm font-medium text-foreground flex-1">{cat.name}</span>
                <button
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-all"
                  onClick={() => confirm(`¿Eliminar "${cat.name}"?`) && deleteMutation.mutate(cat.id)}
                  title="Eliminar"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System categories */}
      <div className="card p-5">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Categorías del sistema
        </h2>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-14 animate-shimmer rounded-xl" />
            ))}
          </div>
        ) : !systemCategories.length ? (
          <div className="text-center py-8">
            <Tag size={24} className="text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Sin categorías del sistema</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {systemCategories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${cat.color}20` }}
                >
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                </div>
                <span className="text-sm font-medium text-foreground">{cat.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nueva categoría" size="sm">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form) }} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Nombre *</label>
            <input
              className="input" required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="ej. Gimnasio, Mascotas, Alquiler..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    outline: form.color === c ? `3px solid ${c}` : 'none',
                    outlineOffset: 2,
                  }}
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                />
              ))}
            </div>
          </div>
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
