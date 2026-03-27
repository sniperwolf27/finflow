import { z } from 'zod'
import 'dotenv/config'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_PROVIDER: z.string().default('sqlite'),
  DATABASE_URL: z.string(),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_REDIRECT_URI: z.string(),
  ANTHROPIC_API_KEY: z.string(),
  CLAUDE_MODEL: z.string().default('claude-haiku-4-5-20251001'),
  SESSION_SECRET: z.string().min(32),
  TOKEN_ENCRYPTION_KEY: z.string().length(64),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
