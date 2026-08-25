import { all, get, run } from '../db/index.js'
import { money, now } from '../utils/index.js'
import { recordFinanceFlow } from './finance.js'

type OrderRow = {
  id: number
  memberId: number
  orderType: number
  payAmount: number
  packageLevel: number
}

type MemberChain = {
  id: number
  level: number
  inviterId: number | null
  secondInviterId: number | null
  thirdInviterId: number | null
}

const cfg = (key: string, fallback = '1') =>
  get<{ value: string }>('SELECT config_value AS value FROM system_config WHERE config_key = ?', key)?.value ?? fallback

const distributionEnabled = (level: number) =>
  cfg('distribution.enabled') !== '0' && cfg(`distribution.level_${level}`) !== '0'

const settleDays = () => Math.max(0, Number(cfg('commission.settle_days', '7')) || 0)

function addDays(dateText: string, days: number) {
  const date = new Date(dateText.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return now()
  date.setDate(date.getDate() + days)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function createPendingCommissions(orderId: number) {
  const order = get<OrderRow>(
    `SELECT id, member_id AS memberId, order_type AS orderType, pay_amount AS payAmount,
            COALESCE((SELECT member_level FROM order_item WHERE order_id = "order".id LIMIT 1), 0) AS packageLevel
     FROM "order" WHERE id = ?`,
    orderId,
  )
  if (!order || Number(order.orderType) !== 2 || Number(order.payAmount) <= 0) return
  if (get('SELECT id FROM commission WHERE order_id = ? LIMIT 1', orderId)) return

  const buyer = get<MemberChain>(
    'SELECT id, level, inviter_id AS inviterId, second_inviter_id AS secondInviterId, third_inviter_id AS thirdInviterId FROM member WHERE id = ?',
    order.memberId,
  )
  if (!buyer || Number(order.packageLevel) <= 0) return

  const chain = [
    { level: 1, memberId: buyer.inviterId },
    { level: 2, memberId: buyer.secondInviterId },
    { level: 3, memberId: buyer.thirdInviterId },
  ]

  for (const item of chain) {
    if (!item.memberId || !distributionEnabled(item.level)) continue
    const rule = get<{ rate: number }>(
      'SELECT rate FROM commission_rule WHERE package_level = ? AND distribution_level = ? AND status = 1',
      order.packageLevel, item.level,
    )
    const rate = Number(rule?.rate ?? 0)
    const amount = money(Number(order.payAmount) * rate / 100)
    if (amount <= 0) continue
    run(
      `INSERT INTO commission (member_id, source_member_id, order_id, package_level, distribution_level, rate, amount, status, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      item.memberId, buyer.id, order.id, order.packageLevel, item.level, rate, amount, now(), now(),
    )
  }
}

export function settleOrderCommissions(orderId: number) {
  const rows = all<{ id: number; memberId: number; amount: number; orderNo: string }>(
    `SELECT c.id, c.member_id AS memberId, c.amount, o.order_no AS orderNo
     FROM commission c JOIN "order" o ON o.id = c.order_id
     WHERE c.order_id = ? AND c.status = 0
       AND c.settlement_due_time IS NOT NULL AND c.settlement_due_time <= ?`,
    orderId, now(),
  )
  const ts = now()
  for (const row of rows) {
    run('UPDATE commission SET status = 1, settle_time = ?, update_time = ? WHERE id = ?', ts, ts, row.id)
    run(
      'UPDATE wallet SET balance = balance + ?, total_income = total_income + ?, update_time = ? WHERE member_id = ?',
      Number(row.amount), Number(row.amount), ts, row.memberId,
    )
    recordFinanceFlow(3, -Number(row.amount), row.orderNo, `佣金结算支出：会员 ${row.memberId}`)
  }
}

export function scheduleOrderCommissions(orderId: number) {
  const order = get<{ finishTime: string | null }>('SELECT finish_time AS finishTime FROM "order" WHERE id = ?', orderId)
  const dueTime = addDays(order?.finishTime || now(), settleDays())
  run(
    'UPDATE commission SET settlement_due_time = ?, update_time = ? WHERE order_id = ? AND status = 0 AND settlement_due_time IS NULL',
    dueTime, now(), orderId,
  )
  settleOrderCommissions(orderId)
}

export function settleDueCommissions() {
  const rows = all<{ orderId: number }>(
    'SELECT DISTINCT order_id AS orderId FROM commission WHERE status = 0 AND settlement_due_time IS NOT NULL AND settlement_due_time <= ?',
    now(),
  )
  for (const row of rows) settleOrderCommissions(row.orderId)
}

export function forceSettleOrderCommissions(orderId: number) {
  run(
    'UPDATE commission SET settlement_due_time = COALESCE(settlement_due_time, ?), update_time = ? WHERE order_id = ? AND status = 0',
    now(), now(), orderId,
  )
  const rows = all<{ id: number; memberId: number; amount: number; orderNo: string }>(
    `SELECT c.id, c.member_id AS memberId, c.amount, o.order_no AS orderNo
     FROM commission c JOIN "order" o ON o.id = c.order_id
     WHERE c.order_id = ? AND c.status = 0`,
    orderId,
  )
  const ts = now()
  for (const row of rows) {
    run('UPDATE commission SET status = 1, settle_time = ?, update_time = ? WHERE id = ?', ts, ts, row.id)
    run(
      'UPDATE wallet SET balance = balance + ?, total_income = total_income + ?, update_time = ? WHERE member_id = ?',
      Number(row.amount), Number(row.amount), ts, row.memberId,
    )
    recordFinanceFlow(3, -Number(row.amount), row.orderNo, `佣金强制结算支出：会员 ${row.memberId}`)
  }
}

export function rollbackOrderCommissions(orderId: number, reason: string) {
  const rows = all<{ id: number; memberId: number; amount: number; status: number; orderNo: string }>(
    `SELECT c.id, c.member_id AS memberId, c.amount, c.status, o.order_no AS orderNo
     FROM commission c JOIN "order" o ON o.id = c.order_id
     WHERE c.order_id = ? AND c.status IN (0,1)`,
    orderId,
  )
  for (const row of rows) {
    const ts = now()
    if (Number(row.status) === 1) {
      run(
        `UPDATE wallet
         SET balance = CASE WHEN balance >= ? THEN balance - ? ELSE 0 END,
             total_income = CASE WHEN total_income >= ? THEN total_income - ? ELSE 0 END,
             update_time = ?
         WHERE member_id = ?`,
        Number(row.amount), Number(row.amount), Number(row.amount), Number(row.amount), ts, row.memberId,
      )
      recordFinanceFlow(3, Number(row.amount), row.orderNo, `佣金回滚冲正：${reason}`)
    }
    run('UPDATE commission SET status = 4, rollback_reason = ?, update_time = ? WHERE id = ?', reason, ts, row.id)
  }
}
