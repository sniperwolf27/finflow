import { useState, useMemo } from 'react'
import {
  ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot
} from 'recharts'
import { useSavingsProjection, type SavingsProjectionGoal } from '../../hooks/useAnalytics'
import { useSettings } from '../../hooks/useSettings'
import { fmtRound as fmt } from '../../lib/currency'
import { Spinner } from '../ui/Spinner'
import { cn } from '../../lib/utils'

export function SavingsProjectionChart() {
  const { data, isLoading, isError } = useSavingsProjection()
  const { data: settings } = useSettings()
  const currency = settings?.baseCurrency ?? 'DOP'
  
  const [period, setPeriod] = useState<6 | 12 | 24 | 36>(12)

  const chartData = useMemo(() => {
    if (!data) return []
    const limit = period
    
    // Unir los 3 escenarios en un solo arreglo de objetos para Recharts
    const zipped = data.scenarios.current.slice(0, limit).map((curr, idx) => {
      const cons = data.scenarios.conservative[idx]
      const opti = data.scenarios.optimistic[idx]
      return {
        monthKey: curr.month,
        label: curr.label, // eje X
        monthIndex: idx + 1, // 1-indexed for goal matching
        conservative: cons.projectedSavings,
        current: curr.projectedSavings,
        optimistic: opti.projectedSavings,
      }
    })
    return zipped
  }, [data, period])

  if (isLoading) {
    return (
      <div className="card p-6 min-h-[400px] flex items-center justify-center animate-shimmer">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  if (isError || !data) return null

  // Stats calculations
  const extraMonthly = data.monthlyIncomeAvg - data.monthlyExpenseAvg
  
  let closestGoal: SavingsProjectionGoal | null = null
  let minMonths = Infinity
  data.goalProjections.forEach(g => {
    if (g.monthsToComplete.current !== null && g.monthsToComplete.current < minMonths) {
      minMonths = g.monthsToComplete.current
      closestGoal = g
    }
  })
  
  const opti12 = data.scenarios.optimistic[11]?.projectedSavings ?? 0

  const minGoalAmount = data.goalProjections.length > 0
    ? Math.min(...data.goalProjections.map(g => g.targetAmount - g.currentAmount))
    : 0

  return (
    <div className="card p-6 mt-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-title-2 font-semibold text-foreground">Proyecciones de Ahorro</h2>
          <p className="text-subhead text-muted-foreground mt-1">
            Basadas en tu tasa actual de ahorro ({data.savingsRateAvg.toFixed(1)}%)
          </p>
        </div>
        
        {/* Segmented Control HIG */}
        <div className="flex bg-muted rounded-lg p-0.5 self-start sm:self-auto">
          {([6, 12, 24, 36] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-3 py-1.5 rounded-md text-subhead font-medium transition-all duration-200",
                period === p 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p}M
            </button>
          ))}
        </div>
      </div>

      {/* Row de Stats compacto HIG */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-4">
        <div>
          <p className="text-caption text-muted-foreground">Ahorro mensual</p>
          <p className="text-headline font-semibold text-income">
            +{fmt(extraMonthly, currency)}
          </p>
        </div>
        
        {closestGoal && (
          <>
            <div className="hidden sm:block w-px h-8 bg-border" />
            <div>
              <p className="text-caption text-muted-foreground">Meta más cercana</p>
              <p className="text-headline font-semibold text-warning">
                {closestGoal.goalName} · {minMonths} {minMonths === 1 ? 'mes' : 'meses'}
              </p>
            </div>
          </>
        )}
        
        <div className="hidden sm:block w-px h-8 bg-border" />
        <div>
          <p className="text-caption text-muted-foreground">Optimista en 12m</p>
          <p className="text-headline font-semibold text-primary">
            {fmt(opti12, currency)}
          </p>
        </div>
      </div>

      <div className="h-[350px] w-full mt-6">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCons" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorCurr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.20}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorOpti" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--income))" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="hsl(var(--income))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid 
              strokeDasharray="3 3" 
              vertical={false} 
              stroke="hsl(var(--border))" 
              strokeOpacity={0.4} 
            />
            
            <XAxis 
              dataKey="label" 
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              minTickGap={30}
            />
            
            <YAxis 
              width={90}
              domain={[
                (dataMin: number) => Math.min(dataMin * 0.9, minGoalAmount * 0.7),
                'auto'
              ]}
              tickFormatter={(value) => {
                if (value >= 1000000) return `${fmt(value/1000000, currency)}M`
                if (value >= 1000) return `${currency === 'DOP' ? 'RD$' : 'US$'} ${(value/1000).toFixed(0)}k`
                return fmt(value, currency)
              }}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
            />
            
            <Tooltip 
              content={<CustomTooltip goalProjections={data.goalProjections} currency={currency} />} 
              cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '3 3' }}
            />
            
            <Area 
              type="monotone" 
              dataKey="optimistic" 
              stroke="hsl(var(--income))" 
              strokeWidth={1.5}
              strokeDasharray="4 4" 
              fillOpacity={1} 
              fill="url(#colorOpti)"
              activeDot={{ r: 4, strokeWidth: 0, fill: "hsl(var(--income))" }}
            />
            <Area 
              type="monotone" 
              dataKey="current" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorCurr)"
              activeDot={{ r: 5, strokeWidth: 0, fill: "hsl(var(--primary))" }}
            />
            <Area 
              type="monotone" 
              dataKey="conservative" 
              stroke="hsl(var(--destructive))" 
              strokeWidth={1.5}
              strokeDasharray="4 4" 
              fillOpacity={1} 
              fill="url(#colorCons)"
              activeDot={{ r: 4, strokeWidth: 0, fill: "hsl(var(--destructive))" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {data.goalProjections.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-caption text-muted-foreground mb-3">
            Metas en camino
          </p>
          <div className="space-y-2">
            {data.goalProjections.map(goal => (
              <div key={goal.goalId} 
                   className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-warning" />
                  <span className="text-subhead font-medium">
                    {goal.goalName}
                  </span>
                  <span className="text-caption text-muted-foreground hidden sm:inline">
                    {fmt(goal.targetInBase - goal.currentInBase, currency)} restantes
                  </span>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <p className="text-caption text-muted-foreground">
                      Conservador
                    </p>
                    <p className="text-footnote font-medium text-destructive">
                      {goal.monthsToComplete.conservative 
                        ? `${goal.monthsToComplete.conservative}m`
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-caption text-muted-foreground">
                      Actual
                    </p>
                    <p className="text-footnote font-medium text-primary">
                      {goal.monthsToComplete.current 
                        ? `${goal.monthsToComplete.current}m`
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-caption text-muted-foreground">
                      Optimista
                    </p>
                    <p className="text-footnote font-medium text-income">
                      {goal.monthsToComplete.optimistic 
                        ? `${goal.monthsToComplete.optimistic}m`
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CustomTooltip({ active, payload, label, goalProjections, currency }: any) {
  if (active && payload && payload.length) {
    const currentData = payload[0].payload
    const currentMonthIndex = currentData.monthIndex
    const metGoals = (goalProjections as SavingsProjectionGoal[]).filter(g => g.monthsToComplete.current === currentMonthIndex)

    return (
      <div className="bg-background border border-border rounded-xl shadow-modal p-3 min-w-[200px]">
        <p className="text-subhead font-semibold text-foreground mb-3 pb-2 border-b border-border/50">{label}</p>
        
        <div className="space-y-2.5">
          {[...payload].reverse().map((entry: any, i: number) => {
            let name = 'Actual'
            let color = 'hsl(var(--primary))'
            if (entry.dataKey === 'conservative') { name = 'Conservador'; color = 'hsl(var(--destructive))' }
            if (entry.dataKey === 'optimistic') { name = 'Optimista'; color = 'hsl(var(--income))' }
            
            return (
              <div key={i} className="flex justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-caption text-muted-foreground">{name}</span>
                </div>
                <span className="text-subhead font-semibold text-foreground">
                  {fmt(entry.value, currency)}
                </span>
              </div>
            )
          })}
        </div>

        {metGoals.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50 space-y-1.5">
            {metGoals.map((g: any) => (
              <p key={g.goalId} className="text-caption text-warning flex items-center gap-1.5">
                🎯 · Alcanzas: {g.goalName}
              </p>
            ))}
          </div>
        )}
      </div>
    )
  }
  return null
}
