import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Mail, RefreshCw, Unlink, History, CheckCircle, XCircle, Clock } from 'lucide-react'
import { gmailApi } from '../api/gmail.api'
import { authApi } from '../api/auth.api'
import { useAuthStore } from '../store/auth.store'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useState } from 'react'
import { useSettings, useUpdateCurrency, useSyncRates, useSetManualRate } from '../hooks/useSettings'
import { useToast } from '../hooks/useToast'
import { HistoricalCurrencyCorrection } from '../components/settings/HistoricalCurrencyCorrection'

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle; color: string }> = {
  COMPLETED: { label: 'Completado', icon: CheckCircle, color: 'text-income' },
  FAILED:    { label: 'Error',      icon: XCircle,     color: 'text-destructive' },
  RUNNING:   { label: 'En curso',   icon: Clock,       color: 'text-warning' },
}

function CurrencySettingsSection() {
  const { data, isLoading } = useSettings()
  const updateCurrency = useUpdateCurrency()
  const syncRates = useSyncRates()
  const setManualRate = useSetManualRate()
  const { toast } = useToast()

  const [manualFrom, setManualFrom] = useState('')
  const [manualTo, setManualTo] = useState('')
  const [manualRate, setManualRateValue] = useState('')
  const [showManual, setShowManual] = useState(false)

  if (isLoading) {
    return (
      <div className="card p-5 space-y-4">
         <div className="h-5 w-32 bg-muted/40 animate-shimmer rounded" />
         <div className="h-10 w-full bg-muted/40 animate-shimmer rounded" />
      </div>
    )
  }

  const settings = data?.settings
  const rates = data?.rates || []

  const handleCurrencyChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    try {
      await updateCurrency.mutateAsync(e.target.value)
      toast(`Nueva moneda base: ${e.target.value}`)
    } catch (err: any) {
       toast(`Error: ${err.message}`)
    }
  }

  const handleSync = async () => {
    try {
       await syncRates.mutateAsync()
       toast('Sincronizando tasas...')
    } catch (err: any) {
       toast(`Error: ${err.message}`)
    }
  }

  const handleManualSave = async () => {
    try {
       await setManualRate.mutateAsync({ from: manualFrom, to: manualTo, rate: parseFloat(manualRate) })
       toast('Tasa manual registrada con éxito')
       setManualFrom('')
       setManualTo('')
       setManualRateValue('')
       setShowManual(false)
    } catch (err: any) {
       toast(`Error: ${err.message}`)
    }
  }

  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">Moneda y Tasas de Cambio</h2>
      
      <div className="space-y-5">
        <div>
          <label className="text-xs font-medium text-foreground mb-1.5 block">Moneda Base Principal</label>
          <select 
            value={settings?.baseCurrency || 'DOP'} 
            onChange={handleCurrencyChange}
            disabled={updateCurrency.isPending}
            className="w-full h-[42px] px-3.5 bg-background border border-border rounded-xl text-subhead focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium appearance-none shadow-sm"
          >
            <option value="DOP">🇩🇴 DOP - Peso Dominicano</option>
            <option value="USD">🇺🇸 USD - Dólar Estadounidense</option>
            <option value="EUR">🇪🇺 EUR - Euro</option>
            <option value="GBP">🇬🇧 GBP - Libra Esterlina</option>
            <option value="CAD">🇨🇦 CAD - Dólar Canadiense</option>
          </select>
        </div>

        <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
          <div className="flex items-center justify-between mb-3">
             <h3 className="text-xs font-semibold text-foreground">Tasas contra {settings?.baseCurrency}</h3>
             <button 
               onClick={handleSync} 
               disabled={syncRates.isPending}
               className="btn-secondary text-xs h-8 px-3 shadow-sm bg-background/50 hover:bg-background"
             >
                <RefreshCw size={12} className={syncRates.isPending ? 'animate-spin' : ''} />
                {syncRates.isPending ? 'Sincronizando...' : 'Sincronizar'}
             </button>
          </div>
          
          {rates.length > 0 ? (
            <div className="space-y-2">
              {rates.map((rate) => (
                <div key={rate.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border/30 last:border-0 last:pb-0">
                  <span className="font-medium text-foreground">1 {rate.from} = {rate.rate.toFixed(2)} {rate.to}</span>
                  <div className="flex items-center gap-2">
                    {rate.isStale && (
                      <span className="badge bg-warning/10 text-warning text-[10px] px-1.5 py-0 border-none font-semibold">Desactualizada</span>
                    )}
                    <span className="text-xs text-muted-foreground font-medium">{format(new Date(rate.date), "d MMM", { locale: es })}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic text-center py-2">No hay tasas sincronizadas aún.</p>
          )}
        </div>

        <div className="border border-border/60 rounded-xl overflow-hidden shadow-sm">
          <button 
             onClick={() => setShowManual(!showManual)}
             className="w-full flex items-center justify-between p-3.5 bg-card hover:bg-muted/10 transition-colors text-xs font-semibold text-foreground border-b border-transparent"
          >
             Ingresar Tasa Manual (Override)
             <span className="text-muted-foreground text-[10px] opacity-70">{showManual ? '▲' : '▼'}</span>
          </button>
          
          {showManual && (
            <div className="p-4 bg-muted/5 space-y-4 border-t border-border/50">
               <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Origen</label>
                    <input 
                      type="text" 
                      placeholder="Ej. USD" 
                      value={manualFrom} 
                      onChange={e => setManualFrom(e.target.value.toUpperCase())}
                      className="w-full h-10 px-3 bg-background border border-border shadow-sm rounded-lg text-sm uppercase"
                      maxLength={3}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Destino</label>
                    <input 
                      type="text" 
                      placeholder="Ej. DOP" 
                      value={manualTo} 
                      onChange={e => setManualTo(e.target.value.toUpperCase())}
                      className="w-full h-10 px-3 bg-background border border-border shadow-sm rounded-lg text-sm uppercase"
                      maxLength={3}
                    />
                  </div>
               </div>
               <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Tasa de Cambio Exácta</label>
                  <input 
                    type="number" 
                    placeholder="Ej. 58.50" 
                    value={manualRate} 
                    onChange={e => setManualRateValue(e.target.value)}
                    className="w-full h-10 px-3 bg-background border border-border shadow-sm rounded-lg text-sm"
                    step="0.01"
                  />
               </div>
               <button 
                 onClick={handleManualSave}
                 disabled={setManualRate.isPending || !manualFrom || !manualTo || !manualRate}
                 className="btn-primary w-full h-[40px] text-xs font-semibold mt-2"
               >
                 {setManualRate.isPending ? 'Guardando...' : 'Aplicar Tasa Manual'}
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()

  const { data: gmailStatus } = useQuery({
    queryKey: ['gmail', 'status'],
    queryFn: gmailApi.status,
  })

  const { data: syncHistory } = useQuery({
    queryKey: ['gmail', 'history'],
    queryFn: gmailApi.history,
  })

  const syncMutation = useMutation({
    mutationFn: gmailApi.sync,
    onSuccess: () => setTimeout(() => qc.invalidateQueries({ queryKey: ['gmail'] }), 2000),
  })

  const disconnectMutation = useMutation({
    mutationFn: gmailApi.disconnect,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gmail', 'status'] }),
  })

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-foreground">Ajustes</h1>
        <p className="text-sm text-muted-foreground">Administrá tu cuenta e integraciones</p>
      </div>

      {/* Profile */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">Perfil</h2>
        <div className="flex items-center gap-4">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-12 h-12 rounded-full ring-2 ring-border"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg font-bold text-primary">
                {user?.name?.charAt(0) ?? '?'}
              </span>
            </div>
          )}
          <div>
            <p className="font-semibold text-foreground">{user?.name}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Currency & Exchange Rates */}
      <CurrencySettingsSection />

      {/* Gmail integration */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">Integración con Gmail</h2>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-expense-subtle flex items-center justify-center flex-shrink-0">
            <Mail size={18} className="text-expense" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-foreground">Gmail</p>
              {gmailStatus?.connected ? (
                <span className="badge bg-income-subtle text-income">
                  Conectado
                </span>
              ) : (
                <span className="badge bg-muted text-muted-foreground">
                  No conectado
                </span>
              )}
            </div>
            {gmailStatus?.lastSyncAt && (
              <p className="text-xs text-muted-foreground mb-3">
                Última sincronización: {format(new Date(gmailStatus.lastSyncAt), "d 'de' MMMM, HH:mm", { locale: es })}
              </p>
            )}
            <div className="flex gap-2">
              {gmailStatus?.connected ? (
                <>
                  <button
                    className="btn-secondary text-xs"
                    onClick={() => syncMutation.mutate()}
                    disabled={syncMutation.isPending}
                  >
                    <RefreshCw size={12} className={syncMutation.isPending ? 'animate-spin' : ''} />
                    {syncMutation.isPending ? 'Sincronizando...' : 'Sincronizar ahora'}
                  </button>
                  <button
                    className="btn-secondary text-xs text-destructive hover:bg-destructive/10"
                    onClick={() => confirm('¿Desconectar Gmail? Las transacciones existentes se conservan.') && disconnectMutation.mutate()}
                  >
                    <Unlink size={12} /> Desconectar
                  </button>
                </>
              ) : (
                <a href={authApi.googleLoginUrl} className="btn-primary text-xs">
                  Conectar Gmail
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sync History */}
      {syncHistory && syncHistory.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <History size={14} className="text-muted-foreground" /> Historial de sincronizaciones
          </h2>
          <div className="space-y-1">
            {syncHistory.slice(0, 10).map((log) => {
              const cfg = STATUS_CONFIG[log.status] ?? { label: log.status, icon: Clock, color: 'text-muted-foreground' }
              const Icon = cfg.icon
              return (
                <div
                  key={log.id}
                  className="flex items-center justify-between text-xs py-2.5 border-b border-border/50 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <Icon size={13} className={cfg.color} />
                    <span className={`font-medium ${cfg.color}`}>{cfg.label}</span>
                    <span className="text-muted-foreground">
                      {format(new Date(log.startedAt), "d MMM HH:mm", { locale: es })}
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    {log.emailsScanned} escaneados · {log.txCreated} nuevos · {log.txDuplicated} duplicados
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
