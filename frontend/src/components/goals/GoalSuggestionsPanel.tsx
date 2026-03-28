import { useState } from 'react'
import { Sparkles, RefreshCcw, X, ArrowRight, TrendingDown, Scissors, ShieldAlert, ArrowUpRight, CheckCircle2 } from 'lucide-react'
import {
  useSuggestions,
  useGenerateSuggestions,
  useAcceptSuggestion,
  useDismissSuggestion,
  type GoalSuggestion
} from '../../hooks/useSuggestions'
import { useSettings, useExchangeRates } from '../../hooks/useSettings'
import { useToast } from '../../context/ToastContext'
import { Modal } from '../ui/Modal'
import { fmtRound as fmt } from '../../lib/currency'

function getIconForType(type: string) {
  switch (type) {
    case 'REDUCE_CATEGORY': return <TrendingDown size={20} className="text-warning" />
    case 'BUILD_EMERGENCY_FUND': return <ShieldAlert size={20} className="text-income" />
    case 'ELIMINATE_SUBSCRIPTION': return <Scissors size={20} className="text-destructive" />
    case 'INCREASE_SAVINGS_RATE': return <ArrowUpRight size={20} className="text-primary" />
    default: return <Sparkles size={20} className="text-primary" />
  }
}

function getConfidenceBadge(confidence: number) {
  if (confidence >= 0.8) {
    return <span className="bg-income/10 text-income text-[10px] uppercase font-bold px-2 py-0.5 rounded-full inline-block">Alta confianza</span>
  }
  if (confidence >= 0.5) {
    return <span className="bg-warning/10 text-warning text-[10px] uppercase font-bold px-2 py-0.5 rounded-full inline-block">Sugerido</span>
  }
  return <span className="bg-muted text-muted-foreground text-[10px] uppercase font-bold px-2 py-0.5 rounded-full inline-block">Para considerar</span>
}

export function GoalSuggestionsPanel() {
  const { data: suggestions, isLoading, isError } = useSuggestions()
  const generateMut = useGenerateSuggestions()
  const acceptMut = useAcceptSuggestion()
  const dismissMut = useDismissSuggestion()
  const toast = useToast()

  const { data: settingsData } = useSettings()
  const { data: rates } = useExchangeRates()
  const baseCurrency = settingsData?.settings?.baseCurrency || 'DOP'

  // Modal de aceptar
  const [acceptingGoal, setAcceptingGoal] = useState<GoalSuggestion | null>(null)
  const [formAmount, setFormAmount] = useState('')
  const [formMonths, setFormMonths] = useState('6')

  // Confirmación inline de descarto
  const [dismissingId, setDismissingId] = useState<string | null>(null)

  const handleGenerate = async () => {
    try {
      await generateMut.mutateAsync()
      toast.success('Sugerencias actualizadas')
    } catch {
      toast.error('Error al generar sugerencias')
    }
  }

  const handleOpenAccept = (sug: GoalSuggestion) => {
    setFormAmount(String(sug.targetAmount))
    setFormMonths('6')
    setAcceptingGoal(sug)
  }

  const handleAcceptSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!acceptingGoal) return
    try {
      await acceptMut.mutateAsync({
        id: acceptingGoal.id,
        params: {
          targetAmount: Number(formAmount),
          months: Number(formMonths)
        }
      })
      toast.success('¡Meta creada con éxito!')
      setAcceptingGoal(null)
    } catch {
      toast.error('Hubo un error al aceptar la meta')
    }
  }

  const handleDismiss = async (id: string) => {
    try {
      await dismissMut.mutateAsync(id)
      setDismissingId(null)
    } catch {
      toast.error('Error al descartar')
    }
  }

  const fmtOriginal = (val: number, currency: string) => fmt(val, currency)

  // Calculate local equivalent for the preview safely
  const calculateEquivalent = (val: number, currency: string) => {
    if (currency === baseCurrency) return val
    const rate = rates?.find(r => r.from === currency)?.rate || 1
    return val * rate
  }

  if (isError) {
    return (
      <div className="card p-5 text-center bg-destructive/5 border-destructive/20 border">
        <p className="text-sm font-medium text-destructive">No pudimos analizar tus hábitos. Intenta más tarde.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="card p-5 animate-pulse flex items-start gap-4 h-[120px]">
            <div className="w-10 h-10 rounded-full bg-muted/40 shrink-0" />
            <div className="w-full space-y-3">
              <div className="h-4 bg-muted/40 rounded w-1/3" />
              <div className="h-3 bg-muted/40 rounded w-1/2" />
              <div className="h-6 bg-muted/20 rounded-md w-1/4 mt-4" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4 mt-2">
        <div>
           <h2 className="text-sm font-bold flex items-center gap-2 text-foreground">
             <Sparkles size={16} className="text-primary" /> Sugerencias para ti
           </h2>
           <p className="text-xs text-muted-foreground mt-0.5">Basadas en tus últimos 3 meses</p>
        </div>
        <button 
          onClick={handleGenerate} 
          disabled={generateMut.isPending}
          className="btn-secondary text-xs px-3 h-8 text-muted-foreground hover:text-foreground"
        >
          <RefreshCcw size={12} className={generateMut.isPending ? 'animate-spin' : ''} /> 
          {generateMut.isPending ? 'Analizando...' : 'Actualizar'}
        </button>
      </div>

      {suggestions?.length === 0 ? (
        <div className="card p-10 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-income/10 text-income rounded-full flex items-center justify-center mb-3">
            <CheckCircle2 size={24} />
          </div>
          <h3 className="text-sm font-semibold text-foreground">¡Vas muy bien!</h3>
          <p className="text-xs text-muted-foreground max-w-[250px] mt-1 mx-auto">
            No hay sugerencias de mejora por ahora. Tus patrones financieros lucen sanos.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions?.map((sug) => {
            const isDismissing = dismissingId === sug.id
            const isClosing = dismissMut.isPending && dismissMut.variables === sug.id // animate out
            return (
              <div 
                key={sug.id} 
                className={`card p-5 border shadow-sm flex flex-col sm:flex-row gap-4 sm:items-start overflow-hidden relative transition-all duration-300 ${isClosing ? 'opacity-0 scale-95 h-0 p-0 m-0 border-transparent overflow-hidden' : 'opacity-100'}`}
              >
                <div className="flex shrink-0 w-12 h-12 rounded-xl bg-card border shadow-inner items-center justify-center">
                  {getIconForType(sug.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground mb-1">
                    {sug.title} {sug.category && <span className="text-muted-foreground font-normal">({sug.category.name})</span>}
                  </h3>
                  
                  <div className="text-xs text-muted-foreground space-y-0.5 mb-3 leading-relaxed">
                    {sug.currentSpend !== undefined && sug.currentSpend > 0 && (
                      <p>
                        Gastas {fmtOriginal(sug.currentSpend, sug.currency)}/mes
                        {(sug.suggestedSpend !== undefined && sug.suggestedSpend >= 0) && ` · Sugerido: ${fmtOriginal(sug.suggestedSpend, sug.currency)}/mes`}
                      </p>
                    )}
                    <p className="font-medium text-foreground">
                      Ahorrarías {fmtOriginal(sug.monthlySaving, sug.currency)}/mes · <span className="text-income">{fmtOriginal(sug.yearlySaving, sug.currency)}/año</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {getConfidenceBadge(sug.confidence)}
                  </div>
                </div>

                <div className="shrink-0 flex flex-col items-stretch sm:items-end justify-center sm:self-center gap-2 mt-4 sm:mt-0 ml-0 sm:ml-4">
                  {isDismissing ? (
                    <div className="flex bg-muted/30 p-2 rounded-xl border items-center gap-2 w-full animate-in fade-in slide-in-from-right-4 duration-200">
                      <span className="text-xs font-semibold px-2">¿No te interesa?</span>
                      <button 
                        className="btn-destructive text-[10px] h-7 px-3 flex-1 sm:flex-none"
                        onClick={() => handleDismiss(sug.id)}
                        disabled={dismissMut.isPending}
                      >
                        Sí, descartar
                      </button>
                      <button 
                        className="btn-secondary px-2 h-7"
                        onClick={() => setDismissingId(null)}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 w-full">
                      <button 
                        className="btn-secondary flex-1 sm:flex-none"
                        onClick={() => setDismissingId(sug.id)}
                      >
                        Descartar
                      </button>
                      <button 
                        className="btn-primary flex-1 sm:flex-none bg-foreground text-background"
                        onClick={() => handleOpenAccept(sug)}
                      >
                        Aceptar <ArrowRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Adjust and Accept Modal */}
      <Modal 
        isOpen={!!acceptingGoal} 
        onClose={() => setAcceptingGoal(null)} 
        title={`Meta: ${acceptingGoal?.category?.name ? 'Reducir ' + acceptingGoal.category.name : acceptingGoal?.title}`}
      >
        {acceptingGoal && (
          <form className="space-y-5" onSubmit={handleAcceptSubmit}>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Monto objetivo total ({acceptingGoal.currency})</label>
              <input 
                type="number" 
                step="0.01"
                className="input text-lg font-bold py-2 px-3 h-12"
                value={formAmount}
                onChange={e => setFormAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Plazo estimado (meses)</label>
              <select 
                className="input py-2 px-3 h-11 text-sm bg-background font-medium appearance-none"
                value={formMonths}
                onChange={e => setFormMonths(e.target.value)}
              >
                <option value="1">1 Mes</option>
                <option value="3">3 Meses</option>
                <option value="6">6 Meses</option>
                <option value="12">1 Año</option>
                <option value="24">2 Años</option>
              </select>
            </div>

            <div className="bg-muted/30 p-4 rounded-xl border border-border/50 text-center">
              <p className="text-xs text-muted-foreground mb-1">Deberías ahorrar estimado por mes:</p>
              <p className="font-bold text-lg text-primary">
                {fmtOriginal(Number(formAmount) / Number(formMonths), acceptingGoal.currency)}
                {acceptingGoal.currency !== baseCurrency && (
                  <span className="text-xs ml-2 text-muted-foreground font-medium block mt-1">
                    ≈ {fmt(calculateEquivalent(Number(formAmount) / Number(formMonths), acceptingGoal.currency), baseCurrency)}
                  </span>
                )}
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button type="button" className="btn-secondary py-2.5 flex-1" onClick={() => setAcceptingGoal(null)}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary py-2.5 flex-1 bg-foreground text-background bg-gradient-to-br from-foreground to-foreground/80" disabled={acceptMut.isPending}>
                {acceptMut.isPending ? 'Creando...' : 'Crear meta inteligente'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
