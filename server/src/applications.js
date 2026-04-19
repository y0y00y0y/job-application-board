import { randomUUID } from 'node:crypto'
import { query, transaction } from './db.js'
import { validateApplication } from './validators.js'

const SEED_DATA = [
  ['华为', '软件工程师', 'test', 'high', '2026-04-12', '2026-04-20', null, '机试平台：牛客，时长 3 小时'],
  ['网易', '游戏策划', 'applied', 'medium', '2026-04-15', '2026-04-21', null, ''],
  ['字节跳动', '算法工程师', 'interview', 'high', '2026-04-10', '2026-04-22', null, '已过三面，等待 HR 面'],
  ['腾讯', '后端开发', 'test', 'high', '2026-04-14', '2026-04-24', null, '微信事业群'],
  ['滴滴', '后端工程师', 'interview', 'medium', '2026-04-13', '2026-04-26', null, '一面已过，等待二面通知'],
  ['阿里巴巴', '产品经理', 'applied', 'medium', '2026-04-16', '2026-04-29', null, '通过内推，HR 已收到简历'],
  ['京东', '运营专员', 'applied', 'low', '2026-04-17', '2026-05-05', null, ''],
  ['小米', '产品经理', 'applied', 'low', '2026-04-18', null, null, '招聘常年开放'],
  ['美团', '数据分析师', 'offer', 'high', '2026-03-20', null, null, 'Offer 已签，待入职'],
  ['百度', '前端工程师', 'rejected', 'medium', '2026-04-01', null, null, '笔试未通过'],
]

export function rowToApplication(row) {
  return {
    id: row.id,
    company: row.company,
    position: row.position,
    stage: row.stage,
    priority: row.priority,
    applyDate: row.apply_date?.toISOString?.().slice(0, 10) ?? row.apply_date,
    deadline: row.deadline?.toISOString?.().slice(0, 10) ?? row.deadline,
    link: row.link,
    notes: row.notes,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function seedApplicationsForUser(userId) {
  await transaction(async (client) => {
    for (const [index, item] of SEED_DATA.entries()) {
      await client.query(
        `insert into applications
          (id, user_id, company, position, stage, priority, apply_date, deadline, link, notes, sort_order)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [randomUUID(), userId, ...item, index],
      )
    }
  })
}

export async function listApplications(userId) {
  const result = await query(
    `select * from applications
     where user_id = $1
     order by stage, sort_order, created_at desc`,
    [userId],
  )
  return result.rows.map(rowToApplication)
}

export async function createApplication(userId, payload) {
  const errors = validateApplication(payload, true)
  if (errors.length > 0) {
    const error = new Error(errors.join('; '))
    error.status = 400
    throw error
  }

  const id = randomUUID()
  const sortResult = await query(
    'select coalesce(max(sort_order), -1) + 1 as next_order from applications where user_id = $1 and stage = $2',
    [userId, payload.stage],
  )
  const sortOrder = Number(sortResult.rows[0].next_order)

  const result = await query(
    `insert into applications
      (id, user_id, company, position, stage, priority, apply_date, deadline, link, notes, sort_order)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     returning *`,
    [
      id,
      userId,
      payload.company.trim(),
      payload.position.trim(),
      payload.stage,
      payload.priority,
      payload.applyDate,
      payload.deadline,
      payload.link || null,
      String(payload.notes ?? '').trim(),
      sortOrder,
    ],
  )
  return rowToApplication(result.rows[0])
}

export async function updateApplication(userId, id, patch) {
  const errors = validateApplication(patch, false)
  if (errors.length > 0) {
    const error = new Error(errors.join('; '))
    error.status = 400
    throw error
  }

  const currentResult = await query('select * from applications where id = $1 and user_id = $2', [id, userId])
  if (currentResult.rowCount === 0) {
    const error = new Error('申请记录不存在')
    error.status = 404
    throw error
  }

  const current = rowToApplication(currentResult.rows[0])
  const next = {
    company: patch.company !== undefined ? patch.company.trim() : current.company,
    position: patch.position !== undefined ? patch.position.trim() : current.position,
    stage: patch.stage ?? current.stage,
    priority: patch.priority ?? current.priority,
    applyDate: patch.applyDate ?? current.applyDate,
    deadline: patch.deadline === undefined ? current.deadline : patch.deadline,
    link: patch.link === undefined ? current.link : patch.link || null,
    notes: patch.notes !== undefined ? String(patch.notes).trim() : current.notes,
  }

  const result = await query(
    `update applications
     set company = $3, position = $4, stage = $5, priority = $6, apply_date = $7,
         deadline = $8, link = $9, notes = $10, updated_at = now()
     where id = $1 and user_id = $2
     returning *`,
    [id, userId, next.company, next.position, next.stage, next.priority, next.applyDate, next.deadline, next.link, next.notes],
  )
  return rowToApplication(result.rows[0])
}

export async function deleteApplication(userId, id) {
  const result = await query('delete from applications where id = $1 and user_id = $2', [id, userId])
  if (result.rowCount === 0) {
    const error = new Error('申请记录不存在')
    error.status = 404
    throw error
  }
}

export async function reorderColumn(userId, stage, orderedIds) {
  await transaction(async (client) => {
    for (const [index, id] of orderedIds.entries()) {
      await client.query(
        `update applications
         set sort_order = $4, updated_at = now()
         where id = $1 and user_id = $2 and stage = $3`,
        [id, userId, stage, index],
      )
    }
  })
}

export async function moveToStage(userId, id, stage, orderedIds) {
  const result = await transaction(async (client) => {
    const moved = await client.query(
      `update applications
       set stage = $3, sort_order = $4, updated_at = now()
       where id = $1 and user_id = $2
       returning *`,
      [id, userId, stage, Math.max(orderedIds.indexOf(id), 0)],
    )
    if (moved.rowCount === 0) {
      const error = new Error('申请记录不存在')
      error.status = 404
      throw error
    }

    for (const [index, orderedId] of orderedIds.entries()) {
      await client.query(
        `update applications
         set sort_order = $4, updated_at = now()
         where id = $1 and user_id = $2 and stage = $3`,
        [orderedId, userId, stage, index],
      )
    }

    const refreshed = await client.query('select * from applications where id = $1 and user_id = $2', [id, userId])
    return refreshed.rows[0]
  })

  return rowToApplication(result)
}
