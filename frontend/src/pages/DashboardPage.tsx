import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Store } from 'lucide-react'
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { fmtRound } from '../lib/currency'

import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Separator } from '../components/ui/separator'

import { HeroBanner } from '../components/dashboard/HeroBanner'
import { FinancialSummary } from '../components/dashboard/FinancialSummary'
import { InsightsPanel } from '../components/dashboard/InsightStrip'
import { SpendingAnalysis } from '../components/dashboard/SpendingAnalysis'
import { MonthlyTrendChart } from '../components/dashboard/MonthlyTrendChart'
import { DailyBarChart } from '../components/dashboard/DailyBarChart'
import { MonthlyForecast } from '../components/dashboard/MonthlyForecast'
import { TransactionTable } from '../components/transactions/TransactionTable'

import {
  useSummary,
  useCategoryBreakdown,
  useMonthlyEvolution,
  useDailyEvolution,
  useTopMerchants,
} from '../hooks/useDashboard'
import { useTransactions } from '../hooks/useTransactions'
import { useAuthStore } from '../store/auth.store'
import { generateInsights } from '../lib/insights'

type Period = '1M' | '3M' | '6M' | '12M'

const PERIOD_LABELS: Record<Period, string> = {
  '1M': '1 mes',
  '3M': '3 meses',
  '6M': '6 meses',
  '12M': '12 meses',
}

function computeDateRange(period: Period) {
  const today = new Date()
  if (period === '1M') {
    return {
      dateFrom: format(startOfMonth(today), 'yyyy-MM-dd'),
      dateTo:   format(endOfMonth(today), 'yyyy-MM-dd'),
      month:    format(today, 'yyyy-MM'),
    }
  }
  const days: Record<Exclude<Period, '1M'>, number> = { '3M': 90, '6M': 180, '12M': 365 }
  return {
    dateFrom: format(subDays(today, days[period as Exclude<Period, '1M'>]), 'yyyy-MM-dd'),
    dateTo:   format(today, 'yyyy-MM-dd'),
    month:    format(today, 'yyyy-MM'),
  }
}


export function DashboardPage() {
  const [period, setPeriod] = useState<Period>('1M')
  const { dateFrom, dateTo, month } = useMemo(() => computeDateRange(period), [period])

  const user = useAuthStore((s) => s.user)

  const { data: summary,    isLoading: summaryLoading } = useSummary(month)
  const { data: byCategory, isLoading: catLoading }     = useCategoryBreakdown({ dateFrom, dateTo })
  const { data: monthly,    isLoading: monthlyLoading } = useMonthlyEvolution(12)
  const { data: daily,      isLoading: dailyLoading }   = useDailyEvolution(month)
  const { data: topMerchants }                          = useTopMerchants()
  const { data: recent,     isLoading: txLoading }      = useTransactions({ limit: 5 })

  // Also fetch previous month for delta calculation
  const prevMonth = useMemo(() => format(subMonths(new Date(), 1), 'yyyy-MM'), [])
  const { data: prevSummary } = useSummary(prevMonth)

  const insights = useMemo(
    () => generateInsights(summary, byCategory, monthly),
    [summary, byCategory, monthly],
  )

  const currency = summary?.currency ?? 'USD'
  const totalExpenses = summary?.expenses ?? 0
  const fmtAmount = (n: number) => fmtRound(n, currency)

  // ── Hero banner data ──────────────────────────────────────────
  const netBalance = summary?.net ?? 0
  const balanceDelta = prevSummary ? netBalance - prevSummary.net : 0

  const savingsRate =
    summary && summary.income > 0
      ? ((summary.income - summary.expenses) / summary.income) * 100
      : null

  const prevSavingsRate =
    prevSummary && prevSummary.income > 0
      ? ((prevSummary.income - prevSummary.expenses) / prevSummary.income) * 100
      : null

  const savingsRateDelta =
    savingsRate !== null && prevSavingsRate !== null
      ? savingsRate - prevSavingsRate
      : 0

  // ── Previous month data for FinancialSummary deltas ───────────
  const previousMonthData = prevSummary
    ? { month: prevMonth, income: prevSummary.income, expenses: prevSummary.expenses, net: prevSummary.net }
    : undefined

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* ── Row 1: Hero Banner ── */}
      <div className="animate-fade-in-up stagger-1">
        <HeroBanner
          userName={user?.name}
          netBalance={netBalance}
          balanceDelta={balanceDelta}
          savingsRate={savingsRate}
          savingsRateDelta={savingsRateDelta}
          formatAmount={fmtAmount}
          isLoading={summaryLoading}
        />
      </div>

      {/* ── Row 2: Period tabs ── */}
      <div className="animate-fade-in-up stagger-2 flex justify-start">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <TabsTrigger key={p} value={p}>{PERIOD_LABELS[p]}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* ── Row 3: KPI Cards with deltas ── */}
      <div className="animate-fade-in-up stagger-3">
        <FinancialSummary
          data={summary}
          isLoading={summaryLoading}
          currency={currency}
          previousMonth={previousMonthData}
        />
      </div>

      {/* ── Row 4: Spending Analysis ── */}
      <div className="animate-fade-in-up stagger-4">
        <SpendingAnalysis
          data={byCategory}
          isLoading={catLoading}
          totalExpenses={totalExpenses}
          monthlyIncome={summary?.income ?? 0}
          currency={currency}
        />
      </div>

      {/* ── Row 5: Forecast + Charts ── */}
      <div className="animate-fade-in-up stagger-5 space-y-6">
        {period === '1M' && (
          <MonthlyForecast summary={summary} isLoading={summaryLoading} />
        )}
        {period === '1M' ? (
          <DailyBarChart
            data={daily}
            isLoading={dailyLoading}
            currency={currency}
            month={month}
          />
        ) : (
          <MonthlyTrendChart data={monthly} isLoading={monthlyLoading} currency={currency} />
        )}
      </div>

      {/* ── Row 6: Insights (moved down — context after data) ── */}
      <InsightsPanel insights={insights} />

      {/* ── Row 7: Top merchants + Quick stats ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Store size={14} className="text-muted-foreground" />
              <CardTitle>Comercios más frecuentes</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {!topMerchants?.length ? (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                <span className="text-2xl">🏪</span>
                <p className="text-footnote text-muted-foreground">Sin datos de comercios todavía</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {topMerchants.slice(0, 6).map((m, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-lg bg-secondary hover:bg-accent transition-colors duration-200"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-footnote font-extrabold text-primary shrink-0">
                      {(m.merchant || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-caption font-semibold text-foreground truncate">
                        {m.merchant || 'Desconocido'}
                      </p>
                      <p className="text-caption text-muted-foreground">
                        {m.count} {m.count === 1 ? 'transacción' : 'transacciones'}
                      </p>
                    </div>
                    <span className="text-caption font-bold text-foreground shrink-0">{fmtRound(m.total, currency)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Resumen rápido</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-0">
            {[
              {
                label: 'Total transacciones',
                value: recent?.total != null ? String(recent.total) : '—',
              },
              {
                label: 'Categoría con más gasto',
                value: byCategory?.length ? [...byCategory].sort((a, b) => b.total - a.total)[0].name : '—',
              },
              {
                label: 'Tasa de ahorro',
                value: savingsRate !== null ? `${savingsRate.toFixed(0)}%` : '—',
                highlight: savingsRate !== null
                  ? savingsRate >= 0 ? 'positive' : 'negative'
                  : undefined,
              },
              {
                label: 'Período activo',
                value: PERIOD_LABELS[period],
              },
            ].map(({ label, value, highlight }, i, arr) => (
              <div key={label}>
                <div className="flex items-center justify-between py-3">
                  <span className="text-caption text-muted-foreground">{label}</span>
                  <span className={
                    highlight === 'positive' ? 'text-footnote font-bold text-income'
                    : highlight === 'negative' ? 'text-footnote font-bold text-expense'
                    : 'text-footnote font-semibold text-foreground'
                  }>
                    {value}
                  </span>
                </div>
                {i < arr.length - 1 && <Separator />}
              </div>
            ))}
            <div className="pt-3">
              <Link to="/transactions" className="btn-secondary w-full justify-center text-caption">
                Ver todas las transacciones <ArrowRight size={12} />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 8: Recent transactions ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-headline text-foreground">Transacciones recientes</h2>
          <Link
            to="/transactions"
            className="text-caption text-primary hover:opacity-80 flex items-center gap-1 font-medium"
          >
            Ver todas <ArrowRight size={12} />
          </Link>
        </div>
        <TransactionTable
          transactions={recent?.items ?? []}
          isLoading={txLoading}
          total={recent?.total ?? 0}
          page={1}
          limit={5}
          onPageChange={() => {}}
        />
      </div>
    </div>
  )
}
