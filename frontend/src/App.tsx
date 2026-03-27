import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { authApi } from './api/auth.api'
import { useAuthStore } from './store/auth.store'
import { AppShell } from './components/layout/AppShell'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { TransactionsPage } from './pages/TransactionsPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { AlertsPage } from './pages/AlertsPage'
import { SettingsPage } from './pages/SettingsPage'
import { SavingsGoalsPage } from './pages/SavingsGoalsPage'
import { BudgetPage } from './pages/BudgetPage'
import { Spinner } from './components/ui/Spinner'
import { ToastProvider } from './context/ToastContext'

function AuthGate({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading, user, isLoading } = useAuthStore()

  const { data, isLoading: queryLoading, isError } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.me,
    retry: false,
    staleTime: 5 * 60_000,
  })

  useEffect(() => {
    setLoading(queryLoading)
    if (data) setUser(data)
    if (isError) setUser(null)
  }, [data, queryLoading, isError, setUser, setLoading])

  if (isLoading || queryLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!user) return <LoginPage />

  return <>{children}</>
}

export default function App() {
  return (
    <ToastProvider>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route
          element={
            <AuthGate>
              <AppShell />
            </AuthGate>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/goals" element={<SavingsGoalsPage />} />
          <Route path="/budget" element={<BudgetPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </ToastProvider>
  )
}
