import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { env } from '../config/env'

export function buildContentHash(
  userId: string,
  amount: number,
  date: string,
  merchant: string
): string {
  const normalized = `${userId}|${amount.toFixed(2)}|${date}|${merchant.trim().toLowerCase()}`
  return createHash('sha256').update(normalized).digest('hex')
}

const ALGORITHM = 'aes-256-gcm'
const KEY = Buffer.from(env.TOKEN_ENCRYPTION_KEY, 'hex')

export function encrypt(text: string): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, KEY, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':')
}

export function decrypt(encoded: string): string {
  const [ivHex, authTagHex, encryptedHex] = encoded.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')
  const decipher = createDecipheriv(ALGORITHM, KEY, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}
