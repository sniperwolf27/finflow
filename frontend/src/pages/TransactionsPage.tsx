import { useState } from 'react'
import { Search, Filter, Download, Plus, Sparkles, X } from 'lucide-react'
import { TransactionTable } from '../components/transactions/TransactionTable'
import { AiAddModal } from '../components/transactions/AiAddModal'
import { useTransactions, useCreateTransaction } from '../hooks/useTransactions'
import { useCategories } from '../hooks/useCategories'
import { TransactionFilters, TransactionType } from '../types/transaction.types'
import { transactionsApi } from '../api/transactions.api'
import { Modal } from '../components/ui/Modal'

export function TransactionsPage() {
  const { data: categories } = useCategories()
  const [filters, setFilters] = useState<TransactionFilters>({ page: 1, limit: 50 })
  const [showCreate, setShowCreate] = useState(false)
  const [showAiAdd, setShowAiAdd] = useState(false)
  const { data, isLoading, isError } = useTransactions(filters)
  const createMutation = useCreateTransaction()

  const [newTx, setNewTx] = useState({
    description: '', merchant: '', amount: '', currency: 'USD',
    type: 'EXPENSE' as TransactionType, date: new Date().toISOString().split('T')[0],
    categoryId: '', notes: '',
  })

  const hasActiveFilters = !!(filters.search || filters.type || filters.categoryId || filters.dateFrom || filters.dateTo)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await createMutation.mutateAsync({
      ...newTx,
      amount: Number(newTx.amount),
      categoryId: newTx.categoryId || undefined,
      notes: newTx.notes || undefined,
    })
    setShowCreate(false)
    setNewTx({ description: '', merchant: '', amount: '', currency: 'USD', type: 'EXPENSE', date: new Date().toISOString().split('T')[0], categoryId: '', notes: '' })
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Movimientos</h1>
          <p className="text-sm text-muted-foreground">
            {data?.total ?? 0} {(data?.total ?? 0) === 1 ? 'transacción' : 'transacciones'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-secondary"
            onClick={() => transactionsApi.exportCsv(filters)}
            title="Exportar CSV"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Exportar</span>
          </button>
          <button className="btn-secondary" onClick={() => setShowAiAdd(true)}>
            <Sparkles size={14} />
            <span className="hidden sm:inline">Con IA</span>
          </button>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={14} />
            <span className="hidden sm:inline">Agregar</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-48 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              className="input pl-9"
              placeholder="Buscar movimientos..."
              value={filters.search ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
            />
          </div>
          <select
            className="input w-40"
            value={filters.type ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, type: (e.target.value as TransactionType) || undefined, page: 1 }))}
          >
            <option value="">Todos los tipos</option>
            <option value="INCOME">Ingreso</option>
            <option value="EXPENSE">Gasto</option>
            <option value="TRANSFER">Transferencia</option>
          </select>
          <select
            className="input w-44"
            value={filters.categoryId ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value || undefined, page: 1 }))}
          >
            <option value="">Todas las categorías</option>
            {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="input w-36"
              value={filters.dateFrom ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value || undefined, page: 1 }))}
            />
            <span className="text-muted-foreground text-xs">a</span>
            <input
              type="date"
              className="input w-36"
              value={filters.dateTo ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value || undefined, page: 1 }))}
            />
          </div>
          {hasActiveFilters && (
            <button
              className="btn-ghost text-xs text-muted-foreground"
              onClick={() => setFilters({ page: 1, limit: 50 })}
            >
              <X size={13} /> Limpiar
            </button>
          )}
          {!hasActiveFilters && (
            <button
              className="btn-ghost text-xs text-muted-foreground"
              onClick={() => setFilters({ page: 1, limit: 50 })}
            >
              <Filter size={13} /> Filtros
            </button>
          )}
        </div>
      </div>

      {isError ? (
        <div className="card p-10 text-center">
          <p className="text-destructive text-sm">Error al cargar movimientos. Recargá la página.</p>
        </div>
      ) : (
        <TransactionTable
          transactions={data?.items ?? []}
          isLoading={isLoading}
          total={data?.total ?? 0}
          page={filters.page ?? 1}
          limit={filters.limit ?? 50}
          onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
        />
      )}

      <AiAddModal isOpen={showAiAdd} onClose={() => setShowAiAdd(false)} />

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Agregar movimiento">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Descripción *</label>
            <input
              className="input"
              required
              value={newTx.description}
              onChange={(e) => setNewTx((f) => ({ ...f, description: e.target.value }))}
              placeholder="ej. Supermercado, Netflix, Salario..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Monto *</label>
              <input
                type="number" step="0.01" min="0" required
                className="input"
                value={newTx.amount}
                onChange={(e) => setNewTx((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Tipo</label>
              <select
                className="input"
                value={newTx.type}
                onChange={(e) => setNewTx((f) => ({ ...f, type: e.target.value as TransactionType }))}
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
                value={newTx.merchant}
                onChange={(e) => setNewTx((f) => ({ ...f, merchant: e.target.value }))}
                placeholder="ej. Amazon, Uber..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Fecha</label>
              <input
                type="date" required
                className="input"
                value={newTx.date}
                onChange={(e) => setNewTx((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Categoría</label>
            <select
              className="input"
              value={newTx.categoryId}
              onChange={(e) => setNewTx((f) => ({ ...f, categoryId: e.target.value }))}
            >
              <option value="">— Sin categoría —</option>
              {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Notas (opcional)</label>
            <textarea
              className="input resize-none"
              rows={2}
              value={newTx.notes}
              onChange={(e) => setNewTx((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Detalles adicionales, número de referencia..."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={() => setShowCreate(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
