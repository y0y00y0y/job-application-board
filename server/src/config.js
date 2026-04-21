import dotenv from 'dotenv'

dotenv.config()

const isProduction = process.env.NODE_ENV === 'production'
const VERCEL_PREVIEW_ORIGIN = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i

export const config = {
  isProduction,
  port: Number(process.env.PORT ?? 3001),
  databaseUrl: process.env.DATABASE_URL,
  sessionSecret: process.env.SESSION_SECRET,
  clientOrigins: (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  cookieSameSite: process.env.COOKIE_SAME_SITE ?? (isProduction ? 'none' : 'lax'),
}

export function isAllowedOrigin(origin) {
  if (!origin) return true
  if (config.clientOrigins.includes(origin)) return true
  return VERCEL_PREVIEW_ORIGIN.test(origin)
}

export function assertConfig() {
  const missing = []
  if (!config.databaseUrl) missing.push('DATABASE_URL')
  if (!config.sessionSecret || config.sessionSecret.length < 24) {
    missing.push('SESSION_SECRET(至少24字符)')
  }
  if (missing.length > 0) {
    throw new Error(`缺少必要环境变量: ${missing.join(', ')}`)
  }
}
