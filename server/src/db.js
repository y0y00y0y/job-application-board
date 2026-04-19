import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { config } from './config.js'

const { Pool } = pg

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.isProduction ? { rejectUnauthorized: false } : false,
})

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const schemaPath = path.resolve(__dirname, '../db/schema.sql')

export async function initDatabase() {
  const schema = fs.readFileSync(schemaPath, 'utf8')
  await pool.query(schema)
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
