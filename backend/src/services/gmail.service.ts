import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import { env } from '../config/env'
import { prisma } from '../config/prisma'
import { decrypt, encrypt } from '../utils/hash'

export interface RawEmail {
  messageId: string
  threadId: string
  subject: string
  from: string
  date: Date
  textBody: string
  htmlBody: string
  snippet: string
}

export function createOAuth2Client(): OAuth2Client {
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  )
}

export function getAuthUrl(): string {
  const client = createOAuth2Client()
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'openid',
      'profile',
      'email',
      'https://www.googleapis.com/auth/gmail.readonly',
    ],
  })
}

export async function exchangeCodeForTokens(code: string) {
  const client = createOAuth2Client()
  const { tokens } = await client.getToken(code)
  return tokens
}

export async function getAuthenticatedClient(userId: string): Promise<OAuth2Client> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })

  if (!user.gmailAccessToken || !user.gmailRefreshToken) {
    throw new Error('Gmail not connected for this user')
  }

  const client = createOAuth2Client()
  client.setCredentials({
    access_token: decrypt(user.gmailAccessToken),
    refresh_token: decrypt(user.gmailRefreshToken),
    expiry_date: user.tokenExpiresAt?.getTime(),
  })

  // Auto-refresh token if expired
  client.on('tokens', async (tokens) => {
    const updates: Record<string, unknown> = {}
    if (tokens.access_token) updates.gmailAccessToken = encrypt(tokens.access_token)
    if (tokens.expiry_date) updates.tokenExpiresAt = new Date(tokens.expiry_date)
    if (Object.keys(updates).length > 0) {
      await prisma.user.update({ where: { id: userId }, data: updates })
    }
  })

  return client
}

const VOUCHER_QUERY = [
  '(receipt OR "order confirmation" OR payment OR invoice OR comprobante OR factura',
  'OR "thank you for your purchase" OR "your order" OR "payment confirmation"',
  'OR "transaction" OR "cargo" OR "cobro" OR "pago" OR "bank" OR "banco"',
  'OR "transferencia" OR "deposito" OR "débito" OR "crédito" OR "charge" OR "purchase")',
  'NOT label:spam',
].join(' ')

export async function fetchNewEmails(userId: string, since?: Date): Promise<RawEmail[]> {
  const auth = await getAuthenticatedClient(userId)
  const gmail = google.gmail({ version: 'v1', auth })

  let query = VOUCHER_QUERY
  if (since) {
    const epochSeconds = Math.floor(since.getTime() / 1000)
    query += ` after:${epochSeconds}`
  }

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 100,
  })

  const messages = listRes.data.messages || []
  if (messages.length === 0) return []

  const emails: RawEmail[] = []

  for (const msg of messages) {
    if (!msg.id) continue
    try {
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full',
      })

      const headers = detail.data.payload?.headers || []
      const getHeader = (name: string) =>
        headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || ''

      const subject = getHeader('Subject')
      const from = getHeader('From')
      const dateStr = getHeader('Date')

      let textBody = ''
      let htmlBody = ''

      function extractParts(parts: NonNullable<typeof detail.data.payload>['parts']) {
        if (!parts) return
        for (const part of parts) {
          const data = part.body?.data
          if (!data) {
            if (part.parts) extractParts(part.parts)
            continue
          }
          const decoded = Buffer.from(data, 'base64').toString('utf-8')
          if (part.mimeType === 'text/plain') textBody += decoded
          if (part.mimeType === 'text/html') htmlBody += decoded
          if (part.parts) extractParts(part.parts)
        }
      }

      if (detail.data.payload?.body?.data) {
        const decoded = Buffer.from(detail.data.payload.body.data, 'base64').toString('utf-8')
        if (detail.data.payload.mimeType === 'text/plain') textBody = decoded
        else htmlBody = decoded
      }
      extractParts(detail.data.payload?.parts)

      emails.push({
        messageId: msg.id,
        threadId: msg.threadId || '',
        subject,
        from,
        date: dateStr ? new Date(dateStr) : new Date(),
        textBody,
        htmlBody,
        snippet: detail.data.snippet || '',
      })
    } catch (err) {
      console.warn(`[Gmail] Failed to fetch message ${msg.id}:`, err)
    }
  }

  return emails
}

export async function revokeAccess(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user?.gmailAccessToken) return

  try {
    const client = createOAuth2Client()
    await client.revokeToken(decrypt(user.gmailAccessToken))
  } catch {
    // Ignore revoke errors
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      gmailAccessToken: null,
      gmailRefreshToken: null,
      tokenExpiresAt: null,
    },
  })
}
