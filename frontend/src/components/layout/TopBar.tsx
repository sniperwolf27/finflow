import { RefreshCw, LogOut } from 'lucide-react'
import { DarkModeToggle } from '../dashboard/DarkModeToggle'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi } from '../../api/auth.api'
import { gmailApi } from '../../api/gmail.api'
import { useAuthStore } from '../../store/auth.store'
import { Spinner } from '../ui/Spinner'
import { useToast } from '../../context/ToastContext'

export function TopBar() {
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const toast = useToast()

  const { data: gmailStatus } = useQuery({
    queryKey: ['gmail', 'status'],
    queryFn: gmailApi.status,
  })

  const syncMutation = useMutation({
    mutationFn: gmailApi.sync,
    onSuccess: () => {
      toast.success('Sincronización iniciada')
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ['transactions'] })
        qc.invalidateQueries({ queryKey: ['dashboard'] })
        qc.invalidateQueries({ queryKey: ['gmail'] })
      }, 3000)
    },
    onError: () => toast.error('Error al sincronizar'),
  })

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => (window.location.href = '/'),
  })

  return (
    <header className="h-14 bg-card/80 backdrop-blur-md border-b border-border flex items-center justify-between px-5 sticky top-0 z-10">
      {/* Left — sync */}
      <div className="flex items-center gap-3">
        {gmailStatus?.connected ? (
          <button
            className="btn-secondary text-xs py-1.5 px-3 h-8"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending
              ? <><Spinner className="h-3 w-3" /> Sincronizando...</>
              : <><RefreshCw size={12} /> Sincronizar</>
            }
          </button>
        ) : (
          <a href={authApi.googleLoginUrl} className="btn-secondary text-xs py-1.5 px-3 h-8">
            Conectar Gmail
          </a>
        )}
        {gmailStatus?.lastSyncAt && (
          <span className="text-xs text-muted-foreground/60 hidden sm:block">
            {new Date(gmailStatus.lastSyncAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Right — user */}
      <div className="flex items-center gap-2">
        <DarkModeToggle />

        <div className="flex items-center gap-2 pl-2 border-l border-border">
          {user?.avatarUrl && (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-7 h-7 rounded-full object-cover ring-1 ring-border"
            />
          )}
          <span className="text-sm text-foreground hidden sm:block font-medium leading-none">
            {user?.name?.split(' ')[0]}
          </span>
          <button
            className="btn-ghost p-1.5 text-muted-foreground hover:text-destructive"
            onClick={() => logoutMutation.mutate()}
            title="Cerrar sesión"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </header>
  )
}
