import cron from 'node-cron'
import { prisma } from '../config/prisma'
import { syncUserEmails } from '../services/sync.service'

// Run every 15 minutes
export function startSyncJob() {
  cron.schedule('*/15 * * * *', async () => {
    console.log('[SyncJob] Starting scheduled email sync...')

    const users = await prisma.user.findMany({
      where: {
        gmailRefreshToken: { not: null },
      },
      select: { id: true, email: true },
    })

    console.log(`[SyncJob] Syncing ${users.length} connected user(s)`)

    for (const user of users) {
      try {
        const result = await syncUserEmails(user.id)
        console.log(
          `[SyncJob] User ${user.email}: scanned=${result.emailsScanned} created=${result.txCreated} dupes=${result.txDuplicated} categorized=${result.txCategorized}`
        )
      } catch (err) {
        console.error(`[SyncJob] Failed for user ${user.email}:`, err)
      }
    }
  })

  console.log('[SyncJob] Scheduled email sync every 15 minutes')
}
