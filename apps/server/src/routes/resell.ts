// ===== 转卖单 /api/v1/resells =====
import { Router } from 'express'
import { z } from 'zod'
import { all, get, run, paginate, transaction } from '../db/index.js'
import { ok, notFound, badRequest } from '../utils/response.js'
import { parsePagination, int, str, now, money } from '../utils/index.js'
import { requireAuth, requirePermission } from '../middlewares/auth.js'
import { logOperation } from './log.js'
import { lockFinanceLedger, recordFinanceFlow } from '../services/finance.js'

const router = Router()
router.use(requireAuth)

/** GET /resells?page=&pageSize=&status=&keyword= */
router.get('/', requirePermission('resell:view'), async (req, res, next) => {
  try {
    const { page, pageSize } = parsePagination(req.query)
    const status = req.query.status === undefined || req.query.status === '' ? null : int(req.query.status)
    const keyword = str(req.query.keyword)

    const conds: string[] = []
    const params: (string | number)[] = []
    if (status !== null) { conds.push('r.status = ?'); params.push(status) }
    if (keyword) {
      conds.push('(r.resell_no LIKE ? OR r.member_name LIKE ? OR r.sku_name LIKE ? OR r.member_id = ?)')
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, int(keyword, -1))
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''

    const data = (await paginate(
      `SELECT r.id, r.resell_no AS resellNo, r.member_id AS memberId, r.member_name AS memberName,
              r.credit_id AS creditId, r.order_id AS orderId, r.order_no AS orderNo, r.goods_value AS goodsValue,
              r.service_fee AS serviceFee, r.shipping_fee AS shippingFee, r.settle_amount AS settleAmount,
              r.status, r.match_order_id AS matchOrderId, r.match_time AS matchTime, r.auto_matched AS autoMatched, r.cancel_time AS cancelTime,
              r.settle_time AS settleTime,
              r.create_time AS createTime,
              COALESCE(r.sku_name, (SELECT oi.sku_name FROM order_item oi WHERE oi.order_id = r.order_id LIMIT 1)) AS skuName,
              (SELECT SUM(oi.quantity) FROM order_item oi WHERE oi.order_id = r.order_id) AS quantity
       FROM resell_order r ${where} ORDER BY r.id DESC`,
      `SELECT COUNT(*) AS c FROM resell_order r ${where}`,
      params, page, pageSize,
    ))
    ok(res, data)
  } catch (e) { next(e) }
})

/** GET /resells/pending-orders 待匹配的零售订单（手动匹配用） */
router.get('/pending-orders', requirePermission('resell:match'), async (_req, res, next) => {
  try {
    const list = (await all(
      `SELECT id, order_no AS orderNo, member_id AS memberId, member_name AS memberName,
              receiver_name AS receiverName, pay_amount AS payAmount, create_time AS createTime
       FROM "order" o WHERE o.status = 1 AND o.order_type IN (1,2)
         AND EXISTS (
           SELECT 1 FROM order_item oi
           JOIN product_sku s ON s.id = oi.sku_id
           JOIN resell_pool_item rp ON rp.spu_id = s.spu_id
           WHERE oi.order_id = o.id
         )
         AND NOT EXISTS (SELECT 1 FROM resell_order r WHERE r.match_order_id = o.id AND r.status IN (2,3))
       ORDER BY id DESC LIMIT 50`,
    ))
    ok(res, list)
  } catch (e) { next(e) }
})

/** POST /resells/:id/match 手动匹配（body: { matchOrderId }） */
router.post('/:id/match', requirePermission('resell:match'), async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const body = z.object({ matchOrderId: z.number().int() }).parse(req.body)
    await transaction(async () => {
      const target = (await get<Record<string, unknown>>('SELECT id, order_type AS orderType, status FROM "order" WHERE id = ? FOR UPDATE', body.matchOrderId))
      if (!target) throw notFound('匹配订单不存在')
      if (![1, 2].includes(Number(target.orderType)) || Number(target.status) !== 1) throw badRequest('只能匹配待发货的零售或礼包订单')
      const rs = (await get<Record<string, unknown>>('SELECT id, status FROM resell_order WHERE id = ? FOR UPDATE', id))
      if (!rs) throw notFound('转卖单不存在')
      if (Number(rs.status) !== 0) throw badRequest('仅待匹配的转卖单可匹配')
      const qualifies = (await get(
        `SELECT 1 AS matched FROM order_item oi
         JOIN product_sku s ON s.id = oi.sku_id
         JOIN resell_pool_item rp ON rp.spu_id = s.spu_id
         WHERE oi.order_id = ? LIMIT 1`, body.matchOrderId,
      ))
      if (!qualifies) throw badRequest('该订单商品不在转卖商品池中，不能作为有效需求匹配')
      if ((await get('SELECT id FROM resell_order WHERE match_order_id = ? AND status IN (2,3) LIMIT 1', body.matchOrderId))) {
        throw badRequest('该零售订单已匹配其他转卖单')
      }
      const changed = (await run('UPDATE resell_order SET status = 2, match_order_id = ?, match_time = ?, auto_matched = 0 WHERE id = ? AND status = 0',
        body.matchOrderId, now(), id))
      if (Number(changed.changes) !== 1) throw badRequest('转卖单状态已变化，请刷新后重试')
      await logOperation(String(req.auth?.username || ''), '转卖管理', '手动匹配',
        `转卖单 ${id} 匹配零售订单 ${body.matchOrderId}`, String(req.ip || ''))
    })
    ok(res, null, '匹配成功')
  } catch (e) { next(e) }
})

/** POST /resells/:id/complete 完成转卖结算 */
router.post('/:id/complete', requirePermission('resell:match'), async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    await transaction(async () => {
      await lockFinanceLedger()
      const rs = (await get<Record<string, unknown>>('SELECT * FROM resell_order WHERE id = ? FOR UPDATE', id))
      if (!rs) throw notFound('转卖单不存在')
      if (Number(rs.status) !== 2) throw badRequest('仅已匹配的转卖单可完成结算')
      const settleAmount = money(Number(rs.settleAmount))
      if (settleAmount <= 0) throw badRequest('结算金额异常，不能完成结算')
      const expected = money(Number(rs.goodsValue) - Number(rs.serviceFee) - Number(rs.shippingFee))
      if (expected !== settleAmount) throw badRequest('转卖结算金额与商品价值、服务费、快递费不一致，请先核对')
      const ts = now()
      const changed = (await run('UPDATE resell_order SET status = 3, settle_time = ? WHERE id = ? AND status = 2', ts, id))
      if (Number(changed.changes) !== 1) throw badRequest('转卖单状态已变化，请刷新后重试')
      await recordFinanceFlow(2, Number(rs.serviceFee || 0), String(rs.resellNo), '转卖服务费收入')
      await recordFinanceFlow(5, -settleAmount, String(rs.resellNo), `转卖结算给会员 ${String(rs.memberId)}`)
      const wallet = (await get<{ memberId: number }>(
        'SELECT member_id AS memberId FROM wallet WHERE member_id = ?', Number(rs.memberId),
      ))
      if (!wallet) throw badRequest('会员钱包不存在，已取消本次结算，请先核对钱包账户')
      const credited = (await run(
        'UPDATE wallet SET balance = balance + ?, total_income = total_income + ?, updated_at = ? WHERE member_id = ?',
        settleAmount, settleAmount, ts, Number(rs.memberId),
      ))
      if (Number(credited.changes) !== 1) throw badRequest('会员钱包不存在，已取消本次结算，请先核对钱包账户')
      await logOperation(String(req.auth?.username || ''), '转卖管理', '确认结算',
        `转卖单 ${String(rs.resellNo)} 已结算 ¥${settleAmount.toFixed(2)} 至会员 ${String(rs.memberId)}`, String(req.ip || ''))
    })
    ok(res, null, '转卖已完成结算')
  } catch (e) { next(e) }
})

/** POST /resells/:id/cancel 取消转卖 */
router.post('/:id/cancel', requirePermission('resell:match'), async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    await transaction(async () => {
      const rs = (await get<Record<string, unknown>>('SELECT * FROM resell_order WHERE id = ? FOR UPDATE', id))
      if (!rs) throw notFound('转卖单不存在')
      if (![0, 1].includes(Number(rs.status))) throw badRequest('仅待匹配或匹配中的转卖单可取消；已匹配订单需完成结算')
      const ts = now()
      const changed = (await run('UPDATE resell_order SET status = 4, cancel_time = ? WHERE id = ? AND status IN (0,1)', ts, id))
      if (Number(changed.changes) !== 1) throw badRequest('转卖单状态已变化，请刷新后重试')
      if (rs.creditId) {
        const credit = (await get<Record<string, unknown>>('SELECT * FROM credit_record WHERE id = ?', Number(rs.creditId)))
        if (!credit) throw badRequest('关联的领货额度记录不存在，已阻止取消，请核对账目')
        const goodsValue = money(Number(rs.goodsValue))
        const remain = money(Number(credit.remainAmount) + goodsValue)
        const used = money(Math.max(0, Number(credit.usedAmount) - goodsValue))
        const resellable = money(Math.min(remain, Number(credit.resellableAmount ?? 0) + goodsValue))
        const restored = (await run('UPDATE credit_record SET used_amount = ?, remain_amount = ?, resellable_amount = ?, status = ?, update_time = ? WHERE id = ?',
          used, remain, resellable, remain <= 0 ? 2 : used <= 0 ? 0 : 1, ts, Number(rs.creditId)))
        if (Number(restored.changes) !== 1) throw badRequest('领货额度回补失败，已取消本次操作')
        await run('INSERT INTO credit_flow (record_id, member_id, change_amount, balance, type, reason, create_time) VALUES (?, ?, ?, ?, 4, ?, ?)',
          Number(rs.creditId), Number(rs.memberId), goodsValue, remain, '取消转卖回补月度额度', ts)
      }
      await logOperation(String(req.auth?.username || ''), '转卖管理', '取消转卖',
        `取消转卖单 ${String(rs.resellNo)}，回补额度 ¥${Number(rs.goodsValue).toFixed(2)}`, String(req.ip || ''))
    })
    ok(res, null, '已取消')
  } catch (e) { next(e) }
})

export default router
