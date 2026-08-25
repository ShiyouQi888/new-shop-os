// ===== 佣金记录 /api/v1/commissions =====
import { Router } from 'express'
import { get, paginate } from '../db/index.js'
import { ok, notFound } from '../utils/response.js'
import { parsePagination, int, str } from '../utils/index.js'
import { requireAuth } from '../middlewares/auth.js'
import { settleDueCommissions } from '../services/distribution.js'

const router = Router()
router.use(requireAuth)

/** GET /commissions?page=&pageSize=&status=&keyword= */
router.get('/', (req, res, next) => {
  try {
    settleDueCommissions()
    const { page, pageSize } = parsePagination(req.query)
    const status = req.query.status === undefined || req.query.status === '' ? null : int(req.query.status)
    const distributionLevel = req.query.distributionLevel === undefined || req.query.distributionLevel === '' ? null : int(req.query.distributionLevel)
    const keyword = str(req.query.keyword)

    const conds: string[] = []
    const params: (string | number)[] = []
    if (status !== null) { conds.push('c.status = ?'); params.push(status) }
    if (distributionLevel !== null) { conds.push('c.distribution_level = ?'); params.push(distributionLevel) }
    if (keyword) { conds.push('(m.nickname LIKE ? OR s.nickname LIKE ? OR c.member_id = ? OR c.source_member_id = ?)'); params.push(`%${keyword}%`, `%${keyword}%`, int(keyword, -1), int(keyword, -1)) }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''

    const data = paginate(
      `SELECT c.id, c.member_id AS memberId, c.source_member_id AS sourceMemberId, c.order_id AS orderId,
              'CM' || c.id AS commissionNo, c.order_id AS sourceOrderId, o.pay_amount AS orderAmount,
              c.package_level AS packageLevel, c.distribution_level AS distributionLevel, c.rate, c.amount,
              c.status, c.settlement_due_time AS settlementDueTime, c.settle_time AS settleTime,
              c.rollback_reason AS rollbackReason, c.create_time AS createTime, c.update_time AS updateTime,
              m.nickname, m.avatar, m.phone,
              s.nickname AS sourceName, s.avatar AS sourceAvatar
       FROM commission c
       LEFT JOIN "order" o ON o.id = c.order_id
       LEFT JOIN member m ON m.id = c.member_id
       LEFT JOIN member s ON s.id = c.source_member_id ${where} ORDER BY c.id DESC`,
      `SELECT COUNT(*) AS c FROM commission c
       LEFT JOIN member m ON m.id = c.member_id
       LEFT JOIN member s ON s.id = c.source_member_id ${where}`,
      params, page, pageSize,
    )
    ok(res, data)
  } catch (e) { next(e) }
})

/** GET /commissions/:id */
router.get('/:id', (req, res, next) => {
  try {
    settleDueCommissions()
    const id = Number(req.params.id)
    const row = get(
      `SELECT c.*, 'CM' || c.id AS commissionNo, c.order_id AS sourceOrderId, o.pay_amount AS orderAmount,
              c.settlement_due_time AS settlementDueTime, c.settle_time AS settleTime,
              m.nickname, s.nickname AS sourceName
       FROM commission c
       LEFT JOIN "order" o ON o.id = c.order_id
       LEFT JOIN member m ON m.id = c.member_id LEFT JOIN member s ON s.id = c.source_member_id
       WHERE c.id = ?`,
      id,
    )
    if (!row) throw notFound('佣金记录不存在')
    ok(res, row)
  } catch (e) { next(e) }
})

export default router
