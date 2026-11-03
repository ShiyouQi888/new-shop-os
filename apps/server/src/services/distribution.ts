import { all, get, run, transaction } from '../db/index.js'
import { money, now } from '../utils/index.js'
import { lockFinanceLedger, recordFinanceFlow } from './finance.js'

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

const cfg = async (key: string, fallback = '1') =>
  ((await get<{ value: string }>('SELECT config_value AS value FROM system_config WHERE config_key = ?', key)))?.value ?? fallback

const distributionEnabled = async (level: number) =>
  await cfg('distribution.enabled') !== '0' && (await cfg(`distribution.level_${level}`)) !== '0'

const settleDays = async () => Math.max(0, Number((await cfg('commission.settle_days', '7'))) || 0)

function addDays(dateText: string, days: number) {
  const date = new Date(dateText.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return now()
  date.setDate(date.getDate() + days)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export async function createPendingCommissions(orderId: number) {
  const order = (await get<OrderRow>(
    `SELECT id, member_id AS memberId, order_type AS orderType, pay_amount AS payAmount,
            COALESCE((SELECT member_level FROM order_item WHERE order_id = "order".id LIMIT 1), 0) AS packageLevel
     FROM "order" WHERE id = ?`,
    orderId,
  ))
  if (!order || Number(order.orderType) !== 2 || Number(order.payAmount) <= 0) return
  if ((await get('SELECT id FROM commission WHERE order_id = ? LIMIT 1', orderId))) return

  const buyer = (await get<MemberChain>(
    'SELECT id, level, inviter_id AS inviterId, second_inviter_id AS secondInviterId, third_inviter_id AS thirdInviterId FROM member WHERE id = ?',
    order.memberId,
  ))
  if (!buyer || Number(order.packageLevel) <= 0) return

  const chain = [
    { level: 1, memberId: buyer.inviterId },
    { level: 2, memberId: buyer.secondInviterId },
    { level: 3, memberId: buyer.thirdInviterId },
  ]

  for (const item of chain) {
    if (!item.memberId || !(await distributionEnabled(item.level))) continue
    const rule = (await get<{ rate: number }>(
      'SELECT rate FROM commission_rule WHERE package_level = ? AND distribution_level = ? AND status = 1',
      order.packageLevel, item.level,
    ))
    const rate = Math.min(100, Math.max(0, Number(rule?.rate ?? 0)))
    const amount = money(Number(order.payAmount) * rate / 100)
    if (amount <= 0) continue
    await run(
      `INSERT INTO commission (member_id, source_member_id, order_id, package_level, distribution_level, rate, amount, status, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      item.memberId, buyer.id, order.id, order.packageLevel, item.level, rate, amount, now(), now(),
    )
  }
}

export async function settleOrderCommissions(orderId: number) {
  const rows = (await all<{ id: number; memberId: number; amount: number; orderNo: string }>(
    `SELECT c.id, c.member_id AS memberId, c.amount, o.order_no AS orderNo
     FROM commission c JOIN "order" o ON o.id = c.order_id
     WHERE c.order_id = ? AND c.status = 0
       AND c.settlement_due_time IS NOT NULL AND c.settlement_due_time <= ?`,
    orderId, now(),
  ))
  const ts = now()
  for (const row of rows) {
    await transaction(async () => {
      const changed = (await run(
        'UPDATE commission SET status = 1, settle_time = ?, update_time = ? WHERE id = ? AND status = 0 AND settlement_due_time <= ?',
        ts, ts, row.id, ts,
      ))
      if (Number(changed.changes) !== 1) return
      await recordFinanceFlow(3, -Number(row.amount), row.orderNo, `佣金结算支出：会员 ${row.memberId}`)
      await creditWallet(row.memberId, Number(row.amount), ts)
    })
  }
}

/** 钱包余额/累计收入统一走 money() 取整再写库，避免多笔结算/回滚长期累加产生浮点漂移（与 services/finance.ts 的口径保持一致） */
async function creditWallet(memberId: number, amount: number, ts: string) {
  const changed = (await run(
    'UPDATE wallet SET balance = balance + ?, total_income = total_income + ?, updated_at = ? WHERE member_id = ?',
    money(amount), money(amount), ts, memberId,
  ))
  if (Number(changed.changes) !== 1) throw new Error(`会员 ${memberId} 钱包不存在，佣金结算已回滚`)
}

export async function scheduleOrderCommissions(orderId: number) {
  const order = (await get<{ finishTime: string | null }>('SELECT finish_time AS finishTime FROM "order" WHERE id = ?', orderId))
  const dueTime = addDays(order?.finishTime || now(), (await settleDays()))
  await run(
    'UPDATE commission SET settlement_due_time = ?, update_time = ? WHERE order_id = ? AND status = 0 AND settlement_due_time IS NULL',
    dueTime, now(), orderId,
  )
  await settleOrderCommissions(orderId)
}

export async function settleDueCommissions() {
  const rows = (await all<{ orderId: number }>(
    'SELECT DISTINCT order_id AS orderId FROM commission WHERE status = 0 AND settlement_due_time IS NOT NULL AND settlement_due_time <= ?',
    now(),
  ))
  for (const row of rows) await settleOrderCommissions(row.orderId)
}

export async function forceSettleOrderCommissions(orderId: number) {
  await run(
    'UPDATE commission SET settlement_due_time = COALESCE(settlement_due_time, ?), update_time = ? WHERE order_id = ? AND status = 0',
    now(), now(), orderId,
  )
  const rows = (await all<{ id: number; memberId: number; amount: number; orderNo: string }>(
    `SELECT c.id, c.member_id AS memberId, c.amount, o.order_no AS orderNo
     FROM commission c JOIN "order" o ON o.id = c.order_id
     WHERE c.order_id = ? AND c.status = 0`,
    orderId,
  ))
  const ts = now()
  for (const row of rows) {
    await transaction(async () => {
      const changed = (await run('UPDATE commission SET status = 1, settle_time = ?, update_time = ? WHERE id = ? AND status = 0', ts, ts, row.id))
      if (Number(changed.changes) !== 1) return
      await recordFinanceFlow(3, -Number(row.amount), row.orderNo, `佣金强制结算支出：会员 ${row.memberId}`)
      await creditWallet(row.memberId, Number(row.amount), ts)
    })
  }
}

export async function rollbackOrderCommissions(orderId: number, reason: string) {
  const rows = (await all<{ id: number }>(
    'SELECT id FROM commission WHERE order_id = ? AND status IN (0,1)',
    orderId,
  ))
  for (const row of rows) {
    const ts = now()
    await transaction(async () => {
      const current = (await get<{ memberId: number; amount: number; status: number; orderNo: string }>(
        `SELECT c.member_id AS memberId, c.amount, c.status, o.order_no AS orderNo
         FROM commission c JOIN "order" o ON o.id = c.order_id
         WHERE c.id = ? AND c.order_id = ? AND c.status IN (0,1) FOR UPDATE OF c`,
        row.id, orderId,
      ))
      if (!current) return
      if (Number(current.status) === 1) {
        await lockFinanceLedger()
        // 若会员已将这笔佣金提现走，balance 可能已不足以扣回全额——账本只能按"实际追回"记账，
        // 否则会出现"账面显示全额冲正、实际平台资金已经付出去追不回来"的资金黑洞且无迹可查
        const wallet = (await get<{ balance: number }>('SELECT balance FROM wallet WHERE member_id = ? FOR UPDATE', current.memberId))
        const recovered = money(Math.min(Number(current.amount), Number(wallet?.balance ?? 0)))
        await run(
          `UPDATE wallet
           SET balance = balance - ?,
               total_income = CASE WHEN total_income >= ? THEN total_income - ? ELSE 0 END,
               updated_at = ?
           WHERE member_id = ?`,
          recovered, Number(current.amount), Number(current.amount), ts, current.memberId,
        )
        const shortfall = money(Number(current.amount) - recovered)
        const note = shortfall > 0 ? `${reason}（该会员余额不足，实际仅追回 ${recovered}，欠款 ${shortfall} 未收回）` : reason
        if (recovered > 0) await recordFinanceFlow(3, recovered, current.orderNo, `佣金回滚冲正：${note}`)
        await run('UPDATE commission SET status = 4, rollback_reason = ?, update_time = ? WHERE id = ? AND status = 1', note, ts, row.id)
      } else {
        await run('UPDATE commission SET status = 4, rollback_reason = ?, update_time = ? WHERE id = ? AND status = 0', reason, ts, row.id)
      }
    })
  }
}
