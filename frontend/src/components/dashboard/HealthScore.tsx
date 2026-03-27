import { ShieldCheck, ShieldAlert, ShieldX, Info } from 'lucide-react'
import { Card, CardContent } from '../ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import { computeHealthScore, HealthLevel } from '../../lib/insights'
import { DashboardSummary } from '../../types/dashboard.types'
import { cn } from '../../lib/utils'

interface Props {
  summary?: DashboardSummary
  isLoading: boolean
}

const levelConfig: Record<HealthLevel, {
  icon: typeof ShieldCheck
  color: string
  bg: string
  bar: string
  border: string
}> = {
  Buena: {
    icon: ShieldCheck,
    color: 'text-income',
    bg: 'bg-income-subtle',
    bar: 'bg-[hsl(var(--income))]',
    border: 'border-[hsl(var(--income)/0.3)]',
  },
  Regular: {
    icon: ShieldAlert,
    color: 'text-warning',
    bg: 'bg-[hsl(var(--warning)/0.12)]',
    bar: 'bg-[hsl(var(--warning))]',
    border: 'border-[hsl(var(--warning)/0.3)]',
  },
  Crítica: {
    icon: ShieldX,
    color: 'text-expense',
    bg: 'bg-expense-subtle',
    bar: 'bg-[hsl(var(--expense))]',
    border: 'border-[hsl(var(--expense)/0.3)]',
  },
}

export function HealthScore({ summary, isLoading }: Props) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="h-3 w-24 animate-shimmer rounded" />
          <div className="h-6 w-20 animate-shimmer rounded" />
          <div className="h-2 w-full animate-shimmer rounded-full" />
        </CardContent>
      </Card>
    )
  }

  const health = computeHealthScore(summary)
  const config = levelConfig[health.level]
  const Icon = config.icon
  const spendPct = Math.round(health.spendRatio * 100)

  return (
    <Card className={cn('border', config.border)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Salud financiera</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info size={11} className="text-muted-foreground/50 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-52">
                Se calcula comparando tus gastos con tus ingresos. Menos del 70% es saludable.
              </TooltipContent>
            </Tooltip>
          </div>
          <div className={cn('p-1.5 rounded-lg', config.bg)}>
            <Icon size={14} className={config.color} />
          </div>
        </div>

        <p className={cn('text-xl font-bold mb-1', config.color)}>{health.level}</p>
        <p className="text-xs text-muted-foreground mb-3 leading-snug">{health.description}</p>

        <div className="space-y-1">
          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-700', config.bar)}
              style={{ width: `${health.scorePercent}%` }}
            />
          </div>
          {summary && summary.income > 0 ? (
            <p className="text-xs text-muted-foreground">
              Gastás el{' '}
              <span className={cn('font-semibold',
                spendPct > 90 ? 'text-expense' : spendPct > 70 ? 'text-warning' : 'text-income'
              )}>
                {spendPct}%
              </span>{' '}
              de tus ingresos
            </p>
          ) : (
            <p className="text-xs text-muted-foreground italic">Sin ingresos registrados</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
