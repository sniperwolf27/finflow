import { Store } from 'lucide-react'
import { Card, CardContent } from '../ui/card'
import { useTopMerchants } from '../../hooks/useAnalytics'
import { fmtRound as fmt } from '../../lib/currency'

export function TopMerchantsList({ months, limit = 10, currency = 'USD' }: { months: number; limit?: number; currency?: string }) {
  const { data, isLoading, isError } = useTopMerchants(months, limit)

  return (
    <Card className="flex-1 flex flex-col">
      <div className="p-5 pb-3">
        <h3 className="text-title-3 font-semibold text-foreground tracking-tight">Top Comercios</h3>
        <p className="text-footnote text-muted-foreground mt-0.5">Basado en tus gastos de los últimos {months} meses</p>
      </div>
      <CardContent className="p-5 pt-2 flex-1 relative">
        {isLoading ? (
          <div className="space-y-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 animate-shimmer rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 animate-shimmer rounded" />
                  <div className="h-3 w-48 animate-shimmer rounded" />
                </div>
                <div className="h-4 w-16 animate-shimmer rounded shrink-0" />
              </div>
            ))}
          </div>
        ) : isError ? (
           <div className="py-8 text-center text-muted-foreground">Error al cargar datos</div>
        ) : !data || data.merchants.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-center h-full">
            <Store className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-subhead font-medium text-foreground">Sin transacciones</p>
            <p className="text-footnote text-muted-foreground mt-1 max-w-[200px]">
              No hay suficientes comercios registrados en este periodo.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {data.merchants.map((merchant, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                  style={{ backgroundColor: `${merchant.categoryColor}15`, color: merchant.categoryColor }}
                >
                  <Store className="w-5 h-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <p className="text-subhead font-medium text-foreground truncate mr-2 leading-none">
                       {merchant.name}
                    </p>
                    <p className="text-subhead font-bold text-foreground whitespace-nowrap leading-none">
                       {fmt(merchant.totalAmount, currency)}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-caption text-muted-foreground truncate flex-1">
                      {merchant.categoryName} • {merchant.transactionCount} txs
                    </span>
                    <span className="text-caption font-medium text-muted-foreground">
                      {merchant.percentOfTotal.toFixed(1)}%
                    </span>
                  </div>

                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500 ease-out" 
                      style={{ 
                        width: `${Math.min(merchant.percentOfTotal, 100)}%`,
                        backgroundColor: 'hsl(var(--expense))'
                      }} 
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
