import { prisma } from '../config/prisma'
import { fetchNewEmails } from './gmail.service'
import { parseEmailContent } from './email-parser.service'
import { extractTransaction } from './claude.service'
import { createFromEmail, categorizeUncategorized } from './transaction.service'

export async function syncUserEmails(userId: string): Promise<{
  emailsScanned: number
  txCreated: number
  txDuplicated: number
  txCategorized: number
}> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })

  const syncLog = await prisma.syncLog.create({
    data: { userId, status: 'RUNNING' },
  })

  let emailsScanned = 0
  let txCreated = 0
  let txDuplicated = 0
  let txCategorized = 0

  try {
    const emails = await fetchNewEmails(userId, user.lastSyncAt || undefined)
    emailsScanned = emails.length

    for (const email of emails) {
      const parsed = parseEmailContent(email)
      const extracted = await extractTransaction(parsed)

      if (!extracted.found) continue

      const result = await createFromEmail(userId, extracted, email)
      if (result.created) txCreated++
      if (result.duplicate) txDuplicated++
    }

    // If no new emails came in, categorize existing transactions that lack a category
    if (emailsScanned === 0) {
      txCategorized = await categorizeUncategorized(userId)
    }

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        emailsScanned,
        txCreated,
        txDuplicated,
      },
    })

    await prisma.user.update({
      where: { id: userId },
      data: { lastSyncAt: new Date() },
    })
  } catch (err) {
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        emailsScanned,
        txCreated,
        txDuplicated,
        errorMessage: err instanceof Error ? err.message : String(err),
      },
    })
    throw err
  }

  return { emailsScanned, txCreated, txDuplicated, txCategorized }
}
