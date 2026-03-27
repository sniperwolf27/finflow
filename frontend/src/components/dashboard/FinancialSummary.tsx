import { TrendingUp, TrendingDown, Wallet, Info } from 'lucide-react'
import { Card, CardContent } from '../ui/card'
import { Badge } from '../ui/Badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import { Separator } from '../ui/separator'
import { DashboardSummary, MonthlyData } from '../../types/dashboard.types'
import { HealthScore } from './HealthScore'
import { cn } from '../../lib/utils'
import { fmtRound } from '../../lib/currency'

interface Props {
  data?: DashboardSummary
  isLoading: boolean
  currency?: string
  /** Previous month data — used to compute deltas */
  previousMonth?: MonthlyData
}

function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  type,
  tooltip,
  badge,
  isLoading,
  currency = 'USD',
}: {
  label: string
  value: number
  /** Difference vs previous period. undefined = no data. */
  delta?: number
  icon: React.ElementType
  type: 'income' | 'expense' | 'neutral'
  tooltip: string
  badge?: { text: string; variant: 'success' | 'destructive' | 'secondary' }
  isLoading: boolean
  currency?: string
}) {
  const valueClass =
    type === 'income'  ? 'text-income' :
    type === 'expense' ? 'text-expense' :
    'text-foreground'

  const iconBg =
    type === 'income'  ? 'bg-income-subtle' :
    type === 'expense' ? 'bg-expense-subtle' :
    'bg-secondary'

  const iconColor =
    type === 'income'  ? 'text-income' :
    type === 'expense' ? 'text-expense' :
    'text-muted-foreground'

  return (
    <Card className="flex-1">
      <CardContent className="p-5">
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-3 w-20 animate-shimmer rounded" />
            <div className="h-8 w-28 animate-shimmer rounded" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <span className="text-caption font-medium text-muted-foreground">{label}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info size={11} className="text-muted-foreground/50 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>{tooltip}</TooltipContent>
                </Tooltip>
              </div>
              {badge && <Badge variant={badge.variant}>{badge.text}</Badge>}
            </div>
            <div className="flex items-end gap-2">
              <p className={cn('text-title-2 font-bold tracking-tight', valueClass)}>
                {fmtRound(value, currency)}
              </p>
              <div className={cn('mb-0.5 p-1 rounded-lg', iconBg)}>
                <Icon size={14} className={iconColor} />
              </div>
            </div>
            {/* Delta vs previous period */}
            {delta !== undefined && delta !== 0 && (
              <div
                className={cn(
                  'flex items-center gap-1 mt-2',
                  delta >= 0
                    ? type === 'expense' ? 'text-expense' : 'text-income'
                    : type === 'expense' ? 'text-income' : 'text-expense',
                )}
              >
                {delta >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span className="text-caption font-medium">
                  {delta >= 0 ? '+' : ''}{fmtRound(delta, currency)}
                </span>
                <span className="text-caption text-muted-foreground">vs anterior</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function FinancialSummary({ data, isLoading, currency = 'USD', previousMonth }: Props) {
  const net = data?.net ?? 0
  const isPositive = net >= 0

  // Compute deltas from monthly data
  const incomeDelta = previousMonth ? (data?.income ?? 0) - previousMonth.income : undefined
  const expenseDelta = previousMonth ? (data?.expenses ?? 0) - previousMonth.expenses : undefined
  const netDelta = previousMonth ? net - previousMonth.net : undefined

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <StatCard
          label="Ingresos"
          value={data?.income ?? 0}
          delta={incomeDelta}
          icon={TrendingUp}
          type="income"
          tooltip="Total de dinero que recibiste en el período seleccionado"
          isLoading={isLoading}
          currency={currency}
        />

        <StatCard
          label="Gastos"
          value={data?.expenses ?? 0}
          delta={expenseDelta}
          icon={TrendingDown}
          type="expense"
          tooltip="Total de dinero que gastaste en el período seleccionado"
          isLoading={isLoading}
          currency={currency}
        />

        <Card className="flex-1">
          <CardContent className="p-5">
            {isLoading ? (
              <div className="space-y-3">
                <div className="h-3 w-20 animate-shimmer rounded" />
                <div className="h-8 w-28 animate-shimmer rounded" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-caption font-medium text-muted-foreground">Balance neto</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info size={11} className="text-muted-foreground/50 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>Ingresos menos gastos. Positivo = ahorrás. Negativo = gastás más de lo que ganás.</TooltipContent>
                    </Tooltip>
                  </div>
                  <Badge variant={isPositive ? 'success' : 'destructive'}>
                    {isPositive ? 'Superávit' : 'Déficit'}
                  </Badge>
                </div>
                <div className="flex items-end gap-2">
                  <p className={cn('text-title-2 font-bold tracking-tight', isPositive ? 'text-foreground' : 'text-expense')}>
                    {fmtRound(net, currency)}
                  </p>
                  <div className="mb-0.5 p-1 rounded-lg bg-secondary">
                    <Wallet size={14} className="text-muted-foreground" />
                  </div>
                </div>
                {/* Net delta */}
                {netDelta !== undefined && netDelta !== 0 && (
                  <div
                    className={cn(
                      'flex items-center gap-1 mt-2',
                      netDelta >= 0 ? 'text-income' : 'text-expense',
                    )}
                  >
                    {netDelta >= 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    <span className="text-caption font-medium">
                      {netDelta >= 0 ? '+' : ''}{fmtRound(netDelta, currency)}
                    </span>
                    <span className="text-caption text-muted-foreground">vs anterior</span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      <HealthScore summary={data} isLoading={isLoading} />
    </div>
  )
}
