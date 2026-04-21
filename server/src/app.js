import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { requireAuth, registerAuthRoutes } from './auth.js'
import { config, assertConfig, isAllowedOrigin } from './config.js'
import { initDatabase } from './db.js'
import {
  createApplication,
  deleteApplication,
  listApplications,
  moveToStage,
  reorderColumn,
  updateApplication,
} from './applications.js'
import { STAGES } from './validators.js'

assertConfig()

const app = express()

app.set('trust proxy', 1)
app.use(helmet())
app.use(express.json({ limit: '32kb' }))
app.use(cookieParser())
app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) return callback(null, true)
    return callback(new Error('CORS origin not allowed'))
  },
  credentials: true,
}))

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: '尝试次数过多，请稍后再试' },
  },
})

registerAuthRoutes(app, loginLimiter)

app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { ok: true } })
})

app.get('/api/applications', requireAuth, async (req, res, next) => {
  try {
    const data = await listApplications(req.user.id)
    res.json({ success: true, data })
  } catch (e) {
    next(e)
  }
})

app.post('/api/applications', requireAuth, async (req, res, next) => {
  try {
    const data = await createApplication(req.user.id, req.body)
    res.status(201).json({ success: true, data })
  } catch (e) {
    next(e)
  }
})

app.patch('/api/applications/reorder', requireAuth, async (req, res, next) => {
  try {
    const { stage, orderedIds } = req.body
    if (!STAGES.includes(stage) || !Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: '排序参数非法' } })
    }
    await reorderColumn(req.user.id, stage, orderedIds)
    return res.status(204).end()
  } catch (e) {
    return next(e)
  }
})

app.patch('/api/applications/:id/stage', requireAuth, async (req, res, next) => {
  try {
    const { stage, orderedIds = [] } = req.body
    if (!STAGES.includes(stage) || !Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: '阶段参数非法' } })
    }
    const data = await moveToStage(req.user.id, req.params.id, stage, orderedIds)
    return res.json({ success: true, data })
  } catch (e) {
    return next(e)
  }
})

app.patch('/api/applications/:id', requireAuth, async (req, res, next) => {
  try {
    const data = await updateApplication(req.user.id, req.params.id, req.body)
    res.json({ success: true, data })
  } catch (e) {
    next(e)
  }
})

app.delete('/api/applications/:id', requireAuth, async (req, res, next) => {
  try {
    await deleteApplication(req.user.id, req.params.id)
    res.status(204).end()
  } catch (e) {
    next(e)
  }
})

app.use((err, _req, res, _next) => {
  const status = err.status ?? 500
  if (status >= 500) console.error(err)
  res.status(status).json({
    success: false,
    error: {
      code: status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR',
      message: status >= 500 ? '服务器暂时不可用' : err.message,
      detail: config.isProduction ? undefined : err.message,
    },
  })
})

await initDatabase()

export default app
