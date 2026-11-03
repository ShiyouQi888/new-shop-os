// ===== 订单管理 /api/v1/orders =====
import { Router } from 'express'
import { z } from 'zod'
import { all, get, run, paginate, transaction } from '../db/index.js'
import { ok, notFound, badRequest } from '../utils/response.js'
import { parsePagination, int, str, now, uniqueNumbers, genNo } from '../utils/index.js'
import { requireAuth, requirePermission } from '../middlewares/auth.js'
import { logOperation } from './log.js'
import { rollbackOrderCommissions, scheduleOrderCommissions } from '../services/distribution.js'
import { recordFinanceFlow } from '../services/finance.js'
import { restoreOrderStock } from '../services/inventory.js'
import { getPaymentMode } from '../services/payment.js'

const router = Router()
router.use(requireAuth)

const ORDER_SELECT = `
  SELECT o.id, o.order_no AS orderNo, o.member_id AS memberId, o.member_name AS memberName,
         o.order_type AS orderType, o.total_amount AS totalAmount, o.discount_amount AS discountAmount,
         o.shipping_fee AS shippingFee, o.pay_amount AS payAmount, o.status,
         o.receiver_name AS receiverName, o.receiver_phone AS receiverPhone, o.receiver_address AS receiverAddress,
         o.logistics_company AS logisticsCompany, o.logistics_no AS logisticsNo, o.remark,
         o.create_time AS createTime, o.pay_time AS payTime, o.ship_time AS shipTime,
         o.finish_time AS finishTime, o.cancel_time AS cancelTime,
         o.refund_reason AS refundReason, o.refund_request_time AS refundRequestTime,
         o.refund_audit_remark AS refundAuditRemark, o.refund_audit_time AS refundAuditTime
  FROM "order" o
`

/** GET /orders?page=&pageSize=&status=&type=&keyword= */
router.get('/', requirePermission('order:view'), async (req, res, next) => {
  try {
    const { page, pageSize } = parsePagination(req.query)
    const status = req.query.status === undefined || req.query.status === '' ? null : int(req.query.status)
    const type = req.query.type === undefined || req.query.type === '' ? null : int(req.query.type)
    const keyword = str(req.query.keyword)

    const conds: string[] = []
    const params: (string | number)[] = []
    if (status !== null) { conds.push('o.status = ?'); params.push(status) }
    if (type !== null) { conds.push('o.order_type = ?'); params.push(type) }
    if (keyword) {
      conds.push('(o.order_no LIKE ? OR o.member_name LIKE ? OR o.member_id = ? OR o.receiver_phone LIKE ?)')
      params.push(`%${keyword}%`, `%${keyword}%`, int(keyword, -1), `%${keyword}%`)
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
    const data = (await paginate(
      `${ORDER_SELECT} ${where} ORDER BY o.id DESC`,
      `SELECT COUNT(*) AS c FROM "order" o ${where}`,
      params, page, pageSize,
    ))
    ok(res, data)
  } catch (e) { next(e) }
})

/** GET /orders/:id 详情（含明细） */
router.get('/:id', requirePermission('order:view'), async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const order = (await get(ORDER_SELECT + ' WHERE o.id = ?', id))
    if (!order) throw notFound('订单不存在')
    const items = (await all('SELECT id, sku_id AS skuId, sku_name AS skuName, spec_info AS specInfo, image, quantity, original_price AS originalPrice, unit_price AS unitPrice, total_price AS totalPrice, member_level AS memberLevel FROM order_item WHERE order_id = ?', id))
    ok(res, { ...order, items })
  } catch (e) { next(e) }
})

/** PATCH /orders/:id/status 更新订单状态（发货/完成/取消） */
router.patch('/:id/status', requirePermission('order:ship'), async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const order = (await get<Record<string, unknown>>('SELECT * FROM "order" WHERE id = ?', id))
    if (!order) throw notFound('订单不存在')
    const body = z.object({
      // 仅发货(2)/完成(3)/取消(4) 三种合法转移；不允许打回待支付(1)，该状态只应由支付流程本身写入
      status: z.union([z.literal(2), z.literal(3), z.literal(4)]),
      logisticsCompany: z.string().optional(),
      logisticsNo: z.string().optional(),
    }).parse(req.body)
    if (body.status === 2 && Number(order.status) !== 1) throw badRequest('仅待发货订单可发货')
    if (body.status === 2 && (!body.logisticsCompany || !body.logisticsNo)) throw badRequest('发货必须填写物流公司和物流单号')
    if (body.status === 3 && Number(order.status) !== 2) throw badRequest('仅待收货订单可完成')
    if (body.status === 4 && Number(order.status) !== 0) throw badRequest('已付款订单不可直接取消，请发起退款申请')
    await transaction(async () => {
      const ts = now()
      const sets: string[] = ['status = ?']
      const params: (string | number)[] = [body.status]
      if (body.status === 2 && !order.shipTime) { sets.push('ship_time = ?'); params.push(ts) }
      if (body.logisticsCompany) { sets.push('logistics_company = ?'); params.push(body.logisticsCompany.trim()) }
      if (body.logisticsNo) { sets.push('logistics_no = ?'); params.push(body.logisticsNo.trim()) }
      if (body.status === 3) { sets.push('finish_time = ?'); params.push(ts) }
      if (body.status === 4) { sets.push('cancel_time = ?'); params.push(ts) }
      params.push(id, Number(order.status))
      const updated = (await run(`UPDATE "order" SET ${sets.join(', ')} WHERE id = ? AND status = ?`, ...params))
      if (Number(updated.changes) !== 1) throw badRequest('订单状态已变化，请刷新后重试')
      if (body.status === 3) await scheduleOrderCommissions(id)
      if (body.status === 4) await restoreOrderStock(id)
      const action = body.status === 2 ? '发货' : body.status === 3 ? '确认完成' : '取消未支付订单'
      await logOperation(String(req.auth?.username || ''), '订单管理', action,
        `订单 ${String(order.orderNo)}：${action}`, String(req.ip || ''))
    })
    ok(res, null, '订单状态已更新')
  } catch (e) { next(e) }
})

/** PATCH /orders/ship 批量发货（body: { ids, company, no }） */
router.patch('/ship', requirePermission('order:ship'), async (req, res, next) => {
  try {
    const body = z.object({
      ids: z.array(z.number().int()).min(1),
      company: z.string().min(1).max(30),
      no: z.string().min(1).max(50),
    }).parse(req.body)
    if (body.ids.length > 100) throw badRequest('单次最多批量发货 100 笔')
    const shipped = (await transaction(async () => {
      const ts = now()
      let count = 0
      for (const id of new Set(body.ids)) {
        const r = (await run('UPDATE "order" SET status = 2, logistics_company = ?, logistics_no = ?, ship_time = ? WHERE id = ? AND status = 1',
          body.company.trim(), body.no.trim(), ts, id))
        count += Number(r.changes)
      }
      await logOperation(String(req.auth?.username || ''), '订单管理', '批量发货',
        `批量发货 ${count}/${body.ids.length} 单（${body.company} ${body.no}）`, String(req.ip || ''))
      return count
    }))
    ok(res, null, `已发货 ${shipped}/${body.ids.length} 单`)
  } catch (e) { next(e) }
})

/** POST /orders/:id/refund-audit 退款审核（body: { pass, remark }） */
router.post('/:id/refund-audit', requirePermission('order:refund'), async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const order = (await get<Record<string, unknown>>('SELECT * FROM "order" WHERE id = ?', id))
    if (!order) throw notFound('订单不存在')
    if (Number(order.status) !== 5 || !order.payTime) throw badRequest('仅已支付且退款申请中的订单可审核')
    if (Number(order.orderType) !== 1) throw badRequest('该订单涉及会员权益或领货额度变更，不能走普通零售整单退款流程')
    const body = z.object({ pass: z.boolean(), remark: z.string().max(200).optional() }).parse(req.body)
    if (!body.pass && !body.remark) throw badRequest('驳回时必须填写原因')
    if (body.pass && (await getPaymentMode()) !== 'mock') {
      throw badRequest('当前真实支付退款接口尚未接通；请完成网关退款能力后再启用线上退款审核')
    }
    await transaction(async () => {
      const ts = now()
      const nextStatus = body.pass ? 6 : 1
      const updated = (await run(
        'UPDATE "order" SET status = ?, refund_audit_remark = ?, refund_audit_time = ? WHERE id = ? AND status = 5',
        nextStatus, body.remark || '', ts, id,
      ))
      if (Number(updated.changes) !== 1) throw badRequest('退款申请状态已变化，请刷新后重试')
      if (body.pass) {
        await rollbackOrderCommissions(id, '订单退款')
        await restoreOrderStock(id)
        await recordFinanceFlow(5, -Number(order.payAmount), String(order.orderNo), '订单退款支出（模拟支付）')
      }
      await logOperation(String(req.auth?.username || ''), '订单售后', body.pass ? '退款通过' : '退款驳回',
        `订单 ${String(order.orderNo)}，申请原因：${String(order.refundReason || '未填写')}；审核意见：${body.remark || (body.pass ? '审核通过' : '')}`,
        String(req.ip || ''))
    })
    ok(res, null, body.pass ? '退款已同意' : '退款已驳回，订单已恢复')
  } catch (e) { next(e) }
})

/** 导出占位：orderNo 生成器复用 */
export { genNo }
export default router
