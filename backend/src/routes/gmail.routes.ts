import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware'
import { syncUserEmails } from '../services/sync.service'
import { revokeAccess } from '../services/gmail.service'
import { prisma } from '../config/prisma'

const router = Router()

router.use(requireAuth)

router.get('/status', async (req, res) => {
  const user = req.user!
  const lastSync = await prisma.syncLog.findFirst({
    where: { userId: user.id },
    orderBy: { startedAt: 'desc' },
  })

  res.json({
    connected: !!(user.gmailAccessToken && user.gmailRefreshToken),
    lastSyncAt: user.lastSyncAt,
    lastSyncStatus: lastSync?.status || null,
  })
})

router.post('/sync', async (req, res) => {
  const userId = req.user!.id

  // Run async, return immediately
  syncUserEmails(userId)
    .then((result) => console.log('[Sync] Completed:', result))
    .catch((err) => console.error('[Sync] Error:', err))

  res.json({ ok: true, message: 'Sync started' })
})

router.get('/sync/history', async (req, res) => {
  const logs = await prisma.syncLog.findMany({
    where: { userId: req.user!.id },
    orderBy: { startedAt: 'desc' },
    take: 20,
  })
  res.json(logs)
})

router.delete('/disconnect', async (req, res) => {
  await revokeAccess(req.user!.id)
  res.json({ ok: true })
})

export default router
