// ===== 消费返还额度：购物消费按身份比例累加当月领货额度（是否支持转卖按身份配置） =====
import { get, run } from '../db/index.js'
import { money, now, monthOf } from '../utils/index.js'

const cfg = (key: string, fallback = '0') =>
  get<{ v: string }>('SELECT config_value AS v FROM system_config WHERE config_key = ?', key)?.v ?? fallback

interface ConsumptionRule {
  rate: number
  resellable: boolean
}

/** 普通会员读全局参数；代理商等级各自在 level_config 中配置（新增代理商身份自动生效，无需额外同步） */
function consumptionRuleFor(level: number): ConsumptionRule {
  if (level <= 0) {
    return {
      rate: Number(cfg('consumption_credit.normal_rate')) || 0,
      resellable: cfg('consumption_credit.normal_resellable') === '1',
    }
  }
  const row = get<{ rate: number; resellable: number }>(
    'SELECT consumption_credit_rate AS rate, consumption_resellable AS resellable FROM level_config WHERE level = ?',
    level,
  )
  return { rate: Number(row?.rate ?? 0), resellable: Number(row?.resellable ?? 0) === 1 }
}

/** 零售订单支付成功后，按会员当前身份的消费返还比例累加当月领货额度；是否计入可转卖额度按该身份配置决定 */
export function grantConsumptionCredit(orderId: number) {
  if (cfg('consumption_credit.enabled') !== '1') return
  const order = get<{ memberId: number; orderType: number; payAmount: number; orderNo: string }>(
    'SELECT member_id AS memberId, order_type AS orderType, pay_amount AS payAmount, order_no AS orderNo FROM "order" WHERE id = ?',
    orderId,
  )
  if (!order || Number(order.orderType) !== 1 || Number(order.payAmount) <= 0) return
  // 防止同一订单被重复发放（如支付新旧两条路径先后各触发一次支付完成逻辑）
  if (get('SELECT id FROM credit_flow WHERE order_id = ? AND type = 1 LIMIT 1', orderId)) return

  const member = get<{ level: number }>('SELECT level FROM member WHERE id = ?', order.memberId)
  if (!member) return
  const rule = consumptionRuleFor(Number(member.level))
  if (rule.rate <= 0) return

  const bonus = money(Number(order.payAmount) * rule.rate / 100)
  if (bonus <= 0) return

  const month = monthOf()
  const ts = now()
  const existing = get<{ id: number; usedAmount: number; remainAmount: number; resellableAmount: number }>(
    'SELECT id, used_amount AS usedAmount, remain_amount AS remainAmount, resellable_amount AS resellableAmount FROM credit_record WHERE member_id = ? AND month = ?',
    order.memberId, month,
  )
  let recordId: number
  let remain: number
  if (existing) {
    remain = money(Number(existing.remainAmount) + bonus)
    const resellable = rule.resellable ? money(Number(existing.resellableAmount ?? 0) + bonus) : Number(existing.resellableAmount ?? 0)
    const status = Number(existing.usedAmount) > 0 ? 1 : 0
    run(
      'UPDATE credit_record SET credit_amount = credit_amount + ?, remain_amount = ?, resellable_amount = ?, status = ?, update_time = ? WHERE id = ?',
      bonus, remain, resellable, status, ts, existing.id,
    )
    recordId = existing.id
  } else {
    const resellable = rule.resellable ? bonus : 0
    const rec = run(
      `INSERT INTO credit_record (member_id, month, credit_amount, used_amount, remain_amount, resellable_amount, status, remark, create_time)
       VALUES (?, ?, ?, 0, ?, ?, 0, ?, ?)`,
      order.memberId, month, bonus, bonus, resellable, '购物消费返还', ts,
    )
    recordId = Number(rec.lastInsertRowid)
    remain = bonus
  }
  run(
    'INSERT INTO credit_flow (record_id, member_id, change_amount, balance, type, reason, order_id, create_time) VALUES (?, ?, ?, ?, 1, ?, ?, ?)',
    recordId, order.memberId, bonus, remain, `购物消费返还：订单 ${order.orderNo}`, orderId, ts,
  )
}
