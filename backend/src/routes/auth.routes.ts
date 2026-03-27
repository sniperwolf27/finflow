import { Router } from 'express'
import { OAuth2Client } from 'google-auth-library'
import { env } from '../config/env'
import { prisma } from '../config/prisma'
import { encrypt } from '../utils/hash'
import { exchangeCodeForTokens, getAuthUrl } from '../services/gmail.service'
import { requireAuth } from '../middleware/auth.middleware'

const router = Router()

router.get('/google', (_req, res) => {
  res.redirect(getAuthUrl())
})

router.get('/google/callback', async (req, res) => {
  const { code, error } = req.query

  if (error || !code) {
    res.redirect(`${env.FRONTEND_URL}?error=oauth_failed`)
    return
  }

  try {
    const tokens = await exchangeCodeForTokens(code as string)

    // Decode id_token to get user info
    const idClient = new OAuth2Client()
    const ticket = await idClient.verifyIdToken({
      idToken: tokens.id_token!,
      audience: env.GOOGLE_CLIENT_ID,
    })
    const payload = ticket.getPayload()!

    const user = await prisma.user.upsert({
      where: { googleId: payload.sub },
      update: {
        email: payload.email!,
        name: payload.name || payload.email!,
        avatarUrl: payload.picture || null,
        gmailAccessToken: tokens.access_token ? encrypt(tokens.access_token) : undefined,
        gmailRefreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      },
      create: {
        googleId: payload.sub,
        email: payload.email!,
        name: payload.name || payload.email!,
        avatarUrl: payload.picture || null,
        gmailAccessToken: tokens.access_token ? encrypt(tokens.access_token) : null,
        gmailRefreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
    })

    req.session.userId = user.id
    res.redirect(`${env.FRONTEND_URL}/dashboard`)
  } catch (err) {
    console.error('[Auth] OAuth callback error:', err)
    res.redirect(`${env.FRONTEND_URL}?error=oauth_failed`)
  }
})

router.get('/me', requireAuth, (req, res) => {
  const { gmailAccessToken, gmailRefreshToken, ...safeUser } = req.user!
  res.json({
    ...safeUser,
    gmailConnected: !!(gmailAccessToken && gmailRefreshToken),
  })
})

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid')
    res.json({ ok: true })
  })
})

export default router
