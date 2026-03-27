import * as React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  TooltipProps,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Spinner } from '../ui/Spinner'
import { MonthlyData } from '../../types/dashboard.types'
import { fmt, fmtRound } from '../../lib/currency'

/* ─── Types ──────────────────────────────────────────────────────────── */

interface Props {
  data?: MonthlyData[]
  isLoading: boolean
  currency?: string
}

type Range = '3M' | '6M' | '12M'
const RANGE_MONTHS: Record<Range, number> = { '3M': 3, '6M': 6, '12M': 12 }

interface ChartPoint extends MonthlyData {
  /** formatted label for X-axis tick */
  label: string
}

/* ─── Insight logic ──────────────────────────────────────────────────── */

type InsightKind = 'danger' | 'warning' | 'success' | 'neutral'

interface ChartInsight {
  kind: InsightKind
  icon: typeof TrendingUp
  text: string
  metric: string | null
}

function computeInsight(data: MonthlyData[], currency: string): ChartInsight {
  if (data.length < 2) {
    return { kind: 'neutral', icon: Minus, text: 'Agrega más meses para ver tendencias.', metric: null }
  }

  const last = data[data.length - 1]
  const prev = data[data.length - 2]

  // Priority 1 — este mes gastó más de lo que ganó
  if (last.net < 0) {
    const diff = Math.abs(last.net)
    return {
      kind: 'danger',
      icon: AlertCircle,
      text: `Este mes gastaste ${fmtRound(diff, currency)} más de lo que ganaste.`,
      metric: `-${fmtRound(diff, currency)}`,
    }
  }

  // Priority 2 — comparar gastos mes actual vs anterior
  if (prev.expenses > 0) {
    const pct = Math.round(((last.expenses - prev.expenses) / prev.expenses) * 100)

    if (pct > 5) {
      return {
        kind: 'warning',
        icon: TrendingUp,
        text: `Tus gastos aumentaron ${pct}% vs el mes anterior.`,
        metric: `+${pct}%`,
      }
    }

    if (pct < -5) {
      return {
        kind: 'success',
        icon: TrendingDown,
        text: `¡Tus gastos bajaron ${Math.abs(pct)}% vs el mes anterior!`,
        metric: `${pct}%`,
      }
    }
  }

  // Priority 3 — promedio de últimos 3 meses vs mes actual
  if (data.length >= 4) {
    const avg3 = data.slice(-4, -1).reduce((s, m) => s + m.expenses, 0) / 3
    if (avg3 > 0) {
      const vsAvg = Math.round(((last.expenses - avg3) / avg3) * 100)
      if (vsAvg > 15) {
        return {
          kind: 'warning',
          icon: TrendingUp,
          text: `Este mes gastaste ${vsAvg}% sobre tu promedio de 3 meses (${fmtRound(avg3, currency)}).`,
          metric: `+${vsAvg}% vs prom.`,
        }
      }
      if (vsAvg < -15) {
        return {
          kind: 'success',
          icon: TrendingDown,
          text: `Gastaste ${Math.abs(vsAvg)}% menos que tu promedio de 3 meses. ¡Excelente!`,
          metric: `${vsAvg}% vs prom.`,
        }
      }
    }
  }

  return {
    kind: 'neutral',
    icon: Minus,
    text: 'Tus gastos se mantienen estables respecto al mes anterior.',
    metric: null,
  }
}

/* ─── Insight banner ─────────────────────────────────────────────────── */

const insightStyles: Record<InsightKind, { wrap: string; icon: string; text: string }> = {
  danger:  { wrap: 'bg-expense-subtle border-[hsl(var(--expense)/0.25)]',  icon: 'text-expense',  text: 'text-expense' },
  warning: { wrap: 'bg-[hsl(var(--warning)/0.10)] border-[hsl(var(--warning)/0.25)]', icon: 'text-warning', text: 'text-warning' },
  success: { wrap: 'bg-income-subtle border-[hsl(var(--income)/0.25)]',    icon: 'text-income',   text: 'text-income' },
  neutral: { wrap: 'bg-secondary border-border',                           icon: 'text-muted-foreground', text: 'text-muted-foreground' },
}

function InsightBanner({ insight }: { insight: ChartInsight }) {
  const s = insightStyles[insight.kind]
  const Icon = insight.icon
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

/* ─── Custom tooltip ─────────────────────────────────────────────────── */

function CustomTooltip({
  active,
  payload,
  label,
  currency,
}: TooltipProps<number, string> & { currency: string }) {
  if (!active || !payload?.length) return null

  const income   = payload.find((p) => p.dataKey === 'income')
  const expenses = payload.find((p) => p.dataKey === 'expenses')
  const balance  = payload.find((p) => p.dataKey === 'net')
  const net      = (income?.value ?? 0) - (expenses?.value ?? 0)

  return (
    <div className="bg-card border border-border rounded-xl shadow-xl px-4 py-3 text-xs min-w-[200px]">
      {/* Month label */}
      <p className="font-semibold text-foreground mb-2.5 capitalize">{label}</p>

      <div className="space-y-1.5">
        {income && (
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[hsl(var(--income))] shrink-0" />
              <span className="text-muted-foreground">Ingresos</span>
            </div>
            <span className="font-semibold text-income tabular-nums">
              {fmt(income.value ?? 0, currency)}
            </span>
          </div>
        )}
        {expenses && (
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[hsl(var(--expense))] shrink-0" />
              <span className="text-muted-foreground">Gastos</span>
            </div>
            <span className="font-semibold text-expense tabular-nums">
              {fmt(expenses.value ?? 0, currency)}
            </span>
          </div>
        )}
        {/* Divider + balance */}
        {income && expenses && (
          <>
            <div className="border-t border-border my-1" />
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: 'hsl(var(--muted-foreground))', opacity: 0.5 }}
                />
                <span className="text-muted-foreground">Balance</span>
              </div>
              <span className={`font-bold tabular-nums ${net >= 0 ? 'text-income' : 'text-expense'}`}>
                {fmt(net, currency)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ─── Mini stats footer ──────────────────────────────────────────────── */

function MiniStat({
  label,
  value,
  sub,
  valueClass,
}: {
  label: string
  value: string
  sub: string
  valueClass?: string
}) {
  return (
    <div className="text-center flex-1 min-w-0">
      <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`text-sm font-bold tabular-nums truncate ${valueClass ?? 'text-foreground'}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground/50 capitalize mt-0.5">{sub}</p>
    </div>
  )
}

/* ─── Main component ─────────────────────────────────────────────────── */

export function MonthlyTrendChart({ data, isLoading, currency = 'DOP' }: Props) {
  const [range, setRange] = React.useState<Range>('6M')

  /* Slice data to selected range and build chart points */
  const points = React.useMemo<ChartPoint[]>(() => {
    if (!data?.length) return []
    return data.slice(-RANGE_MONTHS[range]).map((d) => ({
      ...d,
      label: new Date(d.month + '-01').toLocaleDateString('es-DO', {
        month: 'short',
        year: '2-digit',
      }),
    }))
  }, [data, range])

  /* Compute BI insight from the unsliced dataset for best signal */
  const insight = React.useMemo(() => {
    if (!data?.length) return null
    return computeInsight(data, currency)
  }, [data, currency])

  /* Mini-stats computed from the visible slice */
  const stats = React.useMemo(() => {
    if (!points.length) return null
    const best  = points.reduce((b, m) => (m.net > b.net ? m : b), points[0])
    const worst = points.reduce((w, m) => (m.net < w.net ? m : w), points[0])
    const avgNet = Math.round(points.reduce((s, m) => s + m.net, 0) / points.length)
    return { best, worst, avgNet }
  }, [points])

  /* Y-axis max/min with 10% padding so lines don't hug borders */
  const yDomain = React.useMemo<[number, number]>(() => {
    if (!points.length) return [0, 1]
    const allValues = points.flatMap((p) => [p.income, p.expenses, p.net])
    const min = Math.min(...allValues)
    const max = Math.max(...allValues)
    const pad = (max - min) * 0.12 || 1000
    return [Math.floor((min - pad) / 1000) * 1000, Math.ceil((max + pad) / 1000) * 1000]
  }, [points])

  /* Y-axis tick formatter — full RD$ format, no abbreviation */
  const fmtAxis = React.useCallback(
    (v: number) => fmtRound(v, currency),
    [currency],
  )

  /* ── Render ── */

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-5 animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded-xl" />
          <div className="flex items-end justify-between gap-2">
            <div className="h-4 w-40 bg-muted rounded" />
            <div className="h-7 w-28 bg-muted rounded-lg" />
          </div>
          <div className="h-[260px] bg-muted/50 rounded-xl" />
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
            {[0, 1, 2].map((i) => <div key={i} className="h-12 bg-muted rounded-lg" />)}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!points.length) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="h-[320px] flex flex-col items-center justify-center gap-3 text-center">
            <span className="text-4xl">📊</span>
            <p className="text-sm font-medium text-foreground">No hay datos suficientes</p>
            <p className="text-xs text-muted-foreground/60 max-w-[220px]">
              Agrega transacciones para ver la evolución mensual.
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
        {/* BI insight banner — responde "¿estoy mejor o peor?" en < 3 segundos */}
        {insight && <InsightBanner insight={insight} />}

        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold text-foreground">Ingresos vs Gastos</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Últimos {RANGE_MONTHS[range]} meses · {currency}
            </p>
          </div>
          <Select value={range} onValueChange={(v) => setRange(v as Range)}>
            <SelectTrigger className="w-[110px] h-8 rounded-lg text-xs" aria-label="Período">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="3M" className="text-xs rounded-lg">3 meses</SelectItem>
              <SelectItem value="6M" className="text-xs rounded-lg">6 meses</SelectItem>
              <SelectItem value="12M" className="text-xs rounded-lg">12 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      {/* ── Chart ── */}
      <CardContent className="px-2 pb-4 sm:px-4">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            {/* Subtle horizontal grid only — vertical lines add noise */}
            <CartesianGrid
              strokeDasharray="0"
              stroke="hsl(var(--border))"
              strokeOpacity={0.5}
              vertical={false}
            />

            {/* Zero reference line when balance goes negative */}
            {yDomain[0] < 0 && (
              <ReferenceLine
                y={0}
                stroke="hsl(var(--muted-foreground))"
                strokeOpacity={0.3}
                strokeDasharray="4 4"
              />
            )}

            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', opacity: 0.7 }}
            />
            <YAxis
              domain={yDomain}
              tickFormatter={fmtAxis}
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              tickCount={5}
              width={100}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', opacity: 0.7 }}
            />

            <Tooltip
              content={<CustomTooltip currency={currency} />}
              cursor={{
                stroke: 'hsl(var(--border))',
                strokeWidth: 1,
                strokeDasharray: '4 4',
              }}
            />

            {/* ── Ingresos — verde, line primaria ── */}
            <Line
              dataKey="income"
              name="Ingresos"
              stroke="hsl(var(--income))"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0, fill: 'hsl(var(--income))' }}
              type="monotone"
            />

            {/* ── Gastos — rojo, line primaria ── */}
            <Line
              dataKey="expenses"
              name="Gastos"
              stroke="hsl(var(--expense))"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0, fill: 'hsl(var(--expense))' }}
              type="monotone"
            />

            {/* ── Balance neto — gris sutil, dashed, señal de ahorro ── */}
            <Line
              dataKey="net"
              name="Balance"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              strokeOpacity={0.55}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: 'hsl(var(--muted-foreground))', fillOpacity: 0.6 }}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>

        {/* ── Legend ── */}
        <div className="flex items-center justify-center gap-5 mt-1 mb-5">
          {[
            { color: 'bg-[hsl(var(--income))]',            label: 'Ingresos', dash: false },
            { color: 'bg-[hsl(var(--expense))]',           label: 'Gastos',   dash: false },
            { color: 'bg-[hsl(var(--muted-foreground)/0.5)]', label: 'Balance', dash: true },
          ].map(({ color, label, dash }) => (
            <div key={label} className="flex items-center gap-1.5">
              {dash ? (
                <svg width="16" height="2" className="shrink-0">
                  <line x1="0" y1="1" x2="16" y2="1" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" strokeDasharray="4 3" strokeOpacity={0.55} />
                </svg>
              ) : (
                <span className={`w-3 h-0.5 rounded-full shrink-0 ${color}`} />
              )}
              <span className="text-[11px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        {/* ── Mini stats ── */}
        {stats && (
          <div className="grid grid-cols-3 gap-1 border-t border-border pt-4">
            <MiniStat
              label="Mejor mes"
              value={fmtRound(stats.best.net, currency)}
              sub={stats.best.label}
              valueClass="text-income"
            />
            <div className="relative border-x border-border">
              <MiniStat
                label="Promedio neto"
                value={fmtRound(stats.avgNet, currency)}
                sub="mensual"
                valueClass={stats.avgNet >= 0 ? 'text-foreground' : 'text-expense'}
              />
            </div>
            <MiniStat
              label="Peor mes"
              value={fmtRound(stats.worst.net, currency)}
              sub={stats.worst.label}
              valueClass="text-expense"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
