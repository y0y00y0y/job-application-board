import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { config } from './config.js'

const { Pool } = pg

function shouldUseSsl(connectionString) {
  if (config.isProduction) return true
  try {
    const url = new URL(connectionString)
    return url.searchParams.get('sslmode') === 'require'
  } catch {
    return false
  }
}

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: shouldUseSsl(config.databaseUrl) ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 15_000,
  idleTimeoutMillis: 30_000,
})

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const schemaPath = path.resolve(__dirname, '../db/schema.sql')

export async function initDatabase() {
  const schema = fs.readFileSync(schemaPath, 'utf8')
  try {
    await pool.query(schema)
  } catch (e) {
    if (e.code === 'ETIMEDOUT') {
      e.message = '连接 PostgreSQL 超时，请检查 DATABASE_URL、网络代理/防火墙，以及云数据库是否处于可连接状态'
    }
    throw e
  }
}

export async function query(text, params = []) {
  return pool.query(text, params)
}

export async function transaction(work) {
  const client = await pool.connect()
  try {
    await client.query('begin')
    const result = await work(client)
    await client.query('commit')
    return result
  } catch (e) {
    await client.query('rollback')
    throw e
  } finally {
    client.release()
  }
}
