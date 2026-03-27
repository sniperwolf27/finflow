import { useState } from 'react'
import { format, isValid } from 'date-fns'
import { es } from 'date-fns/locale'
import { Edit2, Trash2, Check, Mail, PenLine, StickyNote } from 'lucide-react'
import { Transaction } from '../../types/transaction.types'
import { Badge } from '../ui/Badge'
import { Spinner } from '../ui/Spinner'
import { useDeleteTransaction, useConfirmTransaction } from '../../hooks/useTransactions'
import { TransactionEditModal } from './TransactionEditModal'
import { useToast } from '../../context/ToastContext'
import { ConfirmModal } from '../ui/ConfirmModal'

interface Props {
  transactions: Transaction[]
  isLoading: boolean
  total: number
  page: number
  limit: number
  onPageChange: (p: number) => void
}

const typeColors: Record<string, string> = {
  INCOME:   '#22c55e',
  EXPENSE:  '#ef4444',
  TRANSFER: '#6366f1',
}

const typeSymbol: Record<string, string> = {
  INCOME:   '+',
  EXPENSE:  '-',
  TRANSFER: '↔',
}

export function TransactionTable({ transactions, isLoading, total, page, limit, onPageChange }: Props) {
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const deleteMutation  = useDeleteTransaction()
  const confirmMutation = useConfirmTransaction()
  const toast = useToast()

  const totalPages = Math.ceil(total / limit)

  if (isLoading) {
    return (
      <div className="card p-10 flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!transactions.length) {
    return (
      <div className="card p-12 text-center">
        <p className="text-2xl mb-2">💸</p>
        <p className="text-foreground font-medium text-sm mb-1">Sin movimientos</p>
        <p className="text-muted-foreground text-xs">No hay transacciones para los filtros seleccionados</p>
      </div>
    )
  }

  return (
    <>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Historial de transacciones">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Fecha
                </th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Descripción
                </th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                  Categoría
                </th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                  Origen
                </th>
                <th scope="col" className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Monto
                </th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-accent/40 transition-colors group">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                    {(() => { const d = new Date(tx.date); return isValid(d) ? format(d, 'd MMM yyyy', { locale: es }) : '—' })()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground truncate max-w-xs">
                        {tx.merchant || tx.description}
                      </span>
                      {tx.merchant && (
                        <span className="text-xs text-muted-foreground truncate max-w-xs">{tx.description}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {tx.category ? (
                      <Badge color={tx.category.color}>{tx.category.name}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground/60">—</span>
                    )}
                    {!tx.isConfirmed && tx.aiCategory && (
                      <span className="ml-1 text-xs text-warning font-medium">IA</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {tx.source === 'GMAIL' ? (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail size={11} /> Gmail
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <PenLine size={11} /> Manual
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <span className="font-semibold tabular-nums" style={{ color: typeColors[tx.type] }}>
                      {typeSymbol[tx.type]}
                      {(() => {
                        try {
                          return new Intl.NumberFormat('es', { style: 'currency', currency: tx.currency }).format(tx.amount)
                        } catch {
                          return `${tx.currency} ${tx.amount.toFixed(2)}`
                        }
                      })()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {tx.notes && (
                        <span title={tx.notes} className="p-1.5 text-muted-foreground/50">
                          <StickyNote size={13} />
                        </span>
                      )}
                      {!tx.isConfirmed && (
                        <button
                          className="p-1.5 rounded-lg hover:bg-income-subtle text-income transition-colors"
                          title="Confirmar categorización IA"
                          onClick={() => confirmMutation.mutate(tx.id)}
                        >
                          <Check size={13} />
                        </button>
                      )}
                      <button
                        className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                        onClick={() => setEditing(tx)}
                        title="Editar"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-colors"
                        title="Eliminar"
                        onClick={() => setDeletingId(tx.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              Mostrando {(page - 1) * limit + 1}–{Math.min(page * limit, total)} de {total}
            </span>
            <div className="flex gap-1">
              <button
                className="btn-ghost text-xs py-1 px-2"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
              >
                Anterior
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`py-1 px-2.5 text-xs rounded-lg transition-colors ${
                    p === page
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent'
                  }`}
                  onClick={() => onPageChange(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="btn-ghost text-xs py-1 px-2"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      <TransactionEditModal transaction={editing} onClose={() => setEditing(null)} />

      <ConfirmModal
        isOpen={!!deletingId}
        title="Eliminar transacción"
        description="Esta acción no se puede deshacer. ¿Querés eliminar esta transacción?"
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (deletingId) {
            deleteMutation.mutate(deletingId, {
              onSuccess: () => toast.success('Transacción eliminada'),
              onError:   () => toast.error('Error al eliminar'),
            })
          }
          setDeletingId(null)
        }}
        onClose={() => setDeletingId(null)}
      />
    </>
  )
}
