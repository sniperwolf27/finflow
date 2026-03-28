import { useState, useMemo } from 'react'
import { CheckSquare, Square, RefreshCcw, HandCoins } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { ConfirmModal } from '../ui/ConfirmModal'
import { useQuery } from '@tanstack/react-query'
import { transactionsApi } from '../../api/transactions.api'
import { useSettings } from '../../hooks/useSettings'
import { useUpdateBulkCurrency } from '../../hooks/useTransactions'
import { useToast } from '../../context/ToastContext'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function HistoricalCurrencyCorrection() {
  const { data: settingsData } = useSettings()
  const baseCurrency = settingsData?.settings?.baseCurrency || 'DOP'
  
  const [isOpen, setIsOpen] = useState(false)
  const [targetCurrency, setTargetCurrency] = useState('USD')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const toast = useToast()

  const { data, isLoading } = useQuery({
    queryKey: ['transactions-review'],
    queryFn: () => transactionsApi.list({ limit: 400 }),
    enabled: isOpen
  })

  // Filter locally
  const historicalTxs = useMemo(() => {
    return (data?.items || []).filter(tx => tx.currency === baseCurrency)
  }, [data, baseCurrency])
  
  const bulkUpdate = useUpdateBulkCurrency()

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const selectAll = () => setSelectedIds(new Set(historicalTxs.map(t => t.id)))
  const deselectAll = () => setSelectedIds(new Set())

  const handleConfirm = async () => {
    if (selectedIds.size === 0) return
    
    await bulkUpdate.mutateAsync({
      transactionIds: Array.from(selectedIds),
      currency: targetCurrency
    }, {
      onSuccess: (res: any) => {
        toast.success(`${res.count || selectedIds.size} transacciones convertidas a ${targetCurrency}`)
        setSelectedIds(new Set())
        setConfirmOpen(false)
        setIsOpen(false)
      },
      onError: () => toast.error('Error al actualizar las transacciones')
    })
  }

  return (
    <>
      <div className="card p-5 border shadow-sm flex items-center justify-between">
        <div>
           <h2 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
             <HandCoins size={16} className="text-primary" /> Corregir Historial de Moneda
           </h2>
           <p className="text-xs text-muted-foreground w-3/4 leading-relaxed mt-2">
             Si la migración marcó movimientos antiguos como {baseCurrency} (Ej. Gastos online en USD), márcalos aquí para recalcularlos individualmente usando la tasa histórica de su fecha original.
           </p>
        </div>
        <button 
          onClick={() => setIsOpen(true)}
          className="btn-primary text-xs shrink-0"
        >
          Revisar Transacciones
        </button>
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={`Revisión de transacciones listadas como ${baseCurrency}`} size="lg">
         <div className="space-y-4">
            {isLoading ? (
               <div className="flex items-center justify-center p-8 text-sm text-muted-foreground animate-pulse">Cargando lote histórico...</div>
            ) : historicalTxs.length === 0 ? (
               <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">No quedan movimientos bajo {baseCurrency}.</div>
            ) : (
               <>
                 <div className="flex items-center justify-between bg-muted/40 p-3 rounded-lg border border-border/50">
                    <div className="flex gap-3">
                       <button onClick={selectAll} className="text-xs text-primary font-medium hover:underline">Seleccionar todo</button>
                       <button onClick={deselectAll} className="text-xs text-muted-foreground font-medium hover:underline">Des-seleccionar</button>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                       Cambiar seleccionadas a:
                       <select 
                         className="input py-1 px-2 h-8 w-24 text-xs font-semibold"
                         value={targetCurrency}
                         onChange={e => setTargetCurrency(e.target.value)}
                       >
                         <option value="USD">🇺🇸 USD</option>
                         <option value="EUR">🇪🇺 EUR</option>
                         <option value="GBP">🇬🇧 GBP</option>
                         <option value="CAD">🇨🇦 CAD</option>
                       </select>
                    </div>
                 </div>

                 <div className="max-h-[400px] overflow-y-auto border border-border/50 rounded-xl divide-y divide-border/50 shadow-inner p-1 bg-background/50">
                   {historicalTxs.map(tx => {
                     const isChecked = selectedIds.has(tx.id)
                     return (
                       <label key={tx.id} className={`flex items-center p-3 cursor-pointer hover:bg-muted/30 transition-colors ${isChecked ? 'bg-primary/5' : ''}`}>
                          <input 
                            type="checkbox"
                            className="sr-only"
                            checked={isChecked}
                            onChange={() => toggleSelect(tx.id)}
                          />
                          <div className="shrink-0 mr-3 text-primary">
                             {isChecked ? <CheckSquare size={16} /> : <Square size={16} className="text-muted-foreground/40" />}
                          </div>
                          <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
                             <div className="flex flex-col">
                                <span className="text-sm font-semibold truncate text-foreground">{tx.merchant || tx.description}</span>
                                <span className="text-xs text-muted-foreground">{format(new Date(tx.date), 'dd MMM yyyy', { locale: es })}</span>
                             </div>
                             <div className="shrink-0 text-right">
                                <span className="text-sm font-medium block">{tx.originalAmount ?? tx.amount} {tx.currency}</span>
                             </div>
                          </div>
                       </label>
                     )
                   })}
                 </div>

                 <div className="bg-background pt-2 flex items-center justify-between">
                    <span className="text-sm font-medium">{selectedIds.size} seleccionadas</span>
                    <button 
                      type="button" 
                      className="btn-primary" 
                      onClick={() => setConfirmOpen(true)}
                      disabled={selectedIds.size === 0 || bulkUpdate.isPending}
                    >
                       <RefreshCcw size={14} className={bulkUpdate.isPending ? 'animate-spin' : ''} />
                       Aplicar conversión a {targetCurrency}
                    </button>
                 </div>
               </>
            )}
         </div>
      </Modal>

      <ConfirmModal
         isOpen={confirmOpen}
         title="¿Aplicar Paridad de Cambio Registrada?"
         description={`Estás a punto de reatribuir ${selectedIds.size} transacción(es) a ${targetCurrency}. El monto se recalculará dinámicamente usando las tasas de cambio EXACTAS de sus respectivas fechas (${selectedIds.size === 1 ? 'mismo día original' : 'múltiples fechas involucradas'}). Esta alteración bulk no es destructiva sobre los registros originales, sólo sobre el cálculo final local.`}
         confirmLabel="Recalcular Días y Confirmar"
         onClose={() => setConfirmOpen(false)}
         onConfirm={handleConfirm}
         destructive={false}
      />
    </>
  )
}
