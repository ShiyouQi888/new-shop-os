// ===== 转卖单 /api/v1/resells =====
import { Router } from 'express'
import { z } from 'zod'
import { all, get, run, paginate } from '../db/index.js'
import { ok, notFound, badRequest } from '../utils/response.js'
import { parsePagination, int, str, now } from '../utils/index.js'
import { requireAuth, requirePermission } from '../middlewares/auth.js'

const router = Router()
router.use(requireAuth)

/** GET /resells?page=&pageSize=&status=&keyword= */
router.get('/', (req, res, next) => {
  try {
    const { page, pageSize } = parsePagination(req.query)
    const status = req.query.status === undefined || req.query.status === '' ? null : int(req.query.status)
    const keyword = str(req.query.keyword)

    const conds: string[] = []
    const params: (string | number)[] = []
    if (status !== null) { conds.push('r.status = ?'); params.push(status) }
    if (keyword) { conds.push('(r.resell_no LIKE ? OR r.member_name LIKE ? OR r.member_id = ?)'); params.push(`%${keyword}%`, `%${keyword}%`, int(keyword, -1)) }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''

    const data = paginate(
      `SELECT r.id, r.resell_no AS resellNo, r.member_id AS memberId, r.member_name AS memberName,
              r.order_id AS orderId, r.order_no AS orderNo, r.goods_value AS goodsValue,
              r.service_fee AS serviceFee, r.shipping_fee AS shippingFee, r.settle_amount AS settleAmount,
              r.status, r.match_order_id AS matchOrderId, r.match_time AS matchTime, r.cancel_time AS cancelTime,
              r.create_time AS createTime,
              COALESCE(r.sku_name, (SELECT oi.sku_name FROM order_item oi WHERE oi.order_id = r.order_id LIMIT 1)) AS skuName,
              (SELECT SUM(oi.quantity) FROM order_item oi WHERE oi.order_id = r.order_id) AS quantity
       FROM resell_order r ${where} ORDER BY r.id DESC`,
      `SELECT COUNT(*) AS c FROM resell_order r ${where}`,
      params, page, pageSize,
    )
    ok(res, data)
  } catch (e) { next(e) }
})

/** GET /resells/pending-orders 待匹配的零售订单（手动匹配用） */
router.get('/pending-orders', (_req, res, next) => {
  try {
    const list = all(
      `SELECT id, order_no AS orderNo, member_id AS memberId, member_name AS memberName, pay_amount AS payAmount, create_time AS createTime
       FROM "order" WHERE status = 1 AND order_type = 1 ORDER BY id DESC LIMIT 50`,
    )
    ok(res, list)
  } catch (e) { next(e) }
})

/** POST /resells/:id/match 手动匹配（body: { matchOrderId }） */
router.post('/:id/match', requirePermission('resell:match'), (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const rs = get<Record<string, unknown>>('SELECT * FROM resell_order WHERE id = ?', id)
    if (!rs) throw notFound('转卖单不存在')
    if (Number(rs.status) !== 0) throw badRequest('仅待匹配的转卖单可匹配')
    const body = z.object({ matchOrderId: z.number().int() }).parse(req.body)
    if (!get('SELECT id FROM "order" WHERE id = ?', body.matchOrderId)) throw notFound('匹配订单不存在')
    run('UPDATE resell_order SET status = 2, match_order_id = ?, match_time = ? WHERE id = ?', body.matchOrderId, now(), id)
    ok(res, null, '匹配成功')
  } catch (e) { next(e) }
})

/** POST /resells/:id/cancel 取消转卖 */
router.post('/:id/cancel', requirePermission('resell:match'), (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const rs = get<Record<string, unknown>>('SELECT * FROM resell_order WHERE id = ?', id)
    if (!rs) throw notFound('转卖单不存在')
    if (Number(rs.status) !== 0) throw badRequest('仅待匹配的转卖单可取消')
    run('UPDATE resell_order SET status = 4, cancel_time = ? WHERE id = ?', now(), id)
    ok(res, null, '已取消')
  } catch (e) { next(e) }
})

export default router
