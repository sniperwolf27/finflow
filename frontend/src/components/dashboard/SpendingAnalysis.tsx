/**
 * SpendingAnalysis.tsx
 *
 * Reemplaza SpendingPieChart + SpendingBreakdown con un componente unificado
 * que actúa como mini asesor financiero.
 *
 * Responde tres preguntas en < 5 segundos:
 *   1. ¿Dónde gasto más?      → Donut chart + label central
 *   2. ¿Está bien o mal?      → Barras con color semántico por categoría
 *   3. ¿Qué debería hacer?    → Advisor con recomendación y ahorro estimado
 */

import * as React from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Label } from 'recharts'
import { AlertTriangle, CheckCircle2, Info, TrendingDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Separator } from '../ui/separator'
import { CategoryBreakdown } from '../../types/dashboard.types'
import { fmt, fmtRound } from '../../lib/currency'
import { cn } from '../../lib/utils'

/* ─── Props ──────────────────────────────────────────────────────────── */

interface Props {
  data?: CategoryBreakdown[]
  isLoading: boolean
  totalExpenses: number
  /** Ingreso mensual — usado para calcular % de ingresos en el advisor */
  monthlyIncome?: number
  currency?: string
}

/* ─── Health thresholds ──────────────────────────────────────────────── */

type HealthLevel = 'high' | 'concern' | 'normal' | 'low'

interface HealthConfig {
  level: HealthLevel
  barClass: string
  labelClass: string
  bgClass: string
}

function getHealth(pct: number): HealthConfig {
  if (pct > 38) return { level: 'high',    barClass: 'bg-[hsl(var(--expense))]',  labelClass: 'text-expense',  bgClass: 'bg-expense-subtle' }
  if (pct > 25) return { level: 'concern', barClass: 'bg-[hsl(var(--warning))]',  labelClass: 'text-warning',  bgClass: 'bg-[hsl(var(--warning)/0.10)]' }
  if (pct > 5)  return { level: 'normal',  barClass: 'bg-[hsl(var(--income))]',   labelClass: 'text-income',   bgClass: 'bg-income-subtle' }
  return              { level: 'low',     barClass: 'bg-muted-foreground/40',    labelClass: 'text-muted-foreground', bgClass: 'bg-secondary' }
}

/* ─── Advisor logic ──────────────────────────────────────────────────── */

/** Umbrales recomendados por categoría (% del total de gastos) */
const CATEGORY_TARGETS: Record<string, { target: number; label: string; advice: string }> = {
  'food & dining': { target: 28, label: 'Alimentación',    advice: 'es razonable para comida y restaurantes' },
  'comida':        { target: 28, label: 'Alimentación',    advice: 'es razonable para comida y restaurantes' },
  'alimentación':  { target: 28, label: 'Alimentación',    advice: 'es razonable para comida y restaurantes' },
  'entertainment': { target: 18, label: 'Entretenimiento', advice: 'Lo recomendado es 10–18%' },
  'entretenimiento': { target: 18, label: 'Entretenimiento', advice: 'Lo recomendado es 10–18%' },
  'transport':     { target: 15, label: 'Transporte',      advice: 'Lo recomendado es hasta 15%' },
  'transporte':    { target: 15, label: 'Transporte',      advice: 'Lo recomendado es hasta 15%' },
  'shopping':      { target: 15, label: 'Compras',         advice: 'Lo recomendado es hasta 15%' },
  'compras':       { target: 15, label: 'Compras',         advice: 'Lo recomendado es hasta 15%' },
  'subscriptions': { target: 8,  label: 'Suscripciones',   advice: 'Lo recomendado es máx. 8%' },
  'suscripciones': { target: 8,  label: 'Suscripciones',   advice: 'Lo recomendado es máx. 8%' },
  'suscripción':   { target: 8,  label: 'Suscripciones',   advice: 'Lo recomendado es máx. 8%' },
  'utilities':     { target: 12, label: 'Servicios',       advice: 'Lo recomendado es hasta 12%' },
  'servicios':     { target: 12, label: 'Servicios',       advice: 'Lo recomendado es hasta 12%' },
  'health':        { target: 10, label: 'Salud',           advice: 'La salud es prioritaria, pero revisá si hay gastos evitables' },
  'salud':         { target: 10, label: 'Salud',           advice: 'La salud es prioritaria, pero revisá si hay gastos evitables' },
  'travel':        { target: 12, label: 'Viajes',          advice: 'Lo recomendado es hasta 12%' },
  'viajes':        { target: 12, label: 'Viajes',          advice: 'Lo recomendado es hasta 12%' },
}

function getCategoryTarget(name: string) {
  return CATEGORY_TARGETS[name.toLowerCase()] ?? { target: 20, label: name, advice: 'Lo recomendado es hasta 20%' }
}

interface Advice {
  kind: 'danger' | 'warning' | 'success' | 'info'
  icon: typeof AlertTriangle
  title: string
  body: string
  saving?: number
}

function buildAdvice(
  categories: CategoryBreakdown[],
  total: number,
  currency: string,
): Advice[] {
  if (!total || !categories.length) return []

  const advice: Advice[] = []

  const sorted = [...categories].sort((a, b) => b.total - a.total).slice(0, 5)

  for (const cat of sorted) {
    const pct = Math.round((cat.total / total) * 100)
    const config = getCategoryTarget(cat.name)
    const health = getHealth(pct)

    if (health.level === 'high') {
      const excess = cat.total - (total * config.target) / 100
      advice.push({
        kind: 'danger',
        icon: AlertTriangle,
        title: `${cat.name} representa el ${pct}% de tus gastos`,
        body: `${config.advice}. Reducirlo al ${config.target}% te ahorraría ${fmtRound(excess, currency)} este mes.`,
        saving: excess,
      })
    } else if (health.level === 'concern') {
      const excess = cat.total - (total * config.target) / 100
      advice.push({
        kind: 'warning',
        icon: AlertTriangle,
        title: `${cat.name} está algo elevado (${pct}%)`,
        body: `${config.advice}. Reducirlo al ${config.target}% te ahorraría ${fmtRound(excess, currency)}.`,
        saving: excess,
      })
    } else if (health.level === 'normal' && pct >= 15) {
      advice.push({
        kind: 'success',
        icon: CheckCircle2,
        title: `${cat.name} (${pct}%) está en rango saludable`,
        body: `${config.advice}. Vas bien en esta categoría.`,
      })
    }
  }

  // Si no hay alertas, agregamos un mensaje positivo
  if (advice.filter((a) => a.kind === 'danger' || a.kind === 'warning').length === 0) {
    advice.push({
      kind: 'info',
      icon: Info,
      title: 'Tu distribución de gastos luce balanceada',
      body: 'Ninguna categoría domina excesivamente tu presupuesto. Seguí monitoreando.',
    })
  }

  // Máximo 3 advice items
  return advice.slice(0, 3)
}

/* ─── Custom tooltip ─────────────────────────────────────────────────── */

function CustomTooltip({
  active,
  payload,
  total,
  currency,
}: {
  active?: boolean
  payload?: { name: string; value: number; payload: CategoryBreakdown }[]
  total: number
  currency: string
}) {
  if (!active || !payload?.length) return null
  const entry = payload[0]
  const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0
  const health = getHealth(pct)

  return (
    <div className="bg-card border border-border rounded-xl shadow-xl px-3.5 py-3 text-xs min-w-[160px]">
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: entry.payload.color }}
        />
        <span className="font-semibold text-foreground">{entry.name}</span>
      </div>
      <p className={cn('text-base font-bold tabular-nums', health.labelClass)}>
        {fmt(entry.value, currency)}
      </p>
      <p className="text-muted-foreground mt-0.5">
        {pct}% del total · {entry.payload.count}{' '}
        {entry.payload.count === 1 ? 'transacción' : 'transacciones'}
      </p>
      <p className="text-muted-foreground/70 mt-1.5 text-[10px]">
        {pct > 38
          ? '⚠️ Por encima de lo recomendado'
          : pct > 25
          ? '↑ Algo elevado'
          : '✓ En rango normal'}
      </p>
    </div>
  )
}

/* ─── Donut center label ─────────────────────────────────────────────── */

interface CenterLabelProps {
  viewBox?: { cx?: number; cy?: number }
  topName: string
  topPct: number
  topColor: string
}

function CenterLabel({ viewBox, topName, topPct, topColor }: CenterLabelProps) {
  const cx = viewBox?.cx ?? 0
  const cy = viewBox?.cy ?? 0
  // Truncate long category names
  const displayName = topName.length > 10 ? topName.slice(0, 9) + '…' : topName

  return (
    <g>
      <text
        x={cx}
        y={cy - 9}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fill: topColor, fontSize: 22, fontWeight: 800, fontFamily: 'inherit' }}
      >
        {topPct}%
      </text>
      <text
        x={cx}
        y={cy + 13}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10.5, fontFamily: 'inherit' }}
      >
        {displayName}
      </text>
    </g>
  )
}

/* ─── Category row ───────────────────────────────────────────────────── */

function CategoryRow({
  cat,
  pct,
  rank,
  currency,
}: {
  cat: CategoryBreakdown
  pct: number
  rank: number
  currency: string
}) {
  const health = getHealth(pct)

  return (
    <div className="group space-y-1">
      <div className="flex items-center gap-2">
        {/* Rank */}
        <span className="text-[10px] text-muted-foreground/70 w-3 shrink-0 text-right tabular-nums">{rank}</span>

        {/* Color dot */}
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: cat.color || '#94a3b8' }}
        />

        {/* Name */}
        <span className="text-xs font-medium text-foreground flex-1 min-w-0 truncate">
          {cat.name}
        </span>

        {/* Health indicator */}
        {health.level === 'high' && (
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 bg-expense-subtle text-expense"
            title={`${pct}% — por encima del umbral recomendado`}
          >
            ALTO
          </span>
        )}
        {health.level === 'concern' && (
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 bg-[hsl(var(--warning)/0.12)] text-warning"
            title={`${pct}% — algo elevado`}
          >
            ↑
          </span>
        )}

        {/* Percentage */}
        <span className={cn('text-xs font-bold tabular-nums shrink-0 w-8 text-right', health.labelClass)}>
          {pct}%
        </span>

        {/* Amount */}
        <span className="text-xs text-muted-foreground tabular-nums shrink-0 w-24 text-right">
          {fmtRound(cat.total, currency)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2 pl-5">
        <div className="flex-1 bg-secondary rounded-full h-1.5 overflow-hidden">
          <div
            className={cn('h-1.5 rounded-full transition-all duration-700', health.barClass)}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}

/* ─── Advice card ────────────────────────────────────────────────────── */

const adviceStyles = {
  danger:  { wrap: 'bg-expense-subtle border-[hsl(var(--expense)/0.2)]',              icon: 'text-expense' },
  warning: { wrap: 'bg-[hsl(var(--warning)/0.08)] border-[hsl(var(--warning)/0.2)]', icon: 'text-warning' },
  success: { wrap: 'bg-income-subtle border-[hsl(var(--income)/0.2)]',               icon: 'text-income' },
  info:    { wrap: 'bg-secondary border-border',                                       icon: 'text-muted-foreground' },
} as const

function AdviceCard({ advice }: { advice: Advice }) {
  const s = adviceStyles[advice.kind]
  const Icon = advice.icon

  return (
    <div className={cn('flex gap-3 p-3 rounded-xl border', s.wrap)}>
      <Icon size={14} className={cn('shrink-0 mt-0.5', s.icon)} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground leading-snug">{advice.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{advice.body}</p>
        {advice.saving && advice.saving > 0 && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <TrendingDown size={11} className="text-income shrink-0" />
            <span className="text-[11px] font-bold text-income">
              Ahorro potencial: {fmtRound(advice.saving, 'DOP')}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Merge small slices ─────────────────────────────────────────────── */

function mergeSmallSlices(data: CategoryBreakdown[], minPct = 3): CategoryBreakdown[] {
  const total = data.reduce((s, c) => s + c.total, 0)
  if (total === 0) return data

  const main: CategoryBreakdown[] = []
  let othersTotal = 0
  let othersCount = 0

  for (const cat of data) {
    if ((cat.total / total) * 100 >= minPct) {
      main.push(cat)
    } else {
      othersTotal += cat.total
      othersCount += cat.count
    }
  }

  if (othersTotal > 0) {
    main.push({
      categoryId: '__others__',
      name: 'Otros',
      color: '#94a3b8',
      icon: 'tag',
      total: othersTotal,
      count: othersCount,
    })
  }

  return main
}

/* ─── Skeleton ───────────────────────────────────────────────────────── */

function Skeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="h-4 w-36 animate-shimmer rounded" />
          <div className="h-4 w-24 animate-shimmer rounded" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6">
          <div className="flex items-center justify-center">
            <div className="w-[160px] h-[160px] animate-shimmer rounded-full" />
          </div>
          <div className="space-y-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full animate-shimmer shrink-0" />
                  <div className="h-3 w-24 animate-shimmer rounded flex-1" />
                  <div className="h-3 w-20 animate-shimmer rounded" />
                </div>
                <div className="h-1.5 animate-shimmer rounded-full ml-5" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/* ─── Main component ─────────────────────────────────────────────────── */

export function SpendingAnalysis({
  data,
  isLoading,
  totalExpenses,
  monthlyIncome = 0,
  currency = 'DOP',
}: Props) {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null)

  if (isLoading) return <Skeleton />

  const rawSorted = data ? [...data].sort((a, b) => b.total - a.total) : []
  const chartData = mergeSmallSlices(rawSorted, 3)
  const total = totalExpenses > 0 ? totalExpenses : rawSorted.reduce((s, c) => s + c.total, 0)
  const top = rawSorted[0]
  const topPct = top && total > 0 ? Math.round((top.total / total) * 100) : 0

  const listData = rawSorted.slice(0, 7)
  const advice = buildAdvice(rawSorted, total, currency)

  // Savings total for header callout
  const totalSavingsPotential = advice.reduce((s, a) => s + (a.saving ?? 0), 0)

  if (!rawSorted.length) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <span className="text-4xl">🗂️</span>
            <p className="text-sm font-medium text-foreground">No hay gastos registrados</p>
            <p className="text-xs text-muted-foreground/60 max-w-[220px]">
              Los gastos por categoría aparecerán aquí cuando sincronices transacciones.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      {/* ── Header ── */}
      <CardHeader className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold text-foreground">
              ¿En qué estoy gastando?
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {rawSorted.length} categorías · Total:{' '}
              <span className="font-semibold text-foreground">{fmtRound(total, currency)}</span>
              {monthlyIncome > 0 && (
                <span className="ml-1 text-muted-foreground/60">
                  ({Math.round((total / monthlyIncome) * 100)}% del ingreso)
                </span>
              )}
            </p>
          </div>

          {/* Savings callout — only when there's meaningful potential */}
          {totalSavingsPotential > 500 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-income-subtle border border-[hsl(var(--income)/0.25)] shrink-0">
              <TrendingDown size={12} className="text-income shrink-0" />
              <span className="text-[11px] font-bold text-income whitespace-nowrap">
                Podés ahorrar {fmtRound(totalSavingsPotential, currency)}
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-5 space-y-5">

        {/* ── Zone 1: Chart + Category list (side by side) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr] gap-5 items-start">

          {/* Donut chart */}
          <div className="flex flex-col items-center gap-2">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={56}
                  outerRadius={84}
                  paddingAngle={2}
                  dataKey="total"
                  nameKey="name"
                  strokeWidth={0}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={entry.categoryId ?? entry.name}
                      fill={entry.color}
                      opacity={
                        activeIndex === null
                          ? entry.categoryId === top?.categoryId ? 1 : 0.72
                          : activeIndex === index ? 1 : 0.35
                      }
                    />
                  ))}

                  {/* Center label — shows dominant category */}
                  <Label
                    content={(props) => (
                      <CenterLabel
                        viewBox={props.viewBox as { cx: number; cy: number }}
                        topName={top?.name ?? ''}
                        topPct={topPct}
                        topColor={top?.color ?? 'hsl(var(--foreground))'}
                      />
                    )}
                    position="center"
                  />
                </Pie>

                <Tooltip
                  content={
                    <CustomTooltip total={total} currency={currency} />
                  }
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Dominant category label below donut */}
            {top && (
              <div className="text-center px-2">
                <p className="text-[11px] text-muted-foreground">Mayor gasto</p>
                <p className="text-xs font-bold" style={{ color: top.color }}>
                  {top.name}
                </p>
              </div>
            )}
          </div>

          {/* Category list */}
          <div className="space-y-3">
            {listData.map((cat, i) => {
              const pct = total > 0 ? Math.round((cat.total / total) * 100) : 0
              return (
                <CategoryRow
                  key={cat.categoryId ?? cat.name}
                  cat={cat}
                  pct={pct}
                  rank={i + 1}
                  currency={currency}
                />
              )
            })}

            {rawSorted.length > 7 && (
              <p className="text-[11px] text-muted-foreground/70 pl-5">
                +{rawSorted.length - 7} categorías más con pequeño impacto
              </p>
            )}
          </div>
        </div>

        {/* ── Zone 2: Advisor ── */}
        {advice.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 mb-3">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Asesor financiero
                </span>
              </div>
              {advice.map((a, i) => (
                <AdviceCard key={i} advice={a} />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
