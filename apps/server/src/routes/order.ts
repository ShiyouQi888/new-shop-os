// ===== 订单管理 /api/v1/orders =====
import { Router } from 'express'
import { z } from 'zod'
import { all, get, run, paginate } from '../db/index.js'
import { ok, notFound, badRequest } from '../utils/response.js'
import { parsePagination, int, str, now, uniqueNumbers, genNo } from '../utils/index.js'
import { requireAuth, requirePermission } from '../middlewares/auth.js'
import { logOperation } from './log.js'

const router = Router()
router.use(requireAuth)

const ORDER_SELECT = `
  SELECT o.id, o.order_no AS orderNo, o.member_id AS memberId, o.member_name AS memberName,
         o.order_type AS orderType, o.total_amount AS totalAmount, o.discount_amount AS discountAmount,
         o.shipping_fee AS shippingFee, o.pay_amount AS payAmount, o.status,
         o.receiver_name AS receiverName, o.receiver_phone AS receiverPhone, o.receiver_address AS receiverAddress,
         o.logistics_company AS logisticsCompany, o.logistics_no AS logisticsNo, o.remark,
         o.create_time AS createTime, o.pay_time AS payTime, o.ship_time AS shipTime,
         o.finish_time AS finishTime, o.cancel_time AS cancelTime
  FROM "order" o
`

/** GET /orders?page=&pageSize=&status=&type=&keyword= */
router.get('/', (req, res, next) => {
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
    const data = paginate(
      `${ORDER_SELECT} ${where} ORDER BY o.id DESC`,
      `SELECT COUNT(*) AS c FROM "order" o ${where}`,
      params, page, pageSize,
    )
    ok(res, data)
  } catch (e) { next(e) }
})

/** GET /orders/:id 详情（含明细） */
router.get('/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const order = get(ORDER_SELECT + ' WHERE o.id = ?', id)
    if (!order) throw notFound('订单不存在')
    const items = all('SELECT id, sku_id AS skuId, sku_name AS skuName, spec_info AS specInfo, image, quantity, original_price AS originalPrice, unit_price AS unitPrice, total_price AS totalPrice, member_level AS memberLevel FROM order_item WHERE order_id = ?', id)
    ok(res, { ...order, items })
  } catch (e) { next(e) }
})

/** PATCH /orders/:id/status 更新订单状态（发货/完成/取消） */
router.patch('/:id/status', (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const order = get<Record<string, unknown>>('SELECT * FROM "order" WHERE id = ?', id)
    if (!order) throw notFound('订单不存在')
    const body = z.object({
      status: z.number().int().min(1).max(4),
      logisticsCompany: z.string().optional(),
      logisticsNo: z.string().optional(),
    }).parse(req.body)
    const sets: string[] = ['status = ?']
    const params: (string | number)[] = [body.status]
    if (body.status === 1 && !order.shipTime) { sets.push('ship_time = ?'); params.push(now()) }
    if (body.logisticsCompany) { sets.push('logistics_company = ?'); params.push(body.logisticsCompany) }
    if (body.logisticsNo) { sets.push('logistics_no = ?'); params.push(body.logisticsNo) }
    if (body.status === 3) { sets.push('finish_time = ?'); params.push(now()) }
    if (body.status === 4) { sets.push('cancel_time = ?'); params.push(now()) }
    params.push(id)
    run(`UPDATE "order" SET ${sets.join(', ')} WHERE id = ?`, ...params)
    ok(res, null, '订单状态已更新')
  } catch (e) { next(e) }
})

/** PATCH /orders/ship 批量发货（body: { ids, company, no }） */
router.patch('/ship', requirePermission('order:ship'), (req, res, next) => {
  try {
    const body = z.object({
      ids: z.array(z.number().int()).min(1),
      company: z.string().min(1).max(30),
      no: z.string().min(1).max(50),
    }).parse(req.body)
    const ts = now()
    for (const id of body.ids) {
      run('UPDATE "order" SET status = 1, logistics_company = ?, logistics_no = ?, ship_time = ? WHERE id = ? AND status = 0',
        body.company, body.no, ts, id)
    }
    logOperation(String(req.auth?.username || ''), '订单管理', '发货',
      `批量发货 ${body.ids.length} 单（${body.company} ${body.no}）`, String(req.ip || ''))
    ok(res, null, `已发货 ${body.ids.length} 单`)
  } catch (e) { next(e) }
})

/** POST /orders/:id/refund-audit 退款审核（body: { pass, remark }） */
router.post('/:id/refund-audit', requirePermission('order:ship'), (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const order = get<Record<string, unknown>>('SELECT * FROM "order" WHERE id = ?', id)
    if (!order) throw notFound('订单不存在')
    const body = z.object({ pass: z.boolean(), remark: z.string().max(200).optional() }).parse(req.body)
    if (!body.pass && !body.remark) throw badRequest('驳回时必须填写原因')
    // 模拟退款：订单取消 + 状态变更
    run('UPDATE "order" SET status = 4, cancel_time = ? WHERE id = ?', now(), id)
    ok(res, null, body.pass ? '退款已同意' : '退款已驳回')
  } catch (e) { next(e) }
})

/** 导出占位：orderNo 生成器复用 */
export { genNo }
export default router
