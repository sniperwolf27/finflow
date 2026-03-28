import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { useSpendingHeatmap } from '../../hooks/useAnalytics'
import { fmtRound as fmt } from '../../lib/currency'
import { Calendar, Activity } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'

export function SpendingHeatmap({ months, currency = 'USD' }: { months: number; currency?: string }) {
  const { data, isLoading, isError } = useSpendingHeatmap(months)

  // Memoize la matriz del heatmap
  const { matrix, maxAmount, orderedDays } = useMemo(() => {
    if (!data || data.byDayOfWeek.length === 0) {
      return { matrix: [], maxAmount: 0, orderedDays: [] }
    }

    // Ordenar días para que empiece en Lunes
    // byDayOfWeek asume 0=Domingo..6=Sábado desde el DB.
    // Queremos mostrar: Lun (1), Mar (2), Mie (3), Jue (4), Vie (5), Sab (6), Dom (0).
    const dowOrder = [1, 2, 3, 4, 5, 6, 0]
    const dayNamesObj: Record<number, string> = { 1:'Lun', 2:'Mar', 3:'Mié', 4:'Jue', 5:'Vie', 6:'Sáb', 0:'Dom' }
    
    const orderedDays = dowOrder.map(dayIdx => {
      const found = data.byDayOfWeek.find(d => d.dayIndex === dayIdx)
      return {
        day: found ? found.day : dayNamesObj[dayIdx],
        shortDay: dayNamesObj[dayIdx],
        avgAmount: found ? found.avgAmount : 0,
        total: found ? found.total : 0
      }
    })

    const totalOverall = orderedDays.reduce((acc, curr) => acc + curr.total, 0)
    let tempMaxAmount = 0
    
    // Generamos las 4 semanas x 7 días
    const matrix = Array.from({ length: 4 }).map((_, weekIdx) => {
      const w = weekIdx + 1
      const weekData = data.byWeekOfMonth.find(x => x.week === w)
      const weekTotal = weekData ? weekData.total : 0
      
      return orderedDays.map(d => {
        // Distribuimos estadísticamente el peso de la celda si no tenemos data granular X,Y
        const cellTotal = totalOverall > 0 ? (weekTotal * d.total) / totalOverall : 0
        if (cellTotal > tempMaxAmount) {
          tempMaxAmount = cellTotal
        }
        return {
          week: w,
          day: d.shortDay,
          amount: cellTotal
        }
      })
    })

    return { matrix, maxAmount: tempMaxAmount, orderedDays }
  }, [data])

  const getIntensityColor = (amount: number, max: number) => {
    if (amount <= 0 || max === 0) return 'bg-muted/30'
    const ratio = amount / max
    if (ratio < 0.33) return 'bg-[hsl(var(--expense)/0.25)]'
    if (ratio < 0.66) return 'bg-[hsl(var(--expense)/0.55)]'
    return 'bg-[hsl(var(--expense)/0.85)]'
  }

  return (
    <Card className="flex flex-col flex-1 h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-headline">Frecuencia de Gastos</CardTitle>
          <p className="text-footnote text-muted-foreground">Distribución a lo largo del mes</p>
        </div>
        {data?.peakDay && (
          <div className="px-3 py-1 rounded-full bg-expense-subtle text-expense text-caption font-medium border border-[hsl(var(--expense)/0.2)]">
            Día más activo: {data.peakDay}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-6 space-y-8">
        {isLoading ? (
          <>
            {/* Skeleton Grid */}
            <div className="grid grid-cols-[auto_1fr] gap-3">
              <div className="w-8" />
              <div className="grid grid-cols-7 gap-1 md:gap-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="h-4 animate-shimmer rounded bg-muted/50" />
                ))}
              </div>
              {Array.from({ length: 4 }).map((_, r) => (
                <React.Fragment key={`row-${r}`}>
                  <div className="h-6 w-8 animate-shimmer rounded bg-muted/50" />
                  <div className="grid grid-cols-7 gap-1 md:gap-2">
                    {Array.from({ length: 7 }).map((_, c) => (
                      <div key={`cell-${r}-${c}`} className="aspect-square animate-shimmer rounded-md bg-muted/30" />
                    ))}
                  </div>
                </React.Fragment>
              ))}
            </div>
            {/* Skeleton Bars */}
            <div className="flex-1 min-h-[160px] animate-shimmer rounded bg-muted/20" />
          </>
        ) : isError ? (
           <div className="flex-1 flex items-center justify-center text-muted-foreground">Error al cargar datos</div>
        ) : !data || matrix.length === 0 || maxAmount === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <Calendar className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-subhead font-medium text-foreground">Sin datos de frecuencia</p>
            <p className="text-footnote text-muted-foreground mt-1 max-w-[200px]">
              No hay transacciones suficientes para generar el mapa de calor.
            </p>
          </div>
        ) : (
          <TooltipProvider delayDuration={100}>
            {/* SECCIÓN 1 — Grid de semanas del mes */}
            <div className="grid grid-cols-[auto_1fr] gap-y-2 gap-x-3 items-center">
              {/* Espacio vacío para la esquina superior izquierda */}
              <div />
              
              {/* Header: Días (Lun-Dom) */}
              <div className="grid grid-cols-7 gap-1 md:gap-2 text-center text-caption font-medium text-muted-foreground pb-1">
                {orderedDays.map(d => (
                  <div key={d.shortDay}>{d.shortDay}</div>
                ))}
              </div>

              {/* Rows: Semanas + Celdas */}
              {matrix.map((weekRow, wIdx) => (
                <React.Fragment key={`w-${wIdx}`}>
                  {/* Etiqueta de semana (eje Y) */}
                  <div className="text-caption font-medium text-muted-foreground/70 text-right pr-1">
                    S{wIdx + 1}
                  </div>
                  
                  {/* Grid de celdas para esta semana */}
                  <div className="grid grid-cols-7 gap-1 md:gap-2">
                    {weekRow.map((cell, cIdx) => (
                      <Tooltip key={`c-${wIdx}-${cIdx}`}>
                        <TooltipTrigger asChild>
                          <div 
                            className={`aspect-square rounded-md transition-all sm:rounded-lg border border-transparent hover:border-border hover:ring-2 hover:ring-muted shadow-sm cursor-pointer ${getIntensityColor(cell.amount, maxAmount)}`}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-center">
                          <p className="text-caption font-semibold">{cell.day}, Sem {cell.week}</p>
                          <p className="text-footnote text-muted-foreground">Estimado: {fmt(cell.amount, currency)}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </React.Fragment>
              ))}
            </div>

            {/* SECCIÓN 2 — Barras horizontales por día de la semana */}
            <div className="flex-1 min-h-[220px] w-full mt-4">
              <h4 className="text-subhead font-semibold flex items-center gap-2 mb-4 text-muted-foreground">
                <Activity className="w-4 h-4" />
                Promedio por Día
              </h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={orderedDays} layout="vertical" margin={{ top: 0, right: 50, left: 10, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="shortDay" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 500 }} 
                    width={40}
                  />
                  <RechartsTooltip 
                    cursor={{ fill: 'hsl(var(--muted)/0.4)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-card text-card-foreground border border-border shadow-md rounded-lg p-2.5">
                            <p className="text-caption font-semibold mb-1">{payload[0].payload.day}</p>
                            <p className="text-footnote text-muted-foreground">Gastos: <span className="text-foreground font-medium">{fmt(payload[0].value as number, currency)}</span></p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="avgAmount" radius={[0, 4, 4, 0]} barSize={16}>
                    {orderedDays.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.day === data?.peakDay ? 'hsl(var(--expense))' : 'hsl(var(--expense) / 0.5)'} 
                        className="transition-all duration-300"
                      />
                    ))}
                    <LabelList 
                      dataKey="avgAmount" 
                      position="right" 
                      formatter={(val: number) => fmt(val, currency)} 
                      fill="hsl(var(--foreground))" 
                      fontSize={11} 
                      className="font-medium"
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  )
}
