import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { useCategoryTrends } from '../../hooks/useAnalytics'
import { fmtRound as fmt } from '../../lib/currency'
import { cn } from '../../lib/utils'
import { PieChart as ChartIcon } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts'

export function CategoryTrendsChart({ months, currency = 'USD' }: { months: number; currency?: string }) {
  const { data, isLoading, isError } = useCategoryTrends(months)
  const [isStacked, setIsStacked] = useState(false)
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set())

  const { chartData, allKeys } = useMemo(() => {
    if (!data || data.categories.length === 0) return { chartData: [], allKeys: [] }

    // El backend retornó categorías ya ordenadas por totalPeriod DESC
    const topCats = data.categories.slice(0, 5)
    const otherCats = data.categories.slice(5)

    const keysMap = new Map<string, { id: string; name: string; color: string }>()
    topCats.forEach(c => keysMap.set(c.categoryId, { id: c.categoryId, name: c.categoryName, color: c.categoryColor }))

    const hasOthers = otherCats.length > 0
    if (hasOthers) {
      keysMap.set('otras', { id: 'otras', name: 'Otras', color: 'hsl(var(--muted-foreground)/0.4)' })
    }

    const monthsSet = new Set<string>()
    data.categories.forEach(c => c.months.forEach(m => monthsSet.add(m.month)))
    const sortedMonths = Array.from(monthsSet).sort()

    const formatMonth = (mstr: string) => {
      const [y, m] = mstr.split('-')
      const mNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
      return `${mNames[parseInt(m, 10) - 1]} ${y.slice(-2)}`
    }

    const chartData = sortedMonths.map(month => {
      const row: any = { month, monthLabel: formatMonth(month) }
      keysMap.forEach((_, key) => row[key] = 0)

      topCats.forEach(c => {
        const mData = c.months.find(m => m.month === month)
        row[c.categoryId] = mData ? mData.amount : 0
      })

      if (hasOthers) {
        let otrasSuma = 0
        otherCats.forEach(c => {
          const mData = c.months.find(m => m.month === month)
          if (mData) otrasSuma += mData.amount
        })
        row['otras'] = otrasSuma
      }

      return row
    })

    return { chartData, allKeys: Array.from(keysMap.values()) }
  }, [data])

  const toggleKey = (key: string) => {
    setHiddenKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const CategoryTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const sorted = [...payload].sort((a, b) => b.value - a.value)
      const total = sorted.reduce((sum, item) => sum + item.value, 0)
      
      // label comes as "monthLabel" which is like "Ene 25"
      return (
        <div className="bg-card text-card-foreground border border-border shadow-md rounded-lg p-3 min-w-[200px]">
          <p className="text-subhead font-semibold mb-2">{label}</p>
          <div className="space-y-1.5 mb-2 pb-2 border-b border-border">
            {sorted.map(entry => (
              <div key={entry.dataKey} className="flex justify-between items-center text-footnote">
                <span className="flex items-center gap-1.5 text-muted-foreground mr-4">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name}
                </span>
                <span className="font-medium text-foreground">{fmt(entry.value, currency)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center text-footnote font-semibold">
            <span className="text-muted-foreground">Total</span>
            <span className="text-foreground">{fmt(total, currency)}</span>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="flex flex-col flex-1 w-full h-full">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-headline">Tendencia por Categoría</CardTitle>
            <p className="text-footnote text-muted-foreground">
              Últimos {months} meses
            </p>
          </div>
          
          {/* Apple HIG Segmented Control */}
          {!isLoading && !isError && data && data.categories.length > 0 && (
            <div className="flex items-center bg-muted/50 p-0.5 rounded-lg border border-border/50 sm:self-start">
              <button 
                onClick={() => setIsStacked(false)}
                className={cn(
                  "px-3 py-1 text-footnote font-medium rounded-md transition-all duration-200",
                  !isStacked ? "bg-background text-foreground shadow-sm ring-1 ring-border/50" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Agrupado
              </button>
              <button 
                onClick={() => setIsStacked(true)}
                className={cn(
                  "px-3 py-1 text-footnote font-medium rounded-md transition-all duration-200",
                  isStacked ? "bg-background text-foreground shadow-sm ring-1 ring-border/50" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Apilado
              </button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-6 pt-0 flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex flex-col flex-1">
            <div className="h-[300px] w-full flex items-end justify-between px-2 pt-6">
              {Array.from({ length: Math.min(months, 6) }).map((_, i) => (
                <div key={i} className="flex gap-[2px] items-end h-[85%] w-[12%]">
                  <div className="w-1/3 bg-muted/40 animate-shimmer rounded-t-sm" style={{ height: `${30 + Math.random() * 20}%` }} />
                  <div className="w-1/3 bg-primary/20 animate-shimmer rounded-t-sm" style={{ height: `${40 + Math.random() * 40}%` }} />
                  <div className="w-1/3 bg-muted/40 animate-shimmer rounded-t-sm" style={{ height: `${20 + Math.random() * 30}%` }} />
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-4 mt-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-4 w-16 bg-muted/30 animate-shimmer rounded-full" />
              ))}
            </div>
          </div>
        ) : isError ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground min-h-[300px]">
            Error al cargar la tendencia de categorías
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center min-h-[300px]">
            <ChartIcon className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-subhead font-medium text-foreground">Sin gastos registrados</p>
            <p className="text-footnote text-muted-foreground mt-1 max-w-[250px]">
              Agrega transacciones para ver tus historiales de categorías.
            </p>
          </div>
        ) : (
          <div className="flex flex-col flex-1">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={chartData} 
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                barGap={isStacked ? 0 : 2}
                barCategoryGap="25%"
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                
                <XAxis 
                  dataKey="monthLabel" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 500 }} 
                  dy={10} 
                />
                
                <YAxis 
                  tickFormatter={(val) => {
                    if (val === 0) return '0'
                    return fmt(val, currency).split(',')[0]
                  }} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                  width={80}
                />
                
                <RechartsTooltip content={<CategoryTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
                
                {allKeys.map(cat => (
                  <Bar 
                    key={cat.id} 
                    dataKey={cat.id} 
                    name={cat.name} 
                    stackId={isStacked ? "a" : undefined}
                    fill={cat.color}
                    radius={isStacked ? [0, 0, 0, 0] : [2, 2, 0, 0]}
                    hide={hiddenKeys.has(cat.id)}
                    isAnimationActive={true}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>

            {/* Custom Interactive Legend */}
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-6">
              {allKeys.map(cat => {
                const isHidden = hiddenKeys.has(cat.id)
                return (
                  <button 
                    key={cat.id}
                    onClick={() => toggleKey(cat.id)}
                    className={cn(
                      "flex items-center gap-2 text-caption font-medium transition-opacity duration-200 hover:opacity-80 focus:outline-none",
                      isHidden ? "opacity-30" : "opacity-100"
                    )}
                  >
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="text-foreground">{cat.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
