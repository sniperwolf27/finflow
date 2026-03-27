import * as React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  TooltipProps,
} from 'recharts'
import { TrendingUp, TrendingDown, Calendar, ArrowRight, Minus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Spinner } from '../ui/Spinner'
import { DailyData } from '../../types/dashboard.types'
import { Transaction } from '../../types/transaction.types'
import { fmt, fmtRound } from '../../lib/currency'
import { useTransactions } from '../../hooks/useTransactions'

/* ─── Types ──────────────────────────────────────────────────────────── */

interface Props {
  data?: DailyData[]
  isLoading: boolean
  currency?: string
  /** YYYY-MM — used for labels and transaction fetch */
  month: string
}

/* ─── BI insights ────────────────────────────────────────────────────── */

interface DailyInsight {
  kind: 'danger' | 'warning' | 'success' | 'neutral'
  text: string
  metric: string | null
}

function computeDailyInsight(data: DailyData[], currency: string): DailyInsight {
  const active = data.filter((d) => d.expenses > 0 || d.income > 0)
  if (!active.length) {
    return { kind: 'neutral', text: 'Sin transacciones este mes todavía.', metric: null }
  }

  const peakExpense = data.reduce((max, d) => (d.expenses > max.expenses ? d : max), data[0])
  const totalExpenses = data.reduce((s, d) => s + d.expenses, 0)
  const activeDays = data.filter((d) => d.expenses > 0).length
  const dailyAvg = activeDays > 0 ? totalExpenses / activeDays : 0

  // Is peak day anomalous? (>2.5x the daily average)
  if (dailyAvg > 0 && peakExpense.expenses > dailyAvg * 2.5) {
    return {
      kind: 'warning',
      text: `Tu mayor gasto fue el día ${peakExpense.day} (${fmtRound(peakExpense.expenses, currency)}), ${Math.round(peakExpense.expenses / dailyAvg)}x tu promedio diario.`,
      metric: `Día ${peakExpense.day}`,
    }
  }

  // Monthly net positive?
  const totalNet = data.reduce((s, d) => s + d.net, 0)
  if (totalNet > 0) {
    return {
      kind: 'success',
      text: `Promedio diario de gasto: ${fmtRound(dailyAvg, currency)}. Vas bien este mes.`,
      metric: fmtRound(dailyAvg, currency),
    }
  }

  return {
    kind: 'warning',
    text: `Promedio diario de gasto: ${fmtRound(dailyAvg, currency)}. Revisá los días de mayor gasto.`,
    metric: fmtRound(dailyAvg, currency),
  }
}

/* ─── Custom tooltip ─────────────────────────────────────────────────── */

function CustomTooltip({
  active,
  payload,
  label,
  currency,
}: TooltipProps<number, string> & { currency: string }) {
  if (!active || !payload?.length) return null

  const income   = payload.find((p) => p.dataKey === 'income')?.value ?? 0
  const expenses = payload.find((p) => p.dataKey === 'expenses')?.value ?? 0
  const net      = income - expenses

  if (income === 0 && expenses === 0) return null

  return (
    <div className="bg-card border border-border rounded-xl shadow-xl px-4 py-3 text-xs min-w-[180px]">
      <p className="font-semibold text-foreground mb-2">Día {label}</p>
      <div className="space-y-1.5">
        {income > 0 && (
          <div className="flex items-center justify-between gap-5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[hsl(var(--income))]" />
              <span className="text-muted-foreground">Ingresos</span>
            </div>
            <span className="font-semibold text-income tabular-nums">{fmt(income, currency)}</span>
          </div>
        )}
        {expenses > 0 && (
          <div className="flex items-center justify-between gap-5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[hsl(var(--expense))]" />
              <span className="text-muted-foreground">Gastos</span>
            </div>
            <span className="font-semibold text-expense tabular-nums">{fmt(expenses, currency)}</span>
          </div>
        )}
        {income > 0 && expenses > 0 && (
          <>
            <div className="border-t border-border my-1" />
            <div className="flex items-center justify-between gap-5">
              <span className="text-muted-foreground">Balance</span>
              <span className={`font-bold tabular-nums ${net >= 0 ? 'text-income' : 'text-expense'}`}>
                {fmt(net, currency)}
              </span>
            </div>
          </>
        )}
      </div>
      <p className="text-muted-foreground/50 mt-2 text-[10px]">Toca para ver transacciones</p>
    </div>
  )
}

/* ─── Day detail panel ───────────────────────────────────────────────── */

function TransactionRow({ tx, currency }: { tx: Transaction; currency: string }) {
  const isExpense = tx.type === 'EXPENSE'
  return (
    <div className="flex items-center gap-3 py-2.5">
      {/* Category dot */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
        style={{
          backgroundColor: tx.category?.color ? `${tx.category.color}20` : 'hsl(var(--secondary))',
          color: tx.category?.color ?? 'hsl(var(--muted-foreground))',
        }}
      >
        {(tx.merchant ?? tx.description).charAt(0).toUpperCase()}
      </div>
      {/* Description */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">
          {tx.merchant ?? tx.description}
        </p>
        {tx.category && (
          <p className="text-[10px] text-muted-foreground mt-0.5">{tx.category.name}</p>
        )}
      </div>
      {/* Amount */}
      <span className={`text-xs font-bold tabular-nums shrink-0 ${isExpense ? 'text-expense' : 'text-income'}`}>
        {isExpense ? '-' : '+'}{fmt(tx.amount, currency)}
      </span>
    </div>
  )
}

function DayDetailPanel({
  day,
  dayData,
  currency,
  onClose,
}: {
  day: number
  dayData: DailyData
  currency: string
  onClose: () => void
}) {
  // CRÍTICO: usamos dateFromUtc/dateToUtc del backend — son exactamente
  // los mismos límites que usó getDailyEvolution para calcular el total.
  // Esto garantiza que la lista sume igual que el gráfico.
  const { data, isLoading } = useTransactions({
    dateFrom: dayData.dateFromUtc,
    dateTo:   dayData.dateToUtc,
    limit: 50,
  })

  const monthName = new Date(dayData.date + 'T12:00:00').toLocaleDateString('es-DO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="border-t border-border mt-4 pt-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
      {/* Panel header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <Calendar size={13} className="text-muted-foreground" />
            <p className="text-xs font-semibold text-foreground capitalize">{monthName}</p>
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            {dayData.income > 0 && (
              <span className="text-xs text-income font-medium">
                +{fmt(dayData.income, currency)}
              </span>
            )}
            {dayData.expenses > 0 && (
              <span className="text-xs text-expense font-medium">
                -{fmt(dayData.expenses, currency)}
              </span>
            )}
            {dayData.income > 0 && dayData.expenses > 0 && (
              <span className={`text-xs font-bold ${dayData.net >= 0 ? 'text-foreground' : 'text-expense'}`}>
                = {fmt(dayData.net, currency)}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-accent"
        >
          Cerrar
        </button>
      </div>

      {/* Transaction list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Spinner className="h-5 w-5" />
        </div>
      ) : !data?.items.length ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          Sin transacciones este día.
        </p>
      ) : (
        <div className="divide-y divide-border">
          {data.items.map((tx) => (
            <TransactionRow key={tx.id} tx={tx} currency={currency} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Insight banner ─────────────────────────────────────────────────── */

const insightStyles = {
  danger:  { wrap: 'bg-expense-subtle border-[hsl(var(--expense)/0.25)]',              icon: 'text-expense',  text: 'text-expense' },
  warning: { wrap: 'bg-[hsl(var(--warning)/0.10)] border-[hsl(var(--warning)/0.25)]', icon: 'text-warning',  text: 'text-warning' },
  success: { wrap: 'bg-income-subtle border-[hsl(var(--income)/0.25)]',               icon: 'text-income',   text: 'text-income' },
  neutral: { wrap: 'bg-secondary border-border',                                      icon: 'text-muted-foreground', text: 'text-muted-foreground' },
} as const

function InsightBanner({ insight }: { insight: DailyInsight }) {
  const s = insightStyles[insight.kind]
  const Icon = insight.kind === 'success' ? TrendingDown : insight.kind === 'neutral' ? Minus : TrendingUp
  return (
    <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-medium ${s.wrap}`}>
      <Icon size={13} className={`shrink-0 ${s.icon}`} />
      <span className={s.text}>{insight.text}</span>
      {insight.metric && (
        <span className={`ml-auto font-bold tabular-nums shrink-0 ${s.icon}`}>{insight.metric}</span>
      )}
    </div>
  )
}

/* ─── Mini stats footer ──────────────────────────────────────────────── */

function MiniStat({ label, value, sub, valueClass }: { label: string; value: string; sub: string; valueClass?: string }) {
  return (
    <div className="text-center flex-1 min-w-0">
      <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`text-sm font-bold tabular-nums truncate ${valueClass ?? 'text-foreground'}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground/50 capitalize mt-0.5">{sub}</p>
    </div>
  )
}

/* ─── Main component ─────────────────────────────────────────────────── */

export function DailyBarChart({ data, isLoading, currency = 'DOP', month }: Props) {
  const [selectedDay, setSelectedDay] = React.useState<number | null>(null)

  // Reset selection when month changes
  React.useEffect(() => { setSelectedDay(null) }, [month])

  const insight = React.useMemo(() => {
    if (!data?.length) return null
    return computeDailyInsight(data, currency)
  }, [data, currency])

  /* Mini-stats */
  const stats = React.useMemo(() => {
    if (!data?.length) return null
    const activeDays    = data.filter((d) => d.expenses > 0)
    const peakExpense   = activeDays.length ? activeDays.reduce((m, d) => d.expenses > m.expenses ? d : m, activeDays[0]) : null
    const totalExpenses = data.reduce((s, d) => s + d.expenses, 0)
    const totalIncome   = data.reduce((s, d) => s + d.income, 0)
    const dailyAvg      = activeDays.length ? totalExpenses / activeDays.length : 0
    return { peakExpense, totalExpenses, totalIncome, dailyAvg, activeDays: activeDays.length }
  }, [data])

  /* Y-axis domain with padding */
  const yDomain = React.useMemo<[number, number]>(() => {
    if (!data?.length) return [0, 1000]
    const max = Math.max(...data.map((d) => Math.max(d.income, d.expenses)))
    return [0, Math.ceil((max * 1.15) / 1000) * 1000 || 1000]
  }, [data])

  const selectedData = React.useMemo(() => {
    if (selectedDay === null || !data) return null
    return data.find((d) => d.day === selectedDay) ?? null
  }, [selectedDay, data])

  const monthLabel = React.useMemo(() => {
    return new Date(month + '-01T12:00:00').toLocaleDateString('es-DO', { month: 'long', year: 'numeric' })
  }, [month])

  /* ── Render ── */

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-5 animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded-xl" />
          <div className="flex items-end justify-between gap-2">
            <div className="h-4 w-40 bg-muted rounded" />
          </div>
          <div className="h-[240px] bg-muted/50 rounded-xl" />
        </CardContent>
      </Card>
    )
  }

  const hasData = data?.some((d) => d.income > 0 || d.expenses > 0)

  if (!hasData) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="h-[300px] flex flex-col items-center justify-center gap-3 text-center">
            <span className="text-4xl">📅</span>
            <p className="text-sm font-medium text-foreground">Sin movimientos en {monthLabel}</p>
            <p className="text-xs text-muted-foreground/60 max-w-[220px]">
              Las transacciones aparecerán aquí cuando sincronices tu correo.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      {/* ── Header ── */}
      <CardHeader className="px-5 pt-5 pb-4 space-y-3">
        {insight && <InsightBanner insight={insight} />}

        <div>
          <CardTitle className="text-sm font-semibold text-foreground capitalize">
            {monthLabel}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ingresos y gastos por día · {currency}
          </p>
        </div>
      </CardHeader>

      {/* ── Bar chart ── */}
      <CardContent className="px-2 pb-2 sm:px-4">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={data}
            margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            barCategoryGap="25%"
            barGap={2}
            onClick={(payload) => {
              if (!payload?.activePayload?.length) return
              const day = payload.activePayload[0]?.payload?.day as number | undefined
              if (!day) return
              setSelectedDay((prev) => (prev === day ? null : day))
            }}
          >
            <CartesianGrid
              strokeDasharray="0"
              stroke="hsl(var(--border))"
              strokeOpacity={0.4}
              vertical={false}
            />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval={data && data.length > 20 ? 4 : 2}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', opacity: 0.7 }}
            />
            <YAxis
              domain={yDomain}
              tickFormatter={(v) => fmtRound(v, currency)}
              tickLine={false}
              axisLine={false}
              tickMargin={4}
              tickCount={4}
              width={100}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', opacity: 0.7 }}
            />
            <Tooltip
              content={<CustomTooltip currency={currency} />}
              cursor={{ fill: 'hsl(var(--accent))', opacity: 0.5, radius: 4 }}
            />

            {/* Ingresos — verde */}
            <Bar dataKey="income" name="Ingresos" radius={[3, 3, 0, 0]} maxBarSize={14}>
              {data?.map((entry) => (
                <Cell
                  key={`income-${entry.day}`}
                  fill="hsl(var(--income))"
                  fillOpacity={
                    selectedDay === null || selectedDay === entry.day ? 0.85 : 0.3
                  }
                />
              ))}
            </Bar>

            {/* Gastos — rojo */}
            <Bar dataKey="expenses" name="Gastos" radius={[3, 3, 0, 0]} maxBarSize={14}>
              {data?.map((entry) => (
                <Cell
                  key={`expense-${entry.day}`}
                  fill="hsl(var(--expense))"
                  fillOpacity={
                    selectedDay === null || selectedDay === entry.day ? 0.85 : 0.3
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex items-center justify-center gap-5 mt-1 mb-4">
          {[
            { color: 'bg-[hsl(var(--income))]',  label: 'Ingresos' },
            { color: 'bg-[hsl(var(--expense))]', label: 'Gastos' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={`w-3 h-2 rounded-sm shrink-0 ${color}`} />
              <span className="text-[11px] text-muted-foreground">{label}</span>
            </div>
          ))}
          <span className="text-[11px] text-muted-foreground/50 ml-1">· Toca un día para ver detalle</span>
        </div>

        {/* Mini stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-1 border-t border-border pt-4 mb-2">
            <MiniStat
              label="Mayor gasto"
              value={stats.peakExpense ? fmtRound(stats.peakExpense.expenses, currency) : '—'}
              sub={stats.peakExpense ? `día ${stats.peakExpense.day}` : '—'}
              valueClass="text-expense"
            />
            <div className="relative border-x border-border">
              <MiniStat
                label="Promedio diario"
                value={fmtRound(stats.dailyAvg, currency)}
                sub={`${stats.activeDays} días activos`}
                valueClass="text-foreground"
              />
            </div>
            <MiniStat
              label="Total del mes"
              value={fmtRound(stats.totalExpenses, currency)}
              sub="en gastos"
              valueClass="text-expense"
            />
          </div>
        )}

        {/* Day detail panel — shown when a day is selected */}
        {selectedDay !== null && selectedData && (
          <DayDetailPanel
            day={selectedDay}
            dayData={selectedData}
            currency={currency}
            onClose={() => setSelectedDay(null)}
          />
        )}
      </CardContent>
    </Card>
  )
}
