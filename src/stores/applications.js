import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { apiRequest } from '@/services/api.js'

export const STAGES = ['applied', 'test', 'interview', 'offer', 'rejected']

export const STAGE_LABELS = {
  applied: '已投递',
  test: '笔试中',
  interview: '面试中',
  offer: '已拿 Offer',
  rejected: '已拒绝',
}

export const PRIORITY_LABELS = {
  high: '高',
  medium: '中',
  low: '低',
}

const VALID_STAGES = new Set(STAGES)
const VALID_PRIORITIES = new Set(['high', 'medium', 'low'])
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function isValidDateString(value) {
  if (!DATE_RE.test(value ?? '')) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
  )
}

export function daysUntilDeadline(deadline) {
  if (!deadline || !isValidDateString(deadline)) return null
  const today = new Date(`${todayStr()}T00:00:00.000Z`)
  const due = new Date(`${deadline}T00:00:00.000Z`)
  return Math.round((due - today) / 86_400_000)
}

export function urgencyLevel(deadline) {
  const days = daysUntilDeadline(deadline)
  if (days === null) return 'none'
  if (days < 0) return 'expired'
  if (days <= 3) return 'urgent'
  if (days <= 7) return 'warning'
  return 'safe'
}

function validatePayload(payload, requireAll = true) {
  const errors = []

  if (requireAll || 'company' in payload) {
    const v = (payload.company ?? '').trim()
    if (!v) errors.push('company 不能为空')
    else if (v.length > 50) errors.push('company 不能超过 50 字符')
  }

  if (requireAll || 'position' in payload) {
    const v = (payload.position ?? '').trim()
    if (!v) errors.push('position 不能为空')
    else if (v.length > 100) errors.push('position 不能超过 100 字符')
  }

  if (requireAll || 'stage' in payload) {
    if (!VALID_STAGES.has(payload.stage)) errors.push(`stage 非法值: ${payload.stage}`)
  }

  if (requireAll || 'priority' in payload) {
    if (!VALID_PRIORITIES.has(payload.priority)) errors.push(`priority 非法值: ${payload.priority}`)
  }

  if (requireAll || 'applyDate' in payload) {
    if (!isValidDateString(payload.applyDate)) errors.push('applyDate 必须是真实日期，格式 YYYY-MM-DD')
  }

  if ('deadline' in payload && payload.deadline !== null) {
    if (!isValidDateString(payload.deadline)) errors.push('deadline 必须是真实日期，格式 YYYY-MM-DD 或 null')
  }

  if ('notes' in payload && payload.notes && payload.notes.length > 500) {
    errors.push('notes 不能超过 500 字符')
  }

  return errors
}

function byStageMap(list) {
  const map = Object.fromEntries(STAGES.map((stage) => [stage, []]))
  for (const app of list) {
    if (map[app.stage]) map[app.stage].push(app)
  }
  for (const stage of STAGES) {
    map[stage].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  }
  return map
}

function applyColumnOrder(list, stage, orderedIds) {
  const orderMap = new Map(orderedIds.map((id, index) => [id, index]))
  return list.map((app) => {
    if (app.stage !== stage || !orderMap.has(app.id)) return app
    return { ...app, sortOrder: orderMap.get(app.id) }
  })
}

function optimisticRecord(payload) {
  const now = new Date().toISOString()
  return {
    id: `temp-${crypto.randomUUID()}`,
    company: payload.company.trim(),
    position: payload.position.trim(),
    stage: payload.stage,
    priority: payload.priority,
    applyDate: payload.applyDate,
    deadline: payload.deadline ?? null,
    link: payload.link ?? null,
    notes: (payload.notes ?? '').trim(),
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    pending: true,
  }
}

export const useApplicationsStore = defineStore('applications', () => {
  const applications = ref([])
  const loading = ref(false)
  const error = ref('')

  const byStage = computed(() => byStageMap(applications.value))

  const stats = computed(() => {
    const list = applications.value
    const total = list.length
    const interviewCount = list.filter((a) => a.stage === 'interview' || a.stage === 'offer').length
    const offerCount = list.filter((a) => a.stage === 'offer').length
    const urgentCount = list.filter((a) => {
      if (a.stage === 'rejected') return false
      const days = daysUntilDeadline(a.deadline)
      return days !== null && days <= 7
    }).length

    const byStageCount = Object.fromEntries(STAGES.map((s) => [s, 0]))
    for (const app of list) {
      if (app.stage in byStageCount) byStageCount[app.stage] += 1
    }

    return {
      total,
      byStage: byStageCount,
      interviewRate: total === 0 ? 0 : Number((interviewCount / total).toFixed(2)),
      offerCount,
      urgentCount,
    }
  })

  const urgentApps = computed(() =>
    applications.value.filter((app) => {
      if (app.stage === 'rejected') return false
      const days = daysUntilDeadline(app.deadline)
      return days !== null && days <= 3
    }),
  )

  function setError(e) {
    error.value = e?.message ?? '操作失败，请稍后重试'
  }

  async function fetchApplications() {
    loading.value = true
    error.value = ''
    try {
      applications.value = await apiRequest('/api/applications')
    } catch (e) {
      applications.value = []
      setError(e)
    } finally {
      loading.value = false
    }
  }

  function getById(id) {
    return applications.value.find((app) => app.id === id) ?? null
  }

  function createApplication(payload) {
    const errors = validatePayload(payload, true)
    if (errors.length > 0) throw new Error(errors.join('; '))

    error.value = ''
    const optimistic = optimisticRecord(payload)
    applications.value = [optimistic, ...applications.value]

    apiRequest('/api/applications', {
      method: 'POST',
      body: payload,
    })
      .then((created) => {
        applications.value = applications.value.map((app) =>
          app.id === optimistic.id ? created : app,
        )
      })
      .catch((e) => {
        applications.value = applications.value.filter((app) => app.id !== optimistic.id)
        setError(e)
      })

    return optimistic
  }

  async function updateApplication(id, patch) {
    const errors = validatePayload(patch, false)
    if (errors.length > 0) throw new Error(errors.join('; '))

    const updated = await apiRequest(`/api/applications/${id}`, {
      method: 'PATCH',
      body: patch,
    })
    applications.value = applications.value.map((app) => (app.id === id ? updated : app))
    return updated
  }

  async function deleteApplication(id) {
    await apiRequest(`/api/applications/${id}`, { method: 'DELETE' })
    applications.value = applications.value.filter((app) => app.id !== id)
  }

  async function moveToStage(id, stage, orderedIds = []) {
    if (!VALID_STAGES.has(stage)) throw new Error(`非法 stage: ${stage}`)

    const previous = applications.value
    applications.value = applications.value.map((app) =>
      app.id === id ? { ...app, stage, sortOrder: orderedIds.indexOf(id) } : app,
    )
    applications.value = applyColumnOrder(applications.value, stage, orderedIds)

    try {
      const updated = await apiRequest(`/api/applications/${id}/stage`, {
        method: 'PATCH',
        body: { stage, orderedIds },
      })
      applications.value = applications.value.map((app) => (app.id === id ? updated : app))
      applications.value = applyColumnOrder(applications.value, stage, orderedIds)
      return updated
    } catch (e) {
      applications.value = previous
      throw e
    }
  }

  async function reorderColumn(stage, orderedIds) {
    if (!VALID_STAGES.has(stage)) throw new Error(`非法 stage: ${stage}`)

    const previous = applications.value
    applications.value = applyColumnOrder(applications.value, stage, orderedIds)

    try {
      await apiRequest('/api/applications/reorder', {
        method: 'PATCH',
        body: { stage, orderedIds },
      })
    } catch (e) {
      applications.value = previous
      throw e
    }
  }

  function reset() {
    applications.value = []
    loading.value = false
    error.value = ''
  }

  return {
    applications,
    loading,
    error,
    byStage,
    stats,
    urgentApps,
    fetchApplications,
    getById,
    createApplication,
    updateApplication,
    deleteApplication,
    moveToStage,
    reorderColumn,
    reset,
  }
})
