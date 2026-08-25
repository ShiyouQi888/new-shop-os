// ===== 财务管理 /api/v1/finance =====
import { Router } from 'express'
import { get, paginate } from '../db/index.js'
import { ok } from '../utils/response.js'
import { parsePagination } from '../utils/index.js'
import { requireAuth, requireRole } from '../middlewares/auth.js'

const router = Router()
router.use(requireAuth, requireRole('super_admin', 'finance', 'ops'))

/** GET /finance/overview 资金总览 */
router.get('/overview', (_req, res, next) => {
  try {
    const orderIncome = get<{ v: number }>('SELECT COALESCE(SUM(pay_amount),0) AS v FROM "order" WHERE status IN (1,2,3)')!.v
    const serviceFee = get<{ v: number }>('SELECT COALESCE(SUM(service_fee),0) AS v FROM resell_order WHERE status = 3')!.v
    const commissionOut = get<{ v: number }>('SELECT COALESCE(SUM(amount),0) AS v FROM commission WHERE status IN (0,1,2)')!.v
    const commissionPending = get<{ v: number }>('SELECT COALESCE(SUM(amount),0) AS v FROM commission WHERE status = 0')!.v
    const withdrawOut = get<{ v: number }>('SELECT COALESCE(SUM(actual_amount),0) AS v FROM withdraw WHERE status = 2')!.v
    const pendingWithdraw = get<{ v: number }>('SELECT COALESCE(SUM(actual_amount),0) AS v FROM withdraw WHERE status IN (0,1)')!.v
    const net = orderIncome + serviceFee - commissionOut - withdrawOut
    ok(res, {
      orderIncome, serviceFee, commissionOut, commissionPending, withdrawOut, pendingWithdraw,
      net, // 平台净收入
    })
  } catch (e) { next(e) }
})

/** GET /finance/flows?page=&pageSize= 资金流水 */
router.get('/flows', (req, res, next) => {
  try {
    const { page, pageSize } = parsePagination(req.query)
    const data = paginate(
      'SELECT id, flow_no AS flowNo, type, amount, balance, related_no AS relatedNo, remark, create_time AS createTime FROM finance_flow ORDER BY id DESC',
      'SELECT COUNT(*) AS c FROM finance_flow',
      [], page, pageSize,
    )
    ok(res, data)
  } catch (e) { next(e) }
})

export default router
