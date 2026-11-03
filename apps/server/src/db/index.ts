// PostgreSQL connection, schema bootstrap, and shared async query helpers.
import { AsyncLocalStorage } from 'node:async_hooks'
import { Pool, types, type PoolClient, type QueryResult } from 'pg'
import { config } from '../config.js'
import { BUILTIN_ROLES } from '../permissions.js'
import { SCHEMA_SQL } from './schema.js'

// PostgreSQL NUMERIC is returned as text by node-postgres by default. The app
// uses JS arithmetic and rounds money at business boundaries, so normalize it.
types.setTypeParser(1700, (value) => Number(value))
types.setTypeParser(20, (value) => Number(value))

const pool = new Pool({
  ...(config.databaseUrl
    ? { connectionString: config.databaseUrl }
    : {
        host: config.pgHost,
        port: config.pgPort,
        database: config.pgDatabase,
        user: config.pgUser,
        password: config.pgPassword,
      }),
  max: config.pgPoolMax,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  ...(config.pgSslMode === 'disable'
    ? { ssl: false }
    : config.pgSslMode
      ? { ssl: { rejectUnauthorized: true } }
      : {}),
})

interface TransactionContext {
  client: PoolClient
  depth: number
}

const transactionContext = new AsyncLocalStorage<TransactionContext>()
let savepointSequence = 0

export interface RunResult {
  changes: number
  lastInsertRowid?: number
}

async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  sql: string,
  params: unknown[],
): Promise<QueryResult<T>> {
  const context = transactionContext.getStore()
  const executor = context?.client ?? pool
  const values = toSqlParams(params)
  const text = normalizeSql(sql)
  return executor.query<T>(text, values)
}

function normalizeSql(sql: string): string {
  let text = sql.trim().replace(/;\s*$/, '')
  const ignoreConflict = /^INSERT\s+OR\s+IGNORE\s+INTO\b/i.test(text)
  if (ignoreConflict) text = text.replace(/^INSERT\s+OR\s+IGNORE\s+INTO\b/i, 'INSERT INTO')
  text = quoteCamelCaseAliases(text)

  // Translate SQLite positional placeholders while leaving quoted text intact.
  let index = 0
  let output = ''
  let quote: "'" | '"' | null = null
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (quote) {
      output += ch
      if (ch === quote) {
        if (text[i + 1] === quote) output += text[++i]
        else quote = null
      } else if (ch === '\\' && quote === "'" && i + 1 < text.length) {
        output += text[++i]
      }
      continue
    }
    if (ch === "'" || ch === '"') {
      quote = ch
      output += ch
    } else if (ch === '?') {
      output += `$${++index}`
    } else {
      output += ch
    }
  }

  if (ignoreConflict && !/\bON\s+CONFLICT\b/i.test(output)) {
    const returningAt = output.search(/\s+RETURNING\b/i)
    if (returningAt >= 0) {
      output = `${output.slice(0, returningAt)} ON CONFLICT DO NOTHING${output.slice(returningAt)}`
    } else {
      output += ' ON CONFLICT DO NOTHING'
    }
  }
  return output
}

/** PostgreSQL folds unquoted aliases to lowercase; preserve the camelCase API aliases used by the old query layer. */
function quoteCamelCaseAliases(sql: string): string {
  let output = ''
  let quote: "'" | '"' | null = null
  for (let i = 0; i < sql.length;) {
    const ch = sql[i]
    if (quote) {
      output += ch
      if (ch === quote) {
        if (sql[i + 1] === quote) output += sql[++i]
        else quote = null
      } else if (ch === '\\' && quote === "'" && i + 1 < sql.length) {
        output += sql[++i]
      }
      i += 1
      continue
    }
    if (ch === "'" || ch === '"') {
      quote = ch
      output += ch
      i += 1
      continue
    }
    const alias = sql.slice(i).match(/^AS\s+([A-Za-z_][A-Za-z0-9_]*)\b/i)
    if (alias) {
      const name = alias[1]
      output += `AS ${/[A-Z]/.test(name.slice(1)) ? `"${name}"` : name}`
      i += alias[0].length
      continue
    }
    output += ch
    i += 1
  }
  return output
}

function toSqlParams(params: unknown[]): unknown[] {
  return params.map((value) => {
    if (value === undefined) return null
    if (typeof value === 'boolean') return value ? 1 : 0
    return value
  })
}

/** Initialize all tables and idempotent additions before the HTTP server listens. */
export async function initializeDatabase(options: { seedDefaults?: boolean } = {}): Promise<void> {
  const statements = SCHEMA_SQL.split(';').map((statement) => statement.trim()).filter(Boolean)
  for (const statement of statements) await pool.query(statement)

  const migrations: Array<[string, string]> = [
    ['member', "real_name TEXT NOT NULL DEFAULT ''"],
    ['member', "register_time TEXT NOT NULL DEFAULT ''"],
    ['member', 'become_agent_time TEXT DEFAULT NULL'],
    ['member', 'level_expire_time TEXT DEFAULT NULL'],
    ['help_article', "scope TEXT NOT NULL DEFAULT 'help'"],
    ['withdraw', 'pay_type INTEGER NOT NULL DEFAULT 0'],
    ['withdraw', "alipay_name TEXT NOT NULL DEFAULT ''"],
    ['withdraw', "alipay_account TEXT NOT NULL DEFAULT ''"],
    ['withdraw', "bank_holder TEXT NOT NULL DEFAULT ''"],
    ['product_sku', 'market_price NUMERIC(14,2) NOT NULL DEFAULT 0'],
    ['product_sku', 'cost_price NUMERIC(14,2) NOT NULL DEFAULT 0'],
    ['commission', 'settlement_due_time TEXT DEFAULT NULL'],
    ['commission', 'settle_time TEXT DEFAULT NULL'],
    ['"order"', "refund_reason TEXT NOT NULL DEFAULT ''"],
    ['"order"', 'refund_request_time TEXT DEFAULT NULL'],
    ['"order"', "refund_audit_remark TEXT NOT NULL DEFAULT ''"],
    ['"order"', 'refund_audit_time TEXT DEFAULT NULL'],
    ['resell_order', 'settle_time TEXT DEFAULT NULL'],
    ['resell_order', 'credit_id INTEGER REFERENCES credit_record(id)'],
    ['resell_order', 'auto_matched INTEGER NOT NULL DEFAULT 0'],
    ['work_order', "images TEXT NOT NULL DEFAULT '[]'"],
    ['work_order', 'priority INTEGER NOT NULL DEFAULT 1'],
    ['work_order', "reply_content TEXT NOT NULL DEFAULT ''"],
    ['work_order', "handler TEXT NOT NULL DEFAULT ''"],
    ['work_order', 'handle_time TEXT DEFAULT NULL'],
    ['work_order', 'close_time TEXT DEFAULT NULL'],
    ['promote_poster', 'qr_x DOUBLE PRECISION NOT NULL DEFAULT 38'],
    ['promote_poster', 'qr_y DOUBLE PRECISION NOT NULL DEFAULT 72'],
    ['promote_poster', 'qr_size DOUBLE PRECISION NOT NULL DEFAULT 24'],
    ['level_config', 'consumption_credit_rate NUMERIC(10,4) NOT NULL DEFAULT 0'],
    ['level_config', 'consumption_credit_months INTEGER NOT NULL DEFAULT 0'],
    ['level_config', 'consumption_resellable INTEGER NOT NULL DEFAULT 0'],
    ['credit_record', 'resellable_amount NUMERIC(14,2) NOT NULL DEFAULT 0'],
    ['credit_flow', 'order_id INTEGER DEFAULT NULL'],
  ]

  const existingMarketPrice = await pool.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = current_schema() AND table_name = 'product_sku' AND column_name = 'market_price'`,
  )
  for (const [table, definition] of migrations) {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${definition}`)
  }
  if (existingMarketPrice.rowCount === 0) {
    await pool.query('UPDATE product_sku SET market_price = original_price')
  }
  const stockType = await pool.query<{ udt_name: string }>(
    `SELECT udt_name FROM information_schema.columns
     WHERE table_schema = current_schema() AND table_name = 'product_sku' AND column_name = 'stock'`,
  )
  if (stockType.rows[0]?.udt_name === 'int4') {
    await pool.query('ALTER TABLE product_sku ALTER COLUMN stock TYPE BIGINT')
  }

  await pool.query(
    `UPDATE system_config SET config_group = 'consumption_credit'
     WHERE config_key IN ('consumption_credit.enabled', 'consumption_credit.normal_rate')
       AND config_group <> 'consumption_credit'`,
  )
  await pool.query('CREATE INDEX IF NOT EXISTS idx_help_scope ON help_article(scope, status)')
  if (options.seedDefaults !== false) {
    await ensureBuiltinRoles()
    await ensureDemoData()
    await ensureAgentTimes()
  }
}

async function ensureBuiltinRoles(): Promise<void> {
  const ts = new Date().toISOString().slice(0, 19).replace('T', ' ')
  for (const role of BUILTIN_ROLES) {
    await run(
      `INSERT INTO admin_role (code, name, description, permissions, is_builtin, status, create_time, update_time)
       VALUES (?, ?, ?, ?, 1, 1, ?, ?)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description,
         permissions = EXCLUDED.permissions, is_builtin = 1, update_time = EXCLUDED.update_time`,
      role.code,
      role.name,
      role.description,
      JSON.stringify(role.permissions),
      ts,
      ts,
    )
  }
}

async function ensureDemoData(): Promise<void> {
  const member = await get<{ id: number }>('SELECT id FROM member WHERE phone = ?', '13810000000')
  if (!member) return
  const mid = member.id
  const addressCount = await get<{ c: number }>('SELECT COUNT(*) AS c FROM member_address WHERE member_id = ?', mid)
  if (Number(addressCount?.c) === 0) {
    await run('INSERT INTO member_address (member_id, name, phone, province, city, district, detail, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, 1)', mid, '张伟', '13810000000', '广东省', '深圳市', '南山区', '科技园路 1 号 8 栋 302')
    await run('INSERT INTO member_address (member_id, name, phone, province, city, district, detail, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, 0)', mid, '张伟', '13810000000', '广东省', '深圳市', '福田区', '中心路 88 号 2 单元 1201')
  }
  const notificationCount = await get<{ c: number }>('SELECT COUNT(*) AS c FROM member_notification WHERE member_id = ?', mid)
  if (Number(notificationCount?.c) === 0) {
    const notices = [
      ['order', '订单已发货', '你的订单已交由顺丰速运配送，请注意查收。', 0],
      ['commission', '佣金已结算', '本期分享佣金已完成结算，可在佣金明细中查看并申请提现。', 0],
      ['credit', '领货额度提醒', '本月领货额度将在月底到期，请及时使用。', 0],
      ['system', '欢迎加入', '欢迎成为会员，完善收货地址后可快速下单。', 1],
    ] as const
    for (const [type, title, content, isRead] of notices) {
      await run('INSERT INTO member_notification (member_id, type, title, content, is_read) VALUES (?, ?, ?, ?, ?)', mid, type, title, content, isRead)
    }
  }
  const favorites = await get<{ c: number }>('SELECT COUNT(*) AS c FROM member_favorite WHERE member_id = ?', mid)
  if (Number(favorites?.c) === 0) {
    await run('INSERT INTO member_favorite (member_id, spu_id) VALUES (?, ?) ON CONFLICT DO NOTHING', mid, 1)
    await run('INSERT INTO member_favorite (member_id, spu_id) VALUES (?, ?) ON CONFLICT DO NOTHING', mid, 3)
  }
  const history = await get<{ c: number }>('SELECT COUNT(*) AS c FROM member_browse WHERE member_id = ?', mid)
  if (Number(history?.c) === 0) {
    for (const spuId of [1, 3, 5]) await run('INSERT INTO member_browse (member_id, spu_id) VALUES (?, ?)', mid, spuId)
  }
}

async function ensureAgentTimes(): Promise<void> {
  await run(`UPDATE member SET become_agent_time = COALESCE(NULLIF(created_at, ''), ?)
    WHERE level > 0 AND (become_agent_time IS NULL OR become_agent_time = '')`, new Date().toISOString().slice(0, 19).replace('T', ' '))
  await run(`UPDATE member SET register_time = COALESCE(NULLIF(created_at, ''), ?)
    WHERE register_time = ''`, new Date().toISOString().slice(0, 19).replace('T', ' '))
}

/** Query all matching rows. SQL placeholders use the existing `?` convention. */
export async function all<T = Record<string, unknown>>(sql: string, ...params: unknown[]): Promise<T[]> {
  const result = await query(sql, params)
  return rowsToCamel(result.rows) as T[]
}

/** Query one row. */
export async function get<T = Record<string, unknown>>(sql: string, ...params: unknown[]): Promise<T | undefined> {
  return (await all<T>(sql, ...params))[0]
}

/** Execute a write and preserve the legacy `changes` / `lastInsertRowid` result shape. */
export async function run(sql: string, ...params: unknown[]): Promise<RunResult> {
  const isInsert = /^\s*INSERT\b/i.test(sql.replace(/^\s*INSERT\s+OR\s+IGNORE\s+INTO\b/i, 'INSERT INTO'))
  const hasReturning = /\bRETURNING\b/i.test(sql)
  const statement = isInsert && !hasReturning ? `${sql.trim().replace(/;\s*$/, '')} RETURNING id` : sql
  const result = await query(statement, params)
  const insertedId = isInsert ? result.rows[0]?.id : undefined
  return {
    changes: result.rowCount ?? 0,
    ...(insertedId === undefined ? {} : { lastInsertRowid: Number(insertedId) }),
  }
}

/** Run related financial/inventory changes in a PostgreSQL transaction. */
export async function transaction<T>(fn: () => Promise<T> | T): Promise<T> {
  const parent = transactionContext.getStore()
  if (parent) {
    const savepoint = `shop_os_sp_${++savepointSequence}`
    await parent.client.query(`SAVEPOINT ${savepoint}`)
    try {
      const value = await transactionContext.run({ client: parent.client, depth: parent.depth + 1 }, fn)
      await parent.client.query(`RELEASE SAVEPOINT ${savepoint}`)
      return value
    } catch (error) {
      await parent.client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`)
      await parent.client.query(`RELEASE SAVEPOINT ${savepoint}`)
      throw error
    }
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const value = await transactionContext.run({ client, depth: 0 }, fn)
    await client.query('COMMIT')
    return value
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/** Return a paginated query result. */
export async function paginate<T = Record<string, unknown>>(
  baseSql: string,
  countSql: string,
  params: unknown[],
  page: number,
  pageSize: number,
): Promise<{ list: T[]; total: number; page: number; pageSize: number }> {
  const count = await get<{ c: number | string }>(countSql, ...params)
  const list = await all<T>(`${baseSql} LIMIT ? OFFSET ?`, ...params, pageSize, (page - 1) * pageSize)
  return { list, total: Number(count?.c ?? 0), page, pageSize }
}

/** snake_case row keys → camelCase; aliases that are already camelCase remain unchanged. */
export function rowsToCamel(rows: unknown[]): Record<string, unknown>[] {
  if (!Array.isArray(rows)) return []
  return rows.filter((row) => row !== null && row !== undefined).map((row) => {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(row as Record<string, unknown>)) result[snakeToCamel(key)] = value
    return result
  })
}

export function snakeToCamel(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, character: string) => character.toUpperCase())
}

export async function closeDatabase(): Promise<void> {
  await pool.end()
}
