export const STAGES = ['applied', 'test', 'interview', 'offer', 'rejected']
export const PRIORITIES = ['high', 'medium', 'low']

const VALID_STAGES = new Set(STAGES)
const VALID_PRIORITIES = new Set(PRIORITIES)
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase()
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email))
}

export function validatePassword(password) {
  const value = String(password ?? '')
  const errors = []
  if (value.length < 8) errors.push('密码至少 8 位')
  if (!/[A-Za-z]/.test(value)) errors.push('密码需要包含字母')
  if (!/\d/.test(value)) errors.push('密码需要包含数字')
  if (value.trim() !== value) errors.push('密码首尾不能有空格')
  return errors
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

export function validateApplication(payload, requireAll = true) {
  const errors = []

  if (requireAll || 'company' in payload) {
    const company = String(payload.company ?? '').trim()
    if (!company) errors.push('公司名称不能为空')
    if (company.length > 50) errors.push('公司名称不能超过 50 字符')
  }

  if (requireAll || 'position' in payload) {
    const position = String(payload.position ?? '').trim()
    if (!position) errors.push('申请岗位不能为空')
    if (position.length > 100) errors.push('申请岗位不能超过 100 字符')
  }

  if (requireAll || 'stage' in payload) {
    if (!VALID_STAGES.has(payload.stage)) errors.push('申请阶段非法')
  }

  if (requireAll || 'priority' in payload) {
    if (!VALID_PRIORITIES.has(payload.priority)) errors.push('优先级非法')
  }

  if (requireAll || 'applyDate' in payload) {
    if (!isValidDateString(payload.applyDate)) errors.push('投递日期非法')
  }

  if ('deadline' in payload && payload.deadline !== null) {
    if (!isValidDateString(payload.deadline)) errors.push('截止日期非法')
  }

  if ('link' in payload && payload.link) {
    try {
      new URL(payload.link)
    } catch {
      errors.push('招聘链接格式不正确')
    }
  }

  if ('notes' in payload && String(payload.notes ?? '').length > 500) {
    errors.push('备注不能超过 500 字符')
  }

  return errors
}
