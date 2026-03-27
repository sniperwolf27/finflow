import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Badge } from '../ui/Badge'
import { Separator } from '../ui/separator'
import { CategoryBreakdown } from '../../types/dashboard.types'
import { Spinner } from '../ui/Spinner'
import { fmtRound } from '../../lib/currency'

interface Props {
  data?: CategoryBreakdown[]
  isLoading: boolean
  currency?: string
}

/** Merge categories below `minPct`% of total into an "Otros" bucket to avoid tiny unreadable slices */
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

function CustomTooltip({ active, payload, currency }: { active?: boolean; payload?: { name: string; value: number; payload: CategoryBreakdown }[]; currency?: string }) {
  if (!active || !payload?.length) return null
  const entry = payload[0]
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-sm">
      <p className="font-semibold text-card-foreground">{entry.name}</p>
      <p className="text-muted-foreground">{fmtRound(entry.value, currency)}</p>
    </div>
  )
}

export function SpendingPieChart({ data, isLoading, currency = 'USD' }: Props) {
  const rawSorted = data ? [...data].sort((a, b) => b.total - a.total) : []
  const sorted = mergeSmallSlices(rawSorted, 3)  // group < 3% into "Otros"
  const total = sorted.reduce((s, c) => s + c.total, 0)
  // top is always the real top category (before merging), not "Otros"
  const top = rawSorted[0]
  const topPct = top && total > 0 ? Math.round((top.total / total) * 100) : 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm">¿En qué estoy gastando?</CardTitle>
            <CardDescription className="text-xs mt-0.5">Distribución de gastos por categoría</CardDescription>
          </div>
          {!isLoading && top && (
            <Badge variant={topPct > 40 ? 'warning' : 'secondary'} className="shrink-0">
              {topPct > 40 ? '⚠️ ' : ''}Mayor: {top.name}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        {isLoading ? (
          <div className="h-52 flex items-center justify-center">
            <Spinner className="h-8 w-8" />
          </div>
        ) : !sorted.length ? (
          <div className="h-52 flex flex-col items-center justify-center gap-2 text-center">
            <span className="text-3xl">🗂️</span>
            <p className="text-sm text-muted-foreground">No hay gastos en este período</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={sorted}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={82}
                  paddingAngle={3}
                  dataKey="total"
                  nameKey="name"
                  strokeWidth={0}
                >
                  {sorted.map((entry) => (
                    <Cell
                      key={entry.categoryId ?? entry.name}
                      fill={entry.color}
                      opacity={entry.categoryId === top?.categoryId ? 1 : 0.75}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip currency={currency} />} />
                <Legend
                  iconType="circle"
                  iconSize={7}
                  formatter={(value) => (
                    <span className="text-xs text-muted-foreground">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>

            {top && (
              <>
                <Separator className="my-3" />
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-foreground">
                      Tu mayor gasto es{' '}
                      <span style={{ color: top.color }} className="font-bold">
                        {top.name}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {fmtRound(top.total, currency)} — {topPct}% de tus gastos totales
                      {topPct > 35 && ' · Por encima de lo recomendado'}
                    </p>
                  </div>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ backgroundColor: top.color }}
                  >
                    {topPct}%
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
