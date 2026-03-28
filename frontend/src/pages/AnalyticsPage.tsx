import React, { useState } from 'react'
import { SavingsTrendChart } from '../components/analytics/SavingsTrendChart'
import { CategoryTrendsChart } from '../components/analytics/CategoryTrendsChart'
import { SpendingHeatmap } from '../components/analytics/SpendingHeatmap'
import { YoYChart } from '../components/analytics/YoYChart'
import { TopMerchantsList } from '../components/analytics/TopMerchantsList'
import { SavingsProjectionChart } from '../components/analytics/SavingsProjectionChart'
import { useSummary } from '../hooks/useDashboard'
import { format } from 'date-fns'
import { cn } from '../lib/utils'

export function AnalyticsPage() {
  const currentMonth = format(new Date(), 'yyyy-MM')
  const { data: summary } = useSummary(currentMonth)
  const currency = summary?.currency ?? 'DOP'
  
  // Estado local compartido para el selector de período (Afecta a todos los sub-componentes excepto YoY que es siempre anual)
  const [months, setMonths] = useState<number>(6)

  const periods = [
    { label: '3M', value: 3 },
    { label: '6M', value: 6 },
    { label: '12M', value: 12 },
  ]

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8 pt-6 animate-fade-in-up">
      {/* Header & Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-large-title font-bold tracking-tight text-foreground">Analytics</h2>
          <p className="text-subhead text-muted-foreground mt-1">
            Perspectiva avanzada de tus finanzas
          </p>
        </div>

        <div className="flex flex-col items-start sm:items-end gap-1.5 self-start sm:self-auto">
          <div className="flex items-center bg-muted/40 p-1 rounded-lg border border-border/50 shadow-sm">
            {periods.map(p => (
              <button
                key={p.value}
                onClick={() => setMonths(p.value)}
                className={cn(
                  "px-4 py-1.5 text-footnote font-medium rounded-md transition-all duration-200",
                  months === p.value
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-muted-foreground/60 pr-1 tracking-tight">Montos en {currency}</span>
        </div>
      </div>

      {/* Analytics Dashboard Grid */}
      <div className="space-y-6">
        
        {/* Row 1: Tendencia de Ahorro */}
        <section>
          <SavingsTrendChart months={months} currency={currency} />
        </section>

        {/* Row 2: Tendencias por Categoría (2/3) y Top Comercios (1/3) */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CategoryTrendsChart months={months} currency={currency} />
          </div>
          <div className="lg:col-span-1">
            <TopMerchantsList months={months} currency={currency} />
          </div>
        </section>

        {/* Row 3: Mapa de Frecuencia de Gastos */}
        <section>
          <SpendingHeatmap months={months} currency={currency} />
        </section>

        {/* Row 4: Comparación Anual */}
        <section>
          <YoYChart currency={currency} />
        </section>
        
        {/* Row 5: Proyecciones de Ahorro (Feature 3) */}
        <section>
          <SavingsProjectionChart />
        </section>
      </div>
    </div>
  )
}

export default AnalyticsPage
