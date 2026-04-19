import { createHash, randomBytes, randomUUID } from 'node:crypto'
import argon2 from 'argon2'
import { config } from './config.js'
import { query } from './db.js'
import { seedApplicationsForUser } from './applications.js'
import { isValidEmail, normalizeEmail, validatePassword } from './validators.js'

const SESSION_COOKIE = 'job_board_session'
const SESSION_DAYS = 7

function hashToken(token) {
  return createHash('sha256').update(`${token}.${config.sessionSecret}`).digest('hex')
}

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    createdAt: row.created_at,
  }
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: config.cookieSameSite,
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  }
}

async function createSession(res, userId) {
  const token = randomBytes(32).toString('base64url')
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)

  await query(
    'insert into sessions (id, user_id, token_hash, expires_at) values ($1,$2,$3,$4)',
    [randomUUID(), userId, tokenHash, expiresAt],
  )

  res.cookie(SESSION_COOKIE, token, cookieOptions())
}

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[SESSION_COOKIE]
    if (!token) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: '请先登录' } })

    const result = await query(
      `select users.id, users.email, users.created_at
       from sessions
       join users on users.id = sessions.user_id
       where sessions.token_hash = $1 and sessions.expires_at > now()`,
      [hashToken(token)],
    )

    if (result.rowCount === 0) {
      res.clearCookie(SESSION_COOKIE, { path: '/' })
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: '请先登录' } })
    }

    req.user = publicUser(result.rows[0])
    return next()
  } catch (e) {
    return next(e)
  }
}

export function registerAuthRoutes(app, loginLimiter) {
  app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({ success: true, data: req.user })
  })

  app.post('/api/auth/register', loginLimiter, async (req, res, next) => {
    let createdUserId = null
    try {
      const email = normalizeEmail(req.body.email)
      const password = String(req.body.password ?? '')

      if (!isValidEmail(email)) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: '邮箱格式不正确' } })
      }

      const passwordErrors = validatePassword(password)
      if (passwordErrors.length > 0) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: passwordErrors.join('; ') } })
      }

      const existing = await query('select id from users where email = $1', [email])
      if (existing.rowCount > 0) {
        return res.status(409).json({ success: false, error: { code: 'EMAIL_EXISTS', message: '该邮箱已注册' } })
      }

      const userId = randomUUID()
      const passwordHash = await argon2.hash(password, { type: argon2.argon2id })
      const created = await query(
        'insert into users (id, email, password_hash) values ($1,$2,$3) returning id, email, created_at',
        [userId, email, passwordHash],
      )
      createdUserId = userId
      await seedApplicationsForUser(userId)
      await createSession(res, userId)

      return res.status(201).json({ success: true, data: publicUser(created.rows[0]) })
    } catch (e) {
      if (typeof createdUserId === 'string') {
        await query('delete from users where id = $1', [createdUserId]).catch(() => null)
      }
      return next(e)
    }
  })

  app.post('/api/auth/login', loginLimiter, async (req, res, next) => {
    try {
      const email = normalizeEmail(req.body.email)
      const password = String(req.body.password ?? '')
      const genericError = { success: false, error: { code: 'INVALID_CREDENTIALS', message: '邮箱或密码不正确' } }

      const result = await query('select * from users where email = $1', [email])
      if (result.rowCount === 0) return res.status(401).json(genericError)

      const user = result.rows[0]
      const ok = await argon2.verify(user.password_hash, password)
      if (!ok) return res.status(401).json(genericError)

      await createSession(res, user.id)
      return res.json({ success: true, data: publicUser(user) })
    } catch (e) {
      return next(e)
    }
  })

  app.post('/api/auth/logout', async (req, res, next) => {
    try {
      const token = req.cookies?.[SESSION_COOKIE]
      if (token) await query('delete from sessions where token_hash = $1', [hashToken(token)])
      res.clearCookie(SESSION_COOKIE, { path: '/' })
      return res.status(204).end()
    } catch (e) {
      return next(e)
    }
  })
}
