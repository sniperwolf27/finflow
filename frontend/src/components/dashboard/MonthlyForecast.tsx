import { getDaysInMonth, getDate } from 'date-fns'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '../../lib/utils'
import { fmtRound } from '../../lib/currency'

interface Summary {
  income: number
  expenses: number
  net: number
  currency: string
}

interface Props {
  summary: Summary | undefined
  isLoading: boolean
}

export function MonthlyForecast({ summary, isLoading }: Props) {
  const today = new Date()
  const dayOfMonth = getDate(today)
  const daysInMonth = getDaysInMonth(today)
  const daysRemaining = daysInMonth - dayOfMonth
  const progressPct = Math.round((dayOfMonth / daysInMonth) * 100)

  const currency = summary?.currency ?? 'USD'
  const spentSoFar = summary?.expenses ?? 0
  const income = summary?.income ?? 0

  // Project end-of-month spending based on daily average
  const dailyAvg = dayOfMonth > 0 ? spentSoFar / dayOfMonth : 0
  const projected = Math.round(dailyAvg * daysInMonth)
  const projectedRemaining = Math.max(0, projected - spentSoFar)

  // Savings rate at current pace
  const projectedNet = income - projected
  const savingsRate = income > 0 ? Math.round((projectedNet / income) * 100) : null

  const isNegative = projectedNet < 0
  const isFlat = income === 0 && spentSoFar === 0

  if (isLoading) {
    return (
      <div className="card p-5 animate-pulse">
        <div className="h-4 w-40 bg-muted rounded mb-4" />
        <div className="h-2 w-full bg-muted rounded-full mb-3" />
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <div key={i} className="h-10 bg-muted rounded" />)}
        </div>
      </div>
    )
  }

  if (isFlat) return null

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Pronóstico del mes</h3>
        <span className="text-xs text-muted-foreground">
          Día {dayOfMonth} de {daysInMonth}
        </span>
      </div>

      {/* Month progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span>{progressPct}% del mes transcurrido</span>
          <span>{daysRemaining} días restantes</span>
        </div>
        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary/40 rounded-full transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Gastado hasta ahora */}
        <div className="bg-secondary/60 rounded-xl p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Gastado hasta hoy</p>
          <p className="text-sm font-bold text-foreground">{fmtRound(spentSoFar, currency)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{fmtRound(dailyAvg, currency)}/día</p>
        </div>

        {/* Proyección */}
        <div className={cn(
          'rounded-xl p-3 text-center',
          isNegative ? 'bg-destructive/10' : 'bg-secondary/60'
        )}>
          <p className="text-xs text-muted-foreground mb-1">Proyección final</p>
          <p className={cn(
            'text-sm font-bold',
            isNegative ? 'text-destructive' : 'text-foreground'
          )}>
            {fmtRound(projected, currency)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            +{fmtRound(projectedRemaining, currency)} más
          </p>
        </div>

        {/* Tasa de ahorro proyectada */}
        <div className={cn(
          'rounded-xl p-3 text-center',
          savingsRate === null ? 'bg-secondary/60'
          : isNegative ? 'bg-destructive/10'
          : 'bg-income-subtle'
        )}>
          <p className="text-xs text-muted-foreground mb-1">Tasa de ahorro</p>
          <div className="flex items-center justify-center gap-1">
            {savingsRate === null ? (
              <Minus size={12} className="text-muted-foreground" />
            ) : isNegative ? (
              <TrendingDown size={12} className="text-destructive" />
            ) : (
              <TrendingUp size={12} className="text-income" />
            )}
            <p className={cn(
              'text-sm font-bold',
              savingsRate === null ? 'text-muted-foreground'
              : isNegative ? 'text-destructive'
              : 'text-income'
            )}>
              {savingsRate !== null ? `${savingsRate}%` : '—'}
            </p>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isNegative ? 'por encima del ingreso' : 'del ingreso ahorrado'}
          </p>
        </div>
      </div>

      {/* Alert message */}
      {isNegative && income > 0 && (
        <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-destructive/8 border border-destructive/20">
          <TrendingDown size={14} className="text-destructive shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">
            A este ritmo, tus gastos superarán tus ingresos por <strong>{fmtRound(Math.abs(projectedNet), currency)}</strong> este mes.
          </p>
        </div>
      )}
    </div>
  )
}
