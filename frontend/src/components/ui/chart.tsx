import * as React from 'react'
import { Legend, Tooltip } from 'recharts'
import { cn } from '../../lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────

export type ChartConfig = Record<
  string,
  { label?: string; color?: string; icon?: React.ComponentType }
>

interface ChartContextValue {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextValue>({ config: {} })

function useChartConfig() {
  return React.useContext(ChartContext)
}

// ── ChartContainer ─────────────────────────────────────────────────────────

export function ChartContainer({
  config,
  className,
  children,
}: {
  config: ChartConfig
  className?: string
  children: React.ReactElement
}) {
  // Build CSS custom properties: --color-<key> from each config entry
  const cssVars = Object.entries(config).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      if (value.color) acc[`--color-${key}`] = value.color
      return acc
    },
    {},
  )

  return (
    <ChartContext.Provider value={{ config }}>
      <div className={cn('w-full', className)} style={cssVars as React.CSSProperties}>
        {children}
      </div>
    </ChartContext.Provider>
  )
}

// ── ChartTooltip ──────────────────────────────────────────────────────────

export const ChartTooltip = Tooltip

// ── ChartTooltipContent ───────────────────────────────────────────────────

export function ChartTooltipContent({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
  indicator = 'dot',
  className,
}: {
  active?: boolean
  payload?: { name: string; value: number; color: string; dataKey: string }[]
  label?: string
  labelFormatter?: (value: string) => React.ReactNode
  valueFormatter?: (value: number, key: string) => React.ReactNode
  indicator?: 'dot' | 'line'
  className?: string
}) {
  const { config } = useChartConfig()
  if (!active || !payload?.length) return null

  return (
    <div
      className={cn(
        'bg-card border border-border rounded-lg px-3 py-2.5 shadow-lg text-xs space-y-1 min-w-36',
        className,
      )}
    >
      {label && (
        <p className="font-semibold text-card-foreground mb-1.5">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      {payload.map((p) => {
        const cfg = config[p.dataKey] ?? config[p.name]
        const displayLabel = cfg?.label ?? p.name
        return (
          <div key={p.dataKey ?? p.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              {indicator === 'dot' && (
                <span
                  className="w-2 h-2 rounded-full inline-block shrink-0"
                  style={{ backgroundColor: p.color }}
                />
              )}
              {displayLabel}
            </span>
            <span className="font-semibold text-card-foreground tabular-nums">
              {valueFormatter ? valueFormatter(p.value, p.dataKey ?? p.name) : p.value}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── ChartLegend ───────────────────────────────────────────────────────────

export const ChartLegend = Legend

// ── ChartLegendContent ────────────────────────────────────────────────────

export function ChartLegendContent({
  payload,
  className,
}: {
  payload?: { value: string; color: string }[]
  className?: string
}) {
  const { config } = useChartConfig()
  if (!payload?.length) return null

  return (
    <div className={cn('flex items-center justify-center gap-4 text-xs', className)}>
      {payload.map((entry) => {
        const cfg = config[entry.value]
        return (
          <span key={entry.value} className="flex items-center gap-1.5 text-muted-foreground">
            <span
              className="w-2 h-2 rounded-full inline-block shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            {cfg?.label ?? entry.value}
          </span>
        )
      })}
    </div>
  )
}
