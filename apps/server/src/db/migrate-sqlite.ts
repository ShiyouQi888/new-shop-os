import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'
import { config } from '../config.js'
import { closeDatabase, initializeDatabase } from './index.js'
import { SCHEMA_SQL } from './schema.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const defaultSqlitePath = path.resolve(here, '../../data/shop-os.db')
const sqlitePath = path.resolve(process.env.DB_FILE || defaultSqlitePath)
const tableNames = [...SCHEMA_SQL.matchAll(/CREATE TABLE IF NOT EXISTS\s+(?:"([^"]+)"|([A-Za-z_][\w]*))\s*\(/gi)]
  .map((match) => match[1] || match[2])

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`
}

async function migrate(): Promise<void> {
  const sqlite = new DatabaseSync(sqlitePath)
  const target = new Pool({
    ...(config.databaseUrl
      ? { connectionString: config.databaseUrl }
      : {
          host: config.pgHost,
          port: config.pgPort,
          database: config.pgDatabase,
          user: config.pgUser,
          password: config.pgPassword,
        }),
    max: 1,
    ...(config.pgSslMode === 'disable'
      ? { ssl: false }
      : config.pgSslMode
        ? { ssl: { rejectUnauthorized: true } }
        : {}),
  })

  try {
    await initializeDatabase({ seedDefaults: false })
    const client = await target.connect()
    try {
      const occupied: string[] = []
      for (const table of tableNames) {
        const result = await client.query(`SELECT COUNT(*)::int AS count FROM ${quoteIdentifier(table)}`)
        if (result.rows[0].count > 0) occupied.push(table)
      }
      if (occupied.length) {
        throw new Error(`目标 PostgreSQL 中已有数据，已停止导入以避免覆盖或错配：${occupied.join(', ')}`)
      }

      await client.query('BEGIN')
      const summary: Array<{ table: string; count: number }> = []
      for (const table of tableNames) {
        const sqliteColumns = (sqlite.prepare(`PRAGMA table_info(${quoteIdentifier(table)})`).all() as Array<{ name: string }>).map((column) => column.name)
        const pgColumns = await client.query<{ column_name: string }>(
          `SELECT column_name FROM information_schema.columns
           WHERE table_schema = current_schema() AND table_name = $1 ORDER BY ordinal_position`,
          [table],
        )
        const targetColumnNames = new Set(pgColumns.rows.map((column) => column.column_name))
        const columns = sqliteColumns.filter((column) => targetColumnNames.has(column))
        if (!columns.length) continue

        const rows = sqlite.prepare(`SELECT ${columns.map(quoteIdentifier).join(', ')} FROM ${quoteIdentifier(table)}`).all() as Array<Record<string, unknown>>
        for (const row of rows) {
          const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ')
          try {
            await client.query(
              `INSERT INTO ${quoteIdentifier(table)} (${columns.map(quoteIdentifier).join(', ')})
               VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
              columns.map((column) => row[column]),
            )
          } catch (error) {
            throw new Error(`导入表 ${table} 失败，目标表字段与旧库数据类型不兼容`, { cause: error })
          }
        }
        summary.push({ table, count: rows.length })
      }

      for (const table of tableNames) {
        const hasId = await client.query(
          `SELECT 1 FROM information_schema.columns
           WHERE table_schema = current_schema() AND table_name = $1 AND column_name = 'id'`,
          [table],
        )
        if (!hasId.rowCount) continue
        const sequence = await client.query<{ sequence_name: string | null }>(
          `SELECT pg_get_serial_sequence($1, 'id') AS sequence_name`,
          [table],
        )
        const sequenceName = sequence.rows[0]?.sequence_name
        if (!sequenceName) continue
        await client.query(
          `SELECT setval($1::regclass, COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM ${quoteIdentifier(table)}`,
          [sequenceName],
        )
      }

      await client.query('COMMIT')
      console.log(`[sqlite-migration] 从 ${sqlitePath} 导入完成：`)
      for (const item of summary) console.log(`[sqlite-migration]   ${item.table}: ${item.count}`)
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined)
      throw error
    } finally {
      client.release()
    }
  } finally {
    sqlite.close()
    await target.end()
    await closeDatabase()
  }
}

migrate().catch((error) => {
  console.error('[sqlite-migration] 导入失败：', error)
  process.exitCode = 1
})
