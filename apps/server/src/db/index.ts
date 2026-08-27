// ===== 数据库连接与初始化 =====
import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { config } from '../config.js'
import { SCHEMA_SQL } from './schema.js'
import { BUILTIN_ROLES } from '../permissions.js'

fs.mkdirSync(path.dirname(config.dbFile), { recursive: true })

export const db = new DatabaseSync(config.dbFile)

// 开启外键约束；journal 用 DELETE 而非 WAL —— WAL 的 -wal/-shm 文件多次被系统进程（杀毒扫描）
// 锁成 readonly 导致写库失败；单机演示场景 DELETE 模式写直接锁主库，避免该问题
db.exec('PRAGMA journal_mode = DELETE;')
db.exec('PRAGMA foreign_keys = ON;')
db.exec(SCHEMA_SQL)

// ===== 轻量迁移：按需补充列（幂等）；返回本次是否新增，供依赖该列的一次性回填判断 =====
function ensureColumn(table: string, column: string, ddl: string): boolean {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  if (!cols.some(c => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`)
    console.log(`[db] 迁移：${table} 增加列 ${column}`)
    return true
  }
  return false
}
ensureColumn('member', 'real_name', "real_name TEXT NOT NULL DEFAULT ''")
ensureColumn('member', 'register_time', "register_time TEXT NOT NULL DEFAULT ''")
ensureColumn('member', 'become_agent_time', 'become_agent_time TEXT DEFAULT NULL')
ensureColumn('member', 'level_expire_time', 'level_expire_time TEXT DEFAULT NULL')
ensureColumn('help_article', 'scope', "scope TEXT NOT NULL DEFAULT 'help'")
// 提现单：收款方式（0 银行卡 / 1 支付宝）与支付宝账号、持卡人（老库迁移补列）
ensureColumn('withdraw', 'pay_type', 'pay_type INTEGER NOT NULL DEFAULT 0')
ensureColumn('withdraw', 'alipay_name', "alipay_name TEXT NOT NULL DEFAULT ''")
ensureColumn('withdraw', 'alipay_account', "alipay_account TEXT NOT NULL DEFAULT ''")
ensureColumn('withdraw', 'bank_holder', "bank_holder TEXT NOT NULL DEFAULT ''")
ensureColumn('commission', 'settlement_due_time', 'settlement_due_time TEXT DEFAULT NULL')
ensureColumn('commission', 'settle_time', 'settle_time TEXT DEFAULT NULL')
ensureColumn('resell_order', 'settle_time', 'settle_time TEXT DEFAULT NULL')
ensureColumn('resell_order', 'credit_id', 'credit_id INTEGER REFERENCES credit_record(id)')
ensureColumn('work_order', 'images', "images TEXT NOT NULL DEFAULT '[]'")
ensureColumn('work_order', 'priority', 'priority INTEGER NOT NULL DEFAULT 1')
ensureColumn('work_order', 'reply_content', "reply_content TEXT NOT NULL DEFAULT ''")
ensureColumn('work_order', 'handler', "handler TEXT NOT NULL DEFAULT ''")
ensureColumn('work_order', 'handle_time', 'handle_time TEXT DEFAULT NULL')
ensureColumn('work_order', 'close_time', 'close_time TEXT DEFAULT NULL')
// 推广海报：二维码在海报上的排版布局（百分比，老库迁移补列）
ensureColumn('promote_poster', 'qr_x', 'qr_x REAL NOT NULL DEFAULT 38')
ensureColumn('promote_poster', 'qr_y', 'qr_y REAL NOT NULL DEFAULT 72')
ensureColumn('promote_poster', 'qr_size', 'qr_size REAL NOT NULL DEFAULT 24')
// 消费返还额度：代理商等级的消费返还比例/有效月数/是否支持转卖、领货额度记录中可转卖部分
ensureColumn('level_config', 'consumption_credit_rate', 'consumption_credit_rate REAL NOT NULL DEFAULT 0')
ensureColumn('level_config', 'consumption_credit_months', 'consumption_credit_months INTEGER NOT NULL DEFAULT 0')
ensureColumn('level_config', 'consumption_resellable', 'consumption_resellable INTEGER NOT NULL DEFAULT 0')
if (ensureColumn('credit_record', 'resellable_amount', 'resellable_amount REAL NOT NULL DEFAULT 0')) {
  // 历史领货额度均来自入会礼包发放，一次性回填为可转卖，避免老代理商突然失去转卖权
  db.exec('UPDATE credit_record SET resellable_amount = remain_amount WHERE remain_amount > 0')
  console.log('[db] 迁移：历史领货额度回填 resellable_amount（视为可转卖）')
}
// 消费返还额度已独立成页，早期版本种下的两个 key 曾归在 credit 分组下，这里归位到 consumption_credit（幂等）
db.exec(
  "UPDATE system_config SET config_group = 'consumption_credit' " +
  "WHERE config_key IN ('consumption_credit.enabled', 'consumption_credit.normal_rate') AND config_group != 'consumption_credit'",
)
// scope 索引需在列存在后创建（旧表迁移场景）
db.exec('CREATE INDEX IF NOT EXISTS idx_help_scope ON help_article(scope, status)')

// ===== 演示账号补充数据（每次启动幂等：为空才插入，13810000000） =====
function ensureDemoData() {
  const mid = (db.prepare('SELECT id FROM member WHERE phone = ?').get('13810000000') as { id: number } | undefined)?.id
  if (!mid) return
  const addrC = (db.prepare('SELECT COUNT(*) AS c FROM member_address WHERE member_id = ?').get(mid) as { c: number }).c
  if (addrC === 0) {
    db.prepare('INSERT INTO member_address (member_id, name, phone, province, city, district, detail, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, 1)')
      .run(mid, '张伟', '13810000000', '广东省', '深圳市', '南山区', '科技园路 1 号 8 栋 302')
    db.prepare('INSERT INTO member_address (member_id, name, phone, province, city, district, detail, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, 0)')
      .run(mid, '张伟', '13810000000', '广东省', '深圳市', '福田区', '中心路 88 号 2 单元 1201')
    console.log('[db] 补种：演示收货地址')
  }
  const notifC = (db.prepare('SELECT COUNT(*) AS c FROM member_notification WHERE member_id = ?').get(mid) as { c: number }).c
  if (notifC === 0) {
    db.prepare('INSERT INTO member_notification (member_id, type, title, content, is_read) VALUES (?, ?, ?, ?, 0)')
      .run(mid, 'order', '订单已发货', '你的订单已交由顺丰速运配送，请注意查收。')
    db.prepare('INSERT INTO member_notification (member_id, type, title, content, is_read) VALUES (?, ?, ?, ?, 0)')
      .run(mid, 'commission', '佣金已结算', '本期分享佣金已完成结算，可在佣金明细中查看并申请提现。')
    db.prepare('INSERT INTO member_notification (member_id, type, title, content, is_read) VALUES (?, ?, ?, ?, 0)')
      .run(mid, 'credit', '领货额度提醒', '本月领货额度将在月底到期，请及时使用。')
    db.prepare('INSERT INTO member_notification (member_id, type, title, content, is_read) VALUES (?, ?, ?, ?, 1)')
      .run(mid, 'system', '欢迎加入', '欢迎成为会员，完善收货地址后可快速下单。')
    console.log('[db] 补种：演示通知')
  }
  const favC = (db.prepare('SELECT COUNT(*) AS c FROM member_favorite WHERE member_id = ?').get(mid) as { c: number }).c
  if (favC === 0) {
    db.prepare('INSERT OR IGNORE INTO member_favorite (member_id, spu_id) VALUES (?, ?)').run(mid, 1)
    db.prepare('INSERT OR IGNORE INTO member_favorite (member_id, spu_id) VALUES (?, ?)').run(mid, 3)
    console.log('[db] 补种：演示收藏')
  }
  const browseC = (db.prepare('SELECT COUNT(*) AS c FROM member_browse WHERE member_id = ?').get(mid) as { c: number }).c
  if (browseC === 0) {
    db.prepare('INSERT INTO member_browse (member_id, spu_id) VALUES (?, ?)').run(mid, 1)
    db.prepare('INSERT INTO member_browse (member_id, spu_id) VALUES (?, ?)').run(mid, 3)
    db.prepare('INSERT INTO member_browse (member_id, spu_id) VALUES (?, ?)').run(mid, 5)
    console.log('[db] 补种：演示浏览历史')
  }
}

// ===== 补种：系统配置（老库升级时补齐缺失 key，幂等） =====
function ensureSysConfig() {
  const cfg: [string, string, string, string][] = [
    ['credit.start_day', '1', 'credit', '月度领货额度发放日(每月几号)'],
    ['credit.expire_policy', 'void', 'credit', '到期策略：void 作废 / rollover 结转'],
    ['resell.service_fee_rate', '20', 'resell', '转卖服务费率(%)'],
    ['resell.shipping_type', 'fixed', 'resell', '快递费规则：fixed 固定 / buyer 买家承担'],
    ['resell.shipping_fee', '10', 'resell', '转卖固定快递费(元)'],
    ['resell.timeout_days', '30', 'resell', '转卖匹配超时天数'],
    ['resell.timeout_policy', 'auto_refund', 'resell', '超时策略：auto_refund 自动退款 / auto_settle 兜底结算'],
    ['distribution.enabled', '1', 'distribution', '分销总开关：1 开启 0 关闭'],
    ['distribution.level_1', '1', 'distribution', '一级分销开关：1 开启 0 关闭'],
    ['distribution.level_2', '1', 'distribution', '二级分销开关：1 开启 0 关闭'],
    ['distribution.level_3', '1', 'distribution', '三级分销开关：1 开启 0 关闭'],
    ['commission.settle_days', '7', 'distribution', '订单完成后佣金延迟结算天数'],
    ['site.domain', 'http://localhost:5174', 'basic', '站点访问域名（用于生成推广链接/海报二维码）'],
    ['payment.mode', 'mock', 'payment', '支付模式：mock 模拟 / real 真实网关'],
    ['payment.mock_auto_success', '1', 'payment', '模拟支付是否自动成功：1 是 / 0 否'],
    ['payment.wechat.enabled', '0', 'payment', '微信支付启用状态：1 启用 / 0 关闭'],
    ['payment.wechat.app_id', '', 'payment', '微信支付 AppID'],
    ['payment.wechat.mch_id', '', 'payment', '微信支付商户号'],
    ['payment.wechat.api_v3_key', '', 'payment', '微信支付 APIv3 密钥'],
    ['payment.wechat.cert_serial_no', '', 'payment', '微信支付证书序列号'],
    ['payment.wechat.notify_url', '', 'payment', '微信支付回调地址'],
    ['payment.alipay.enabled', '0', 'payment', '支付宝启用状态：1 启用 / 0 关闭'],
    ['payment.alipay.app_id', '', 'payment', '支付宝 AppID'],
    ['payment.alipay.merchant_private_key', '', 'payment', '支付宝应用私钥'],
    ['payment.alipay.alipay_public_key', '', 'payment', '支付宝公钥'],
    ['payment.alipay.gateway', 'https://openapi.alipay.com/gateway.do', 'payment', '支付宝网关地址'],
    ['payment.alipay.notify_url', '', 'payment', '支付宝回调地址'],
  ]
  const ins = db.prepare('INSERT OR IGNORE INTO system_config (config_key, config_value, config_group, description, update_time) VALUES (?, ?, ?, ?, ?)')
  for (const [k, v, g, d] of cfg) {
    ins.run(k, v, g, d, new Date().toISOString().slice(0, 19).replace('T', ' '))
  }
}

// ===== 补种：代理商入会时间（有等级但入会时间为空的会员，按创建时间填充） =====
function ensureAgentTimes() {  const rows = db.prepare(
    "SELECT id, created_at AS createdAt FROM member WHERE level > 0 AND (become_agent_time IS NULL OR become_agent_time = '')",
  ).all() as { id: number; createdAt: string }[]
  if (rows.length) {
    for (const r of rows) {
      const t = r.createdAt || new Date().toISOString().slice(0, 19).replace('T', ' ')
      db.prepare('UPDATE member SET become_agent_time = ? WHERE id = ?').run(t, r.id)
    }
    console.log(`[db] 补种：${rows.length} 位代理商入会时间`)
  }
  // 注册时间兜底（老数据 register_time 为空）
  const emptyReg = db.prepare("SELECT id, created_at AS createdAt FROM member WHERE register_time = ''").all() as { id: number; createdAt: string }[]
  if (emptyReg.length) {
    for (const r of emptyReg) {
      db.prepare('UPDATE member SET register_time = ? WHERE id = ?').run(r.createdAt || '', r.id)
    }
    console.log(`[db] 补种：${emptyReg.length} 位会员注册时间`)
  }
}
// ===== 补种：内置角色（幂等，老库升级时补充） =====
function ensureBuiltinRoles() {
  for (const b of BUILTIN_ROLES) {
    const exists = db.prepare('SELECT id FROM admin_role WHERE code = ?').get(b.code) as { id: number } | undefined
    if (exists) {
      db.prepare('UPDATE admin_role SET name = ?, description = ?, permissions = ? WHERE code = ?')
        .run(b.name, b.description, JSON.stringify(b.permissions), b.code)
    } else {
      db.prepare('INSERT INTO admin_role (code, name, description, permissions, is_builtin, status, create_time, update_time) VALUES (?, ?, ?, ?, 1, 1, ?, ?)')
        .run(b.code, b.name, b.description, JSON.stringify(b.permissions),
          new Date().toISOString().slice(0, 19).replace('T', ' '), new Date().toISOString().slice(0, 19).replace('T', ' '))
    }
  }
  console.log('[db] 补种：内置角色')
}

// ===== 补种：推广新手指南（幂等，老库升级时补充） =====
function ensurePromoteGuide() {
  const cnt = db.prepare("SELECT COUNT(*) AS c FROM help_article WHERE scope = 'help' AND category = 'promote'").get() as { c: number }
  if (cnt.c === 0) {
    const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ')
    const guides: [string, string, number][] = [
      ['分享你的专属推广链接', '在推广中心复制你的专属推广链接或保存海报，发送给好友。好友通过链接注册后，将自动成为你的下级会员。', 6],
      ['好友注册并购买大礼包', '好友通过你的链接注册后，在入会专区选购任意等级的大礼包并完成支付，即可成为代理商并为你产生佣金。', 7],
      ['佣金自动结算到账', '好友确认收货后 7 天，对应层级的分享佣金自动结算进入你的可提现余额，可在佣金明细中查看并申请提现。', 8],
    ]
    const ins = db.prepare('INSERT INTO help_article (scope, title, category, content, sort, status, create_time, update_time) VALUES (?, ?, ?, ?, ?, 1, ?, ?)')
    for (const [t, c, s] of guides) {
      ins.run('help', t, 'promote', c, s, nowStr, nowStr)
    }
    console.log('[db] 补种：推广新手指南')
  }
}

try {
  ensureDemoData()
  ensureSysConfig()
  ensureAgentTimes()
  ensureBuiltinRoles()
  ensurePromoteGuide()
} catch (e) {
  console.warn('[db] 演示数据补种跳过：', (e as Error).message)
}

// ===== 迁移：resell_order.order_id 改为可空（商城端转卖可不关联具体订单） + 增加 sku_name =====
function ensureResellOrderNullable() {
  const cols = db.prepare('PRAGMA table_info(resell_order)').all() as { name: string; notnull: number }[]
  const orderIdCol = cols.find(c => c.name === 'order_id')
  if (orderIdCol && orderIdCol.notnull === 1) {
    db.exec(`
      ALTER TABLE resell_order RENAME TO resell_order_old;
      CREATE TABLE resell_order (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        resell_no      TEXT    NOT NULL UNIQUE,
        member_id      INTEGER NOT NULL REFERENCES member(id),
        member_name    TEXT    NOT NULL DEFAULT '',
        credit_id      INTEGER REFERENCES credit_record(id),
        order_id       INTEGER REFERENCES "order"(id),
        order_no       TEXT    NOT NULL DEFAULT '',
        sku_name       TEXT    NOT NULL DEFAULT '',
        goods_value    REAL    NOT NULL DEFAULT 0,
        service_fee    REAL    NOT NULL DEFAULT 0,
        shipping_fee   REAL    NOT NULL DEFAULT 0,
        settle_amount  REAL    NOT NULL DEFAULT 0,
        status         INTEGER NOT NULL DEFAULT 0,
        match_order_id INTEGER DEFAULT NULL,
        match_time     TEXT    DEFAULT NULL,
        settle_time    TEXT    DEFAULT NULL,
        cancel_time    TEXT    DEFAULT NULL,
        create_time    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
      );
      INSERT INTO resell_order (id, resell_no, member_id, member_name, credit_id, order_id, order_no, sku_name, goods_value, service_fee, shipping_fee, settle_amount, status, match_order_id, match_time, settle_time, cancel_time, create_time)
        SELECT id, resell_no, member_id, member_name, NULL, order_id, order_no, '', goods_value, service_fee, shipping_fee, settle_amount, status, match_order_id, match_time, NULL, cancel_time, create_time FROM resell_order_old;
      DROP TABLE resell_order_old;
      CREATE INDEX IF NOT EXISTS idx_resell_member ON resell_order(member_id);
      CREATE INDEX IF NOT EXISTS idx_resell_status ON resell_order(status);
    `)
    console.log('[db] 迁移：resell_order.order_id 改为可空并新增 sku_name')
  } else {
    ensureColumn('resell_order', 'sku_name', "sku_name TEXT NOT NULL DEFAULT ''")
    ensureColumn('resell_order', 'settle_time', 'settle_time TEXT DEFAULT NULL')
    ensureColumn('resell_order', 'credit_id', 'credit_id INTEGER REFERENCES credit_record(id)')
  }
}
ensureResellOrderNullable()

/** 统一查询：返回 camelCase 行数组 */
export function all<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T[] {
  return rowsToCamel(db.prepare(sql).all(...toSqlParams(params))) as T[]
}

/** 查询单行 */
export function get<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T | undefined {
  return rowsToCamel([db.prepare(sql).get(...toSqlParams(params))]).at(0) as T | undefined
}

/** 执行写操作 */
export function run(sql: string, ...params: unknown[]) {
  return db.prepare(sql).run(...toSqlParams(params))
}

/** 分页查询：自动拼 LIMIT/OFFSET，返回 { list, total, page, pageSize } */
export function paginate<T = Record<string, unknown>>(
  baseSql: string,
  countSql: string,
  params: unknown[],
  page: number,
  pageSize: number,
): { list: T[]; total: number; page: number; pageSize: number } {
  const total = (db.prepare(countSql).get(...toSqlParams(params)) as { c: number }).c
  const rows = db.prepare(`${baseSql} LIMIT ? OFFSET ?`).all(...toSqlParams(params), pageSize, (page - 1) * pageSize)
  return { list: rowsToCamel(rows) as T[], total, page, pageSize }
}

/** undefined/boolean 等统一转为 SQLite 可接受类型 */
function toSqlParams(params: unknown[]): (string | number | null | bigint | Uint8Array)[] {
  return params.map((v) => {
    if (v === undefined) return null
    if (typeof v === 'boolean') return v ? 1 : 0
    return v as string | number | null | bigint | Uint8Array
  })
}

/** snake_case 行 → camelCase（递归转换 key） */
export function rowsToCamel(rows: unknown[]): Record<string, unknown>[] {
  if (!Array.isArray(rows)) return []
  return rows.filter((r) => r !== null && r !== undefined).map((r) => {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(r as Record<string, unknown>)) {
      out[snakeToCamel(k)] = v
    }
    return out
  })
}

export function snakeToCamel(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase())
}
