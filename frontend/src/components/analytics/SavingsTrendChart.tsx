import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { useSavingsTrend } from '../../hooks/useAnalytics'
import { fmtRound as fmt } from '../../lib/currency'
import { TrendingUp, TrendingDown, Minus, LineChart as LineChartIcon } from 'lucide-react'
import { AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

export function SavingsTrendChart({ months, currency = 'USD' }: { months: number; currency?: string }) {
  const { data, isLoading, isError } = useSavingsTrend(months)

  const gradientOffset = useMemo(() => {
    if (!data || data.months.length === 0) return 0
    const dataMax = Math.max(...data.months.map(i => i.net))
    const dataMin = Math.min(...data.months.map(i => i.net))
    if (dataMax <= 0) return 0
    if (dataMin >= 0) return 1
    return dataMax / (dataMax - dataMin)
  }, [data])

  const formatMonth = (mstr: string) => {
    const [y, m] = mstr.split('-')
    const mNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    return `${mNames[parseInt(m, 10) - 1]} ${y.slice(-2)}`
  }

  const chartData = useMemo(() => {
    if (!data) return []
    return data.months.map(m => ({
      ...m,
      monthLabel: formatMonth(m.month)
    }))
  }, [data])

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props
    if (!data || !cx || !cy) return null

    const isBest = payload.month === data.bestMonth?.month
    const isWorst = payload.month === data.worstMonth?.month

    if (isBest) {
      return (
        <g>
          <circle cx={cx} cy={cy} r={4.5} fill="hsl(var(--income))" stroke="hsl(var(--background))" strokeWidth={2} />
          <text x={cx} y={cy - 12} textAnchor="middle" fontSize={11} fill="hsl(var(--income))" fontWeight={600}>
            Mejor mes
          </text>
        </g>
      )
    }
    
    // Si caen en el mismo mes (ej. solo hay 1 mes válido), damos prioridad a Mejor mes y omitimos peor mes
    if (isWorst && !isBest) {
      return (
        <g>
          <circle cx={cx} cy={cy} r={4.5} fill="hsl(var(--expense))" stroke="hsl(var(--background))" strokeWidth={2} />
          <text x={cx} y={cy + 18} textAnchor="middle" fontSize={11} fill="hsl(var(--expense))" fontWeight={600}>
            Peor mes
          </text>
        </g>
      )
    }
    return null
  }

  const TrendTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length >= 3) {
      // payload: 0=NetArea, 1=Income, 2=Expenses (depende del orden de render)
      const point = payload[0].payload
      const isNegative = point.net < 0

      return (
        <div className={`border border-border shadow-md rounded-lg p-3 min-w-[210px] ${isNegative ? 'bg-expense-subtle/80 text-foreground' : 'bg-card text-card-foreground'}`}>
          <p className="text-subhead font-semibold mb-2">{point.monthLabel}</p>
          
          <div className="space-y-1.5 mb-2 pb-2 border-b border-border/50">
            <div className="flex justify-between items-center text-footnote">
              <span className="flex items-center gap-1.5 text-muted-foreground mr-4">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'hsl(var(--income))' }} />
                Ingresos
              </span>
              <span className="font-medium text-foreground">{fmt(point.income, currency)}</span>
            </div>
            <div className="flex justify-between items-center text-footnote">
              <span className="flex items-center gap-1.5 text-muted-foreground mr-4">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'hsl(var(--expense))' }} />
                Gastos
              </span>
              <span className="font-medium text-foreground">{fmt(point.expenses, currency)}</span>
            </div>
            <div className="flex justify-between items-center text-footnote">
              <span className="flex items-center gap-1.5 text-muted-foreground mr-4">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: isNegative ? 'hsl(var(--expense))' : 'hsl(var(--primary))' }} />
                Neto
              </span>
              <span className={`font-semibold ${isNegative ? 'text-expense' : 'text-primary'}`}>
                {fmt(point.net, currency)}
              </span>
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between items-center text-caption font-medium">
              <span className="text-muted-foreground">Ahorro:</span>
              <span className={isNegative ? 'text-expense' : 'text-income'}>{point.savingsRate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center text-caption font-medium">
              <span className="text-muted-foreground">Acumulado:</span>
              <span>{fmt(point.cumulativeNet, currency)}</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  const getTrendConfig = () => {
    if (!data) return { text: 'Calculando...', color: 'text-muted-foreground', Icon: Minus }
    switch (data.trend) {
      case 'improving': return { text: 'Mejorando', color: 'text-income', Icon: TrendingUp }
      case 'declining': return { text: 'Declinando', color: 'text-expense', Icon: TrendingDown }
      default: return { text: 'Estable', color: 'text-muted-foreground', Icon: Minus }
    }
  }

  const trendConfig = getTrendConfig()

  return (
    <Card className="flex flex-col w-full h-full">
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-headline">Tendencia de Ahorro</CardTitle>
            {data ? (
              <p className="text-footnote text-muted-foreground flex items-center gap-1.5">
                Tasa promedio:{' '}
                <span className={`font-medium ${data.avgSavingsRate >= 20 ? 'text-income' : data.avgSavingsRate < 0 ? 'text-expense' : 'text-primary'}`}>
                  {data.avgSavingsRate.toFixed(1)}%
                </span>
              </p>
            ) : (
              <div className="h-4 w-32 rounded bg-muted animate-shimmer" />
            )}
          </div>
          
          {!isLoading && data && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-caption font-medium bg-muted/10 ${trendConfig.color.replace('text', 'border')}/30 ${trendConfig.color}`}>
              <trendConfig.Icon className="w-3.5 h-3.5" />
              Tendencia: {trendConfig.text}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-6 pt-0 flex-1">
        {isLoading ? (
          <div className="w-full h-[320px] flex flex-col justify-end px-2 pb-6 space-y-4">
             {/* Skeleton path lines */}
             <div className="w-full h-[2px] bg-muted/40 animate-shimmer mb-10 transform -rotate-2" />
             <div className="w-full h-[2px] bg-muted/40 animate-shimmer mb-10 transform rotate-1" />
             <div className="w-full h-1/2 bg-muted/20 animate-shimmer rounded-t-xl" />
          </div>
        ) : isError ? (
          <div className="h-[320px] flex items-center justify-center text-muted-foreground">
            Error al cargar la tendencia de ahorro
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[320px] flex flex-col items-center justify-center text-center">
            <LineChartIcon className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-subhead font-medium text-foreground">Tu viaje financiero comienza aquí</p>
            <p className="text-footnote text-muted-foreground mt-1 max-w-[280px]">
              El historial se irá construyendo a medida que sumes nuevos ingresos y gastos mes a mes.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="splitColorArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset={gradientOffset} stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                  <stop offset={gradientOffset} stopColor="hsl(var(--expense))" stopOpacity={0.10} />
                </linearGradient>
                <linearGradient id="splitColorStroke" x1="0" y1="0" x2="0" y2="1">
                  <stop offset={gradientOffset} stopColor="hsl(var(--primary))" stopOpacity={1} />
                  <stop offset={gradientOffset} stopColor="hsl(var(--expense))" stopOpacity={1} />
                </linearGradient>
              </defs>
              
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
              
              <RechartsTooltip content={<TrendTooltip />} cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4' }} />
              
              <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="4 4" label={{ value: '0', position: 'right', fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />

              {/* Area y Línea para Neto usando el gradiente condicional + CustomDot */}
              <Area 
                type="monotone" 
                dataKey="net" 
                stroke="url(#splitColorStroke)" 
                strokeWidth={2.5}
                fill="url(#splitColorArea)" 
                activeDot={{ r: 5, strokeWidth: 0 }}
                dot={<CustomDot />}
                isAnimationActive={true}
              />
              
              <Line 
                type="monotone" 
                dataKey="income" 
                stroke="hsl(var(--income))" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: 'hsl(var(--income))', strokeWidth: 0 }}
              />
              
              <Line 
                type="monotone" 
                dataKey="expenses" 
                stroke="hsl(var(--expense))" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: 'hsl(var(--expense))', strokeWidth: 0 }}
              />

            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
