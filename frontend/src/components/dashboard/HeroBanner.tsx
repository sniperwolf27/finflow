import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '../../lib/utils'

interface HeroBannerProps {
  userName?: string
  netBalance: number
  /** Difference vs previous month. 0 = no data available. */
  balanceDelta: number
  /** Savings rate as percentage 0–100 */
  savingsRate: number | null
  /** Savings rate change in percentage points vs previous month */
  savingsRateDelta: number
  formatAmount: (n: number) => string
  isLoading: boolean
  currency?: string
}

export function HeroBanner({
  userName,
  netBalance,
  balanceDelta,
  savingsRate,
  savingsRateDelta,
  formatAmount,
  isLoading,
  currency,
}: HeroBannerProps) {
  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'
  const firstName = userName?.split(' ')[0] ?? ''

  const deltaPositive = balanceDelta >= 0
  const TrendIcon = balanceDelta === 0 ? Minus : deltaPositive ? TrendingUp : TrendingDown
  const hasDelta = balanceDelta !== 0

  if (isLoading) {
    return (
      <div className="pb-2">
        <div className="h-4 w-40 animate-shimmer rounded mb-3" />
        <div className="h-10 w-52 animate-shimmer rounded mb-3" />
        <div className="h-6 w-48 animate-shimmer rounded-full mb-5" />
        <div className="h-20 w-full animate-shimmer rounded-xl" />
      </div>
    )
  }

  return (
    <div className="pb-2">
      {/* Greeting */}
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-subhead text-muted-foreground">
          {greeting}{firstName ? `, ${firstName}` : ''}
        </p>
        {currency && <span className="text-caption text-muted-foreground/60">Montos en {currency}</span>}
      </div>

      {/* Hero number — largest text on the page */}
      <p className="text-display font-bold text-foreground tracking-tight leading-none mb-2">
        {formatAmount(netBalance)}
      </p>

      {/* Delta badge */}
      {hasDelta && (
        <div
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-footnote font-medium',
            deltaPositive ? 'bg-income-subtle text-income' : 'bg-expense-subtle text-expense',
          )}
        >
          <TrendIcon className="w-3 h-3" />
          <span>
            {deltaPositive ? '+' : ''}{formatAmount(balanceDelta)} vs mes anterior
          </span>
        </div>
      )}

      {/* Savings rate strip */}
      {savingsRate !== null && (
        <div className="mt-4 flex items-center justify-between p-3.5 bg-accent/40 rounded-xl">
          <div>
            <p className="text-caption text-muted-foreground mb-0.5">Tasa de ahorro</p>
            <p
              className={cn(
                'text-title-3 font-semibold',
                savingsRate >= 20 ? 'text-income' : savingsRate >= 10 ? 'text-warning' : 'text-expense',
              )}
            >
              {savingsRate.toFixed(0)}%
            </p>
          </div>
          {savingsRateDelta !== 0 && (
            <div className="text-right">
              <p className="text-caption text-muted-foreground mb-0.5">vs mes anterior</p>
              <p
                className={cn(
                  'text-subhead font-medium',
                  savingsRateDelta >= 0 ? 'text-income' : 'text-expense',
                )}
              >
                {savingsRateDelta >= 0 ? '+' : ''}{savingsRateDelta.toFixed(1)}pp
              </p>
            </div>
          )}
          {/* Mini arc visual */}
          <SavingsArc rate={savingsRate} />
        </div>
      )}
    </div>
  )
}

/* ── Mini arc SVG — visual savings progress ──────────────────── */

function SavingsArc({ rate }: { rate: number }) {
  const clamped = Math.min(Math.max(rate, 0), 100)
  const radius = 22
  const circumference = Math.PI * radius // semicircle
  const offset = circumference - (clamped / 100) * circumference
  const color =
    clamped >= 20 ? 'hsl(var(--income))' : clamped >= 10 ? 'hsl(var(--warning))' : 'hsl(var(--expense))'

  return (
    <svg width="52" height="30" viewBox="0 0 52 30" fill="none" aria-hidden="true">
      {/* Track */}
      <path
        d="M 4 28 A 22 22 0 0 1 48 28"
        stroke="hsl(var(--border))"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      {/* Fill */}
      <path
        d="M 4 28 A 22 22 0 0 1 48 28"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${circumference}`}
        strokeDashoffset={`${offset}`}
        fill="none"
        style={{ transition: 'stroke-dashoffset 600ms ease, stroke 300ms ease' }}
      />
    </svg>
  )
}
