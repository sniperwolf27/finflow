import 'dotenv/config'
import express from 'express'
import session from 'express-session'
import cors from 'cors'
import path from 'path'
import { env } from './config/env'
import { errorHandler } from './middleware/error.middleware'
import authRoutes from './routes/auth.routes'
import gmailRoutes from './routes/gmail.routes'
import transactionsRoutes from './routes/transactions.routes'
import categoriesRoutes from './routes/categories.routes'
import alertsRoutes from './routes/alerts.routes'
import dashboardRoutes from './routes/dashboard.routes'
import savingsGoalsRoutes from './routes/savings-goals.routes'
import budgetsRoutes from './routes/budgets.routes'
import { startSyncJob } from './jobs/email-sync.job'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SQLiteStore = require('connect-sqlite3')(session)

const app = express()

// ─── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: path.join(__dirname, '..', 'prisma') }),
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
  },
}))

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/gmail', gmailRoutes)
app.use('/api/transactions', transactionsRoutes)
app.use('/api/categories', categoriesRoutes)
app.use('/api/alerts', alertsRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/savings-goals', savingsGoalsRoutes)
app.use('/api/budgets', budgetsRoutes)

app.get('/api/health', (_req, res) => res.json({ ok: true, version: '1.0.0' }))

// ─── Error handler ───────────────────────────────────────────────────────────
app.use(errorHandler)

// ─── Start ──────────────────────────────────────────────────────────────────
app.listen(env.PORT, () => {
  console.log(`🚀 FinFlow API running on http://localhost:${env.PORT}`)
  if (env.NODE_ENV !== 'test') {
    startSyncJob()
  }
})

export default app
