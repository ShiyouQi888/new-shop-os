// ===== 消费返还额度：购物消费按身份比例累加当月领货额度（是否支持转卖按身份配置） =====
import { get, run, transaction } from '../db/index.js'
import { money, now, monthOf } from '../utils/index.js'
import { badRequest } from '../utils/response.js'

const cfg = async (key: string, fallback = '0') =>
  ((await get<{ v: string }>('SELECT config_value AS v FROM system_config WHERE config_key = ?', key)))?.v ?? fallback

interface ConsumptionRule {
  rate: number
  resellable: boolean
}

/** 普通会员读全局参数；代理商等级各自在 level_config 中配置（新增代理商身份自动生效，无需额外同步） */
async function consumptionRuleFor(level: number): Promise<ConsumptionRule> {
  if (level <= 0) {
    return {
      rate: Number((await cfg('consumption_credit.normal_rate'))) || 0,
      resellable: (await cfg('consumption_credit.normal_resellable')) === '1',
    }
  }
  const row = (await get<{ rate: number; resellable: number }>(
    'SELECT consumption_credit_rate AS rate, consumption_resellable AS resellable FROM level_config WHERE level = ?',
    level,
  ))
  return { rate: Number(row?.rate ?? 0), resellable: Number(row?.resellable ?? 0) === 1 }
}

/** 零售订单支付成功后，按会员当前身份的消费返还比例累加当月领货额度；是否计入可转卖额度按该身份配置决定 */
export async function grantConsumptionCredit(orderId: number) {
  if ((await cfg('consumption_credit.enabled')) !== '1') return
  const order = (await get<{ memberId: number; orderType: number; payAmount: number; orderNo: string }>(
    'SELECT member_id AS memberId, order_type AS orderType, pay_amount AS payAmount, order_no AS orderNo FROM "order" WHERE id = ?',
    orderId,
  ))
  if (!order || Number(order.orderType) !== 1 || Number(order.payAmount) <= 0) return
  // 防止同一订单被重复发放（如支付新旧两条路径先后各触发一次支付完成逻辑）
  if ((await get('SELECT id FROM credit_flow WHERE order_id = ? AND type = 1 LIMIT 1', orderId))) return

  const member = (await get<{ level: number }>('SELECT level FROM member WHERE id = ?', order.memberId))
  if (!member) return
  const rule = (await consumptionRuleFor(Number(member.level)))
  if (rule.rate <= 0) return

  const bonus = money(Number(order.payAmount) * rule.rate / 100)
  if (bonus <= 0) return

  const month = monthOf()
  const ts = now()
  const existing = (await get<{ id: number; usedAmount: number; remainAmount: number; resellableAmount: number }>(
    'SELECT id, used_amount AS usedAmount, remain_amount AS remainAmount, resellable_amount AS resellableAmount FROM credit_record WHERE member_id = ? AND month = ?',
    order.memberId, month,
  ))
  let recordId: number
  let remain: number
  if (existing) {
    remain = money(Number(existing.remainAmount) + bonus)
    const resellable = rule.resellable ? money(Number(existing.resellableAmount ?? 0) + bonus) : Number(existing.resellableAmount ?? 0)
    const status = Number(existing.usedAmount) > 0 ? 1 : 0
    await run(
      'UPDATE credit_record SET credit_amount = credit_amount + ?, remain_amount = ?, resellable_amount = ?, status = ?, update_time = ? WHERE id = ?',
      bonus, remain, resellable, status, ts, existing.id,
    )
    recordId = existing.id
  } else {
    const resellable = rule.resellable ? bonus : 0
    const rec = (await run(
      `INSERT INTO credit_record (member_id, month, credit_amount, used_amount, remain_amount, resellable_amount, status, remark, create_time)
       VALUES (?, ?, ?, 0, ?, ?, 0, ?, ?)`,
      order.memberId, month, bonus, bonus, resellable, '购物消费返还', ts,
    ))
    recordId = Number(rec.lastInsertRowid)
    remain = bonus
  }
  await run(
    'INSERT INTO credit_flow (record_id, member_id, change_amount, balance, type, reason, order_id, create_time) VALUES (?, ?, ?, ?, 1, ?, ?, ?)',
    recordId, order.memberId, bonus, remain, `购物消费返还：订单 ${order.orderNo}`, orderId, ts,
  )
}

/**
 * 领货兑换的现金差价支付成功后，才真正扣减额度和佣金钱包余额（见 credit_redeem_pending 表注释：
 * 下单时只扣库存，额度/佣金扣减推迟到这里，避免会员付现金前取消订单导致资金黑洞）。
 * 幂等：找不到待处理记录时说明不是混合支付订单或已处理过，直接返回。
 */
export async function finalizeCreditRedeem(orderId: number) {
  const order = (await get<{ memberId: number; orderNo: string }>('SELECT member_id AS memberId, order_no AS orderNo FROM "order" WHERE id = ?', orderId))
  if (!order) return

  await transaction(async () => {
    const pending = (await get<{ id: number; creditId: number; creditAmount: number; walletAmount: number }>(
      'SELECT id, credit_id AS creditId, credit_amount AS creditAmount, wallet_amount AS walletAmount FROM credit_redeem_pending WHERE order_id = ? FOR UPDATE',
      orderId,
    ))
    if (!pending) return
    const credit = (await get<{ usedAmount: number; remainAmount: number; resellableAmount: number }>(
      'SELECT used_amount AS usedAmount, remain_amount AS remainAmount, resellable_amount AS resellableAmount FROM credit_record WHERE id = ? FOR UPDATE',
      pending.creditId,
    ))
    if (!credit || Number(credit.remainAmount) < Number(pending.creditAmount)) throw badRequest('领货额度已变化，无法完成该订单扣减')
    const ts = now()
    const used = money(Number(credit.usedAmount) + Number(pending.creditAmount))
    const remain = money(Number(credit.remainAmount) - Number(pending.creditAmount))
    // 与免现金差额的即时兑换保持一致：先消耗非转卖额度，仅当余额不足时才减少可转卖部分。
    const resellable = money(Math.min(Number(credit.resellableAmount ?? 0), Math.max(0, remain)))
    const creditUpdate = (await run(
      'UPDATE credit_record SET used_amount = ?, remain_amount = ?, resellable_amount = ?, status = ?, update_time = ? WHERE id = ? AND remain_amount >= ?',
      used, remain, resellable, remain <= 0 ? 2 : 1, ts, pending.creditId, Number(pending.creditAmount),
    ))
    if (Number(creditUpdate.changes) !== 1) throw badRequest('领货额度已变化，无法完成该订单扣减')
    await run('INSERT INTO credit_flow (record_id, member_id, change_amount, balance, type, reason, order_id, create_time) VALUES (?, ?, ?, ?, 2, ?, ?, ?)',
      pending.creditId, order.memberId, -pending.creditAmount, remain, `领取商品自用：订单 ${order.orderNo}`, orderId, ts)
    if (Number(pending.walletAmount) > 0) {
      const walletUpdate = (await run('UPDATE wallet SET balance = balance - ?, updated_at = ? WHERE member_id = ? AND balance >= ?',
        pending.walletAmount, ts, order.memberId, pending.walletAmount))
      if (Number(walletUpdate.changes) !== 1) throw badRequest('佣金钱包余额已变化，无法完成该订单扣减')
    }
    await run('DELETE FROM credit_redeem_pending WHERE id = ? AND order_id = ?', pending.id, orderId)
  })
}
