import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Mail, RefreshCw, Unlink, History, CheckCircle, XCircle, Clock } from 'lucide-react'
import { gmailApi } from '../api/gmail.api'
import { authApi } from '../api/auth.api'
import { useAuthStore } from '../store/auth.store'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle; color: string }> = {
  COMPLETED: { label: 'Completado', icon: CheckCircle, color: 'text-income' },
  FAILED:    { label: 'Error',      icon: XCircle,     color: 'text-destructive' },
  RUNNING:   { label: 'En curso',   icon: Clock,       color: 'text-warning' },
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
