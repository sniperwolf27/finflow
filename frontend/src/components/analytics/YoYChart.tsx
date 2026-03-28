import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { useYoYComparison } from '../../hooks/useAnalytics'
import { fmtRound as fmt } from '../../lib/currency'
import { BarChart as BarChartIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LabelList } from 'recharts'

export function YoYChart({ currency = 'USD' }: { currency?: string }) {
  const { data, isLoading, isError } = useYoYComparison()

  const formatBadge = (label: string, value: number, inverse = false) => {
    let colorClass = 'text-muted-foreground bg-muted/50 border-transparent'
    let Icon = Minus

    if (Math.abs(value) >= 0.1) {
      const isPositive = value > 0
      const isGood = inverse ? !isPositive : isPositive
      colorClass = isGood 
        ? 'text-income bg-income-subtle border-[hsl(var(--income)/0.2)]' 
        : 'text-expense bg-expense-subtle border-[hsl(var(--expense)/0.2)]'
      Icon = isPositive ? TrendingUp : TrendingDown
    }

    const sign = value > 0 ? '+' : ''
    
    return (
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-caption font-medium ${colorClass}`}>
        <span>{label} YTD</span>
        <span className="flex items-center gap-0.5">
          <Icon className="w-3 h-3" />
          {sign}{value.toFixed(1)}%
        </span>
      </div>
    )
  }

  // Label personalizado sobre el grupo de barras
  const DeltaLabel = (props: any) => {
    const { x, y, width, index, data } = props
    if (!data || !data[index]) return null
    
    const item = data[index]
    const delta = item.expenseDelta
    
    // Solo mostrar si supera el 2% para evitar ruido
    if (Math.abs(delta) < 2) return null
    
    const isBetter = delta < 0 // Gastos bajaron = verde
    const color = isBetter ? 'hsl(var(--income))' : 'hsl(var(--expense))'
    const displaySign = delta > 0 ? '+' : ''
    
    return (
      <text 
         x={x - 1} // Centrado del grupo (considerando barSize=8, barGap=2)
         y={y - 8} 
         fill={color} 
         fontSize={10} 
         fontWeight={600} 
         textAnchor="middle"
      >
        {displaySign}{delta.toFixed(0)}%
      </text>
    )
  }

  const YoYTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length >= 2) {
      // payload[0] es previousYear, payload[1] es currentYear porque en el Recharts están en ese orden.
      const data = payload[0].payload
      const isGain = data.expenseDelta < 0
      const deltaColor = Math.abs(data.expenseDelta) < 0.1 
        ? 'text-muted-foreground' 
        : (isGain ? 'text-income' : 'text-expense')
      const sign = data.expenseDelta > 0 ? '+' : ''

      return (
        <div className="bg-card text-card-foreground border border-border shadow-md rounded-lg p-3 min-w-[220px]">
          <p className="text-subhead font-semibold mb-2">{data.month}</p>
          <div className="text-footnote font-medium flex items-center flex-wrap gap-1 text-muted-foreground whitespace-nowrap">
            <span className="mr-0.5">Gastos:</span>
            <span>{fmt(Math.round(data.previousYear.expenses), currency)}</span>
            <span className="mx-0.5">→</span>
            <span className="text-foreground mr-1">{fmt(Math.round(data.currentYear.expenses), currency)}</span>
            <span className={`font-semibold ${deltaColor}`}>
              ({sign}{data.expenseDelta.toFixed(1)}%)
            </span>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="flex flex-col w-full h-full">
      <CardHeader className="pb-2">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-headline">Comparación Anual</CardTitle>
            {data ? (
              <p className="text-footnote text-muted-foreground">
                {data.currentYear} vs {data.previousYear}
              </p>
            ) : (
              <div className="h-4 w-24 rounded bg-muted animate-shimmer" />
            )}
          </div>
          
          {/* Summary Badges YTD */}
          {!isLoading && data && (
            <div className="flex flex-wrap items-center gap-2 md:gap-3 lg:justify-end">
              {formatBadge('Gastos', data.summary.expenseChangeYTD, true)}
              {formatBadge('Ingresos', data.summary.incomeChangeYTD, false)}
              {formatBadge('Neto', data.summary.netChangeYTD, false)}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-6 pt-4 flex-1">
        {isLoading ? (
          <div className="w-full h-[280px] flex items-end justify-between px-2 pt-8">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex gap-[2px] items-end h-full w-[18px]">
                <div 
                  className="w-[8px] bg-muted/40 animate-shimmer rounded-t-[2px]" 
                  style={{ height: `${30 + Math.random() * 40}%` }} 
                />
                <div 
                  className="w-[8px] bg-primary/20 animate-shimmer rounded-t-[2px]" 
                  style={{ height: `${40 + Math.random() * 50}%` }} 
                />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="h-[280px] flex items-center justify-center text-muted-foreground">
            Error al cargar la comparativa anual
          </div>
        ) : !data || data.months.length === 0 ? (
          <div className="h-[280px] flex flex-col items-center justify-center text-center">
            <BarChartIcon className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-subhead font-medium text-foreground">Sin datos históricos</p>
            <p className="text-footnote text-muted-foreground mt-1 max-w-[250px]">
              Requiere datos del año actual y anterior para comparar.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart 
              data={data.months} 
              margin={{ top: 20, right: 0, left: -20, bottom: 0 }} 
              barSize={8} 
              barGap={2} 
              barCategoryGap="30%"
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
              
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 500 }} 
                dy={10} 
              />
              
              <YAxis 
                tickFormatter={(val) => {
                  if (val === 0) return '0'
                  // Format large numbers in compact mode for axis if possible, or just raw formatting
                  return fmt(val, currency).split(',')[0] // Truncate decimals for clean Y-axis if any
                }} 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                width={80}
              />
              
              <RechartsTooltip content={<YoYTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
              
              <Bar 
                dataKey="previousYear.expenses" 
                fill="hsl(var(--muted-foreground)/0.4)" 
                radius={[2, 2, 0, 0]} 
                isAnimationActive={true}
              />
              
              <Bar 
                dataKey="currentYear.expenses" 
                fill="hsl(var(--primary))" 
                radius={[2, 2, 0, 0]} 
                isAnimationActive={true}
              >
                <LabelList 
                  dataKey="currentYear.expenses" 
                  content={<DeltaLabel data={data.months} />} 
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
