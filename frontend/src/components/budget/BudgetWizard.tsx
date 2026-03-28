import { useReducer, useEffect } from 'react'
import { createPortal } from 'react-dom'

import { Spinner } from '../ui/Spinner'
import { useProposal, useApplyProposal, type BudgetProposal } from '../../hooks/useBudgetWizard'
import { useToast } from '../../context/ToastContext'
import { fmtRound as fmt } from '../../lib/currency'
import { ChevronLeft, CheckCircle2, AlertTriangle, ArrowRight, ShieldAlert } from 'lucide-react'
import { cn } from '../../lib/utils'

interface WizardState {
  step: 1 | 2 | 3 | 4
  proposal: BudgetProposal | null
  amounts: Record<string, number>
}

type WizardAction =
  | { type: 'SET_PROPOSAL'; payload: BudgetProposal }
  | { type: 'UPDATE_AMOUNT'; categoryId: string; amount: number }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'RESET' }

const initialState: WizardState = {
  step: 1,
  proposal: null,
  amounts: {}
}

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_PROPOSAL': {
      const newAmounts: Record<string, number> = {}
      for (const cat of action.payload.categories) {
        newAmounts[cat.categoryId] = Math.round(cat.suggested)
      }
      return { ...state, proposal: action.payload, amounts: newAmounts, step: 2 }
    }
    case 'UPDATE_AMOUNT':
      return { ...state, amounts: { ...state.amounts, [action.categoryId]: action.amount } }
    case 'NEXT_STEP':
      return { ...state, step: Math.min(4, state.step + 1) as any }
    case 'PREV_STEP':
      return { ...state, step: Math.max(1, state.step - 1) as any }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex gap-1.5 justify-center mb-6 mt-2 shrink-0">
      {[1, 2, 3, 4].map(s => (
        <div key={s} className={cn("w-2 h-2 rounded-full", s <= step ? "bg-primary" : "bg-muted")} />
      ))}
    </div>
  )
}

function WizardRunner({ onClose }: { onClose: () => void }) {
  const { data, isLoading, isError } = useProposal()
  const applyMut = useApplyProposal()
  const toast = useToast()
  
  const [state, dispatch] = useReducer(wizardReducer, initialState)

  useEffect(() => {
    if (data && state.step === 1 && !state.proposal) {
      const timer = setTimeout(() => {
        dispatch({ type: 'SET_PROPOSAL', payload: data })
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [data, state.step, state.proposal])

  if (isError) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-center space-y-4 h-full">
        <AlertTriangle className="mx-auto text-destructive" size={32} />
        <h3 className="font-bold">Error al analizar historial</h3>
        <p className="text-sm text-muted-foreground">No pudimos procesar tus datos para sugerir un presupuesto.</p>
        <button className="btn-secondary mx-auto mt-4" onClick={onClose}>Cerrar</button>
      </div>
    )
  }

  if (state.step === 1 || isLoading) {
    return (
      <div className="p-6 md:p-8 flex flex-col h-full">
        <Stepper step={1} />
        <div className="flex-1 flex flex-col justify-center pb-12">
          <h2 className="text-xl font-bold text-center mb-6">Analizando tus finanzas...</h2>
          <div className="space-y-4 max-w-sm mx-auto w-full">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
              <div className="h-4 bg-muted/30 rounded w-2/3 animate-pulse" />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-primary/60 border-t-transparent rounded-full animate-spin shrink-0" />
              <div className="h-4 bg-muted/30 rounded w-1/2 animate-pulse" />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-primary/40 border-t-transparent rounded-full animate-spin shrink-0" />
              <div className="h-4 bg-muted/30 rounded w-3/4 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const { proposal, amounts } = state
  if (!proposal) return null

  const totalAssigned = Object.values(amounts).reduce((s, a) => s + (Number(a) || 0), 0)
  const remaining = proposal.monthlyIncome - totalAssigned

  const assignedNeeds = proposal.categories.filter(c => c.type === 'need').reduce((s, c) => s + (amounts[c.categoryId] || 0), 0)
  const assignedWants = proposal.categories.filter(c => c.type === 'want').reduce((s, c) => s + (amounts[c.categoryId] || 0), 0)
  const assignedSavings = proposal.categories.filter(c => c.type === 'saving').reduce((s, c) => s + (amounts[c.categoryId] || 0), 0)

  const handleApply = async () => {
    try {
      const payloadItems = proposal.categories.map(c => ({
        categoryId: c.categoryId,
        amount: amounts[c.categoryId] || 0,
        type: c.type
      }))
      
      await applyMut.mutateAsync(payloadItems)
      toast.success(`✓ ${payloadItems.length} presupuestos creados exitosamente`)
      onClose()
    } catch {
      toast.error('Ocurrió un error al aplicar la propuesta. Reintenta.')
    }
  }

  if (state.step === 2) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          <Stepper step={2} />
          
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent-foreground mb-1">Tu distribución recomendada</h2>
            <p className="text-sm text-muted-foreground">Basada en tu ingreso de <strong className="text-foreground">{fmt(proposal.monthlyIncome, proposal.currency)}/mes</strong></p>
          </div>

          <div className="card p-5 mb-6 space-y-4">
            <h3 className="text-sm font-semibold mb-3 border-b pb-2">Distribución ideal 50/30/20</h3>
            <div className="flex h-3 rounded-full overflow-hidden w-full opacity-80">
              <div style={{ width: '50%' }} className="bg-primary hover:opacity-90 transition-opacity" title="Necesidades 50%" />
              <div style={{ width: '30%' }} className="bg-accent-foreground hover:opacity-90 transition-opacity" title="Deseos 30%" />
              <div style={{ width: '20%' }} className="bg-income hover:opacity-90 transition-opacity" title="Ahorro 20%" />
            </div>
            <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider">
              <span className="text-primary w-1/2 text-left">Necesidades 50%</span>
              <span className="text-accent-foreground text-center">Deseos 30%</span>
              <span className="text-income text-right">Ahorro 20%</span>
            </div>
          </div>

          {proposal.warnings.length > 0 && (
            <div className="bg-warning/10 border border-warning/20 p-4 rounded-2xl mb-6 flex gap-3 text-warning">
              <ShieldAlert size={20} className="shrink-0" />
              <div>
                <p className="text-sm font-bold mb-1">Ajuste de la distribución</p>
                {proposal.warnings.map((w, i) => (
                  <p key={i} className="text-xs mb-1 last:mb-0">{w}</p>
                ))}
                <div className="flex h-2.5 rounded-full overflow-hidden w-full mt-3">
                  <div style={{ width: `${(proposal.adjustedNeeds/proposal.monthlyIncome)*100}%` }} className="bg-primary" />
                  <div style={{ width: `${(proposal.adjustedWants/proposal.monthlyIncome)*100}%` }} className="bg-accent-foreground" />
                  <div style={{ width: `${(proposal.adjustedSavings/proposal.monthlyIncome)*100}%` }} className="bg-income" />
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="shrink-0 p-6 pt-4 bg-background border-t border-border/40 z-10 flex gap-3">
          <button className="btn-secondary h-12 flex-1" onClick={onClose}><ChevronLeft size={16} /> Salir</button>
          <button className="btn-primary h-12 flex-[2] bg-foreground text-background font-bold shadow-lg" onClick={() => dispatch({ type: 'NEXT_STEP' })}>
            Personalizar Ajuste <ArrowRight size={16} />
          </button>
        </div>
      </div>
    )
  }

  if (state.step === 3) {
    const listCategories = (type: 'need'|'want'|'saving', title: string, subtotal: number) => {
      const cats = proposal.categories.filter(c => c.type === type)
      if (cats.length === 0) return null
      
      return (
        <div className="mb-6 last:mb-2">
          <div className="flex items-center justify-between mb-3 px-1 border-b border-border/50 pb-2">
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-muted-foreground">{title}</h3>
            <span className="font-bold text-[13px]">{fmt(subtotal, proposal.currency)}</span>
          </div>
          <div className="space-y-3">
            {cats.map(c => (
              <div key={c.categoryId} className="card p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-background hover:border-foreground/20 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div 
                    className="w-10 h-10 min-w-[40px] rounded-xl shrink-0 flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: `${c.categoryColor}20`, color: c.categoryColor }}
                  >
                    <span className="text-lg leading-none select-none font-bold block truncate max-w-full text-center">
                      {(c.categoryIcon?.length || 0) <= 2 ? c.categoryIcon : c.categoryIcon?.[0] ?? '?'}
                    </span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-foreground truncate max-w-full">{c.categoryName}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                       Promedio: {fmt(c.historicalAvg, proposal.currency)} <span className="mx-1 opacity-50">•</span> Máx: {fmt(c.historicalMax, proposal.currency)}
                    </p>
                    
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${c.confidence === 'high' ? 'bg-income/10 text-income' : c.confidence === 'medium' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}`}>
                        {c.confidence === 'high' ? 'Alta Confianza' : c.confidence === 'medium' ? 'Ajuste Gradual' : 'Estimado'}
                      </span>
                      
                      {c.rationale !== 'Basado en tu hábito real' && (
                        <span className="text-[10px] text-warning font-semibold flex items-center gap-1">
                          <AlertTriangle size={10} /> {c.rationale}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="shrink-0 w-full sm:w-[130px] relative self-end sm:self-center mt-2 sm:mt-0">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold opacity-50 pointer-events-none">
                    {proposal.currency === 'DOP' ? 'RD$' : proposal.currency === 'USD' ? 'US$' : proposal.currency}
                  </span>
                  <input 
                    type="number"
                    className="input h-10 w-full pl-10 pr-3 text-right font-bold text-sm bg-muted/10 border-foreground/10 focus:bg-background"
                    value={amounts[c.categoryId] ?? 0}
                    onChange={e => dispatch({ type: 'UPDATE_AMOUNT', categoryId: c.categoryId, amount: Number(e.target.value) })}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header fijo */}
        <div className="shrink-0 px-6 pt-6 pb-4 md:px-8 md:pt-8 md:pb-4 text-center z-10 bg-background relative border-b border-border/10">
          <Stepper step={3} />
          <h2 className="text-xl sm:text-2xl font-bold mb-1">Ajusta cada límite</h2>
          <p className="text-xs sm:text-sm text-muted-foreground px-2">Hemos asignado montos inteligentes. Edita los valores según prefieras.</p>
        </div>

        {/* Lista scrolleable interna (min-h-0 vital en flex-col para scroll correcto) */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-6 md:px-8 space-y-2 custom-scrollbar relative z-0">
          {listCategories('need', 'Necesidades', assignedNeeds)}
          {listCategories('want', 'Deseos', assignedWants)}
          {listCategories('saving', 'Ahorro / Metas', assignedSavings)}
        </div>

        {/* Footer fijo permanentemente visible */}
        <div className="shrink-0 p-6 md:p-8 bg-background border-t border-border/40 z-20 relative space-y-4 shadow-[0_-15px_30px_rgba(0,0,0,0.03)]">
          <div className="flex justify-between items-center bg-muted/30 p-4 rounded-xl">
             <div>
               <p className="text-[11px] sm:text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Monto Asignado</p>
               <p className="text-sm sm:text-base font-bold">{fmt(totalAssigned, proposal.currency)} <span className="text-muted-foreground font-normal">/ {fmt(proposal.monthlyIncome, proposal.currency)}</span></p>
             </div>
             <div className="text-right">
               <p className="text-[11px] sm:text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Restante</p>
               <p className={cn("text-base sm:text-lg font-bold", remaining < 0 ? "text-destructive" : "text-income")}>
                 {fmt(remaining, proposal.currency)}
               </p>
             </div>
          </div>
          <div className="flex gap-3">
             <button className="btn-secondary h-12 flex-1 border-foreground/10" onClick={() => dispatch({ type: 'PREV_STEP' })}><ChevronLeft size={16} /> <span className="hidden sm:inline ml-1">Volver</span></button>
             <button className="btn-primary h-12 flex-[2] shadow-sm bg-foreground text-background font-bold" onClick={() => dispatch({ type: 'NEXT_STEP' })}>Revisar Resumen <ArrowRight size={16} className="ml-1" /></button>
          </div>
        </div>
      </div>
    )
  }

  if (state.step === 4) {
    const catsCount = proposal.categories.length
    const needCount = proposal.categories.filter(c => c.type === 'need').length
    const wantCount = proposal.categories.filter(c => c.type === 'want').length
    const saveCount = proposal.categories.filter(c => c.type === 'saving').length

    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          <Stepper step={4} />
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-income/10 text-income rounded-full flex items-center justify-center mx-auto mb-4">
               <CheckCircle2 size={32} />
            </div>
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent-foreground mb-1">Tu Presupuesto Inteligente</h2>
            <p className="text-sm text-muted-foreground">{new Date().toLocaleString('es', { month: 'long', year: 'numeric' }).toUpperCase()} · {catsCount} Categorías · <span className="font-bold text-foreground">{fmt(totalAssigned, proposal.currency)}/mes</span></p>
          </div>

          <div className="card border p-6 mb-8 space-y-6 bg-gradient-to-b from-background to-muted/10">
             <div className="flex items-center justify-between">
               <div>
                 <p className="font-bold text-sm">NECESIDADES</p>
                 <p className="text-[11px] text-muted-foreground">{needCount} categorías</p>
               </div>
               <div className="text-right">
                 <p className="font-bold text-sm text-primary">{fmt(assignedNeeds, proposal.currency)}</p>
               </div>
             </div>
             
             <div className="flex items-center justify-between">
               <div>
                 <p className="font-bold text-sm">DESEOS</p>
                 <p className="text-[11px] text-muted-foreground">{wantCount} categorías</p>
               </div>
               <div className="text-right">
                 <p className="font-bold text-sm text-accent-foreground">{fmt(assignedWants, proposal.currency)}</p>
               </div>
             </div>

             <div className="flex items-center justify-between">
               <div>
                 <p className="font-bold text-sm">AHORROS</p>
                 <p className="text-[11px] text-muted-foreground">{saveCount} categorías</p>
               </div>
               <div className="text-right">
                 <p className="font-bold text-sm text-income">{fmt(assignedSavings, proposal.currency)}</p>
               </div>
             </div>
          </div>

          {proposal.warnings.length > 0 && (
            <div className="text-center px-4 mb-6">
              <p className="text-xs text-muted-foreground">⚠️ Recuerda que tus metas requieren un esfuerzo de <strong>{fmt(proposal.adjustedSavings, proposal.currency)}/mes</strong>. Mantén la disciplina para cumplirlas.</p>
            </div>
          )}
        </div>

        <div className="shrink-0 p-6 pt-4 bg-background border-t border-border/40 z-10 flex gap-3">
          <button className="btn-secondary h-12 flex-1" onClick={() => dispatch({ type: 'PREV_STEP' })} disabled={applyMut.isPending}><ChevronLeft size={16} /> Ajustar</button>
          <button className="btn-primary h-12 flex-[2] bg-foreground text-background font-bold" onClick={handleApply} disabled={applyMut.isPending}>
            {applyMut.isPending ? <Spinner className="w-5 h-5 opacity-70" /> : `Crear ${catsCount} Presupuestos`}
          </button>
        </div>
      </div>
    )
  }

  return null
}

export interface BudgetWizardProps {
  open: boolean
  onClose: () => void
}

export function BudgetWizard({ open, onClose }: BudgetWizardProps) {
  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0 z-0" onClick={onClose} />
      
      {/* Contenedor centralizado y unificado: Altura fija, flexible y bordes redondeados */}
      <div className="relative z-10 bg-background rounded-2xl shadow-2xl w-full max-w-lg h-[88vh] md:h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <WizardRunner onClose={onClose} />
      </div>
    </div>,
    document.body
  )
}
