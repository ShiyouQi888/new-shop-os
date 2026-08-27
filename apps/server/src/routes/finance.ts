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
    const paidOrderWhere = 'status IN (1,2,3)'
    const orderIncome = get<{ v: number }>(`SELECT COALESCE(SUM(pay_amount),0) AS v FROM "order" WHERE ${paidOrderWhere}`)!.v
    const orderCount = get<{ v: number }>(`SELECT COUNT(*) AS v FROM "order" WHERE ${paidOrderWhere}`)!.v
    const memberOrderIncome = get<{ v: number }>(`SELECT COALESCE(SUM(pay_amount),0) AS v FROM "order" WHERE ${paidOrderWhere} AND order_type = 1`)!.v
    const memberOrderCount = get<{ v: number }>(`SELECT COUNT(*) AS v FROM "order" WHERE ${paidOrderWhere} AND order_type = 1`)!.v
    const giftOrderIncome = get<{ v: number }>(`SELECT COALESCE(SUM(pay_amount),0) AS v FROM "order" WHERE ${paidOrderWhere} AND order_type = 2`)!.v
    const giftOrderCount = get<{ v: number }>(`SELECT COUNT(*) AS v FROM "order" WHERE ${paidOrderWhere} AND order_type = 2`)!.v
    const pendingShipAmount = get<{ v: number }>('SELECT COALESCE(SUM(pay_amount),0) AS v FROM "order" WHERE status = 1')!.v
    const pendingShipCount = get<{ v: number }>('SELECT COUNT(*) AS v FROM "order" WHERE status = 1')!.v
    const inTransitAmount = get<{ v: number }>('SELECT COALESCE(SUM(pay_amount),0) AS v FROM "order" WHERE status = 2')!.v
    const inTransitCount = get<{ v: number }>('SELECT COUNT(*) AS v FROM "order" WHERE status = 2')!.v

    const serviceFee = get<{ v: number }>('SELECT COALESCE(SUM(service_fee),0) AS v FROM resell_order WHERE status = 3')!.v
    const pendingServiceFee = get<{ v: number }>('SELECT COALESCE(SUM(service_fee),0) AS v FROM resell_order WHERE status IN (0,1,2)')!.v
    const resellPayout = get<{ v: number }>('SELECT COALESCE(SUM(settle_amount),0) AS v FROM resell_order WHERE status = 3')!.v
    const resellPendingPayout = get<{ v: number }>('SELECT COALESCE(SUM(settle_amount),0) AS v FROM resell_order WHERE status IN (0,1,2)')!.v
    const resellActiveCount = get<{ v: number }>('SELECT COUNT(*) AS v FROM resell_order WHERE status IN (0,1,2)')!.v
    const resellCompletedCount = get<{ v: number }>('SELECT COUNT(*) AS v FROM resell_order WHERE status = 3')!.v

    const commissionOut = get<{ v: number }>('SELECT COALESCE(SUM(amount),0) AS v FROM commission WHERE status IN (0,1,2)')!.v
    const commissionPending = get<{ v: number }>('SELECT COALESCE(SUM(amount),0) AS v FROM commission WHERE status = 0')!.v
    const commissionAvailable = get<{ v: number }>('SELECT COALESCE(SUM(amount),0) AS v FROM commission WHERE status = 1')!.v
    const commissionPaid = get<{ v: number }>('SELECT COALESCE(SUM(amount),0) AS v FROM commission WHERE status = 2')!.v
    const withdrawOut = get<{ v: number }>('SELECT COALESCE(SUM(actual_amount),0) AS v FROM withdraw WHERE status = 2')!.v
    const pendingWithdraw = get<{ v: number }>('SELECT COALESCE(SUM(actual_amount),0) AS v FROM withdraw WHERE status IN (0,1)')!.v
    const walletBalance = get<{ v: number }>('SELECT COALESCE(SUM(balance),0) AS v FROM wallet')!.v
    const walletFrozen = get<{ v: number }>('SELECT COALESCE(SUM(frozen),0) AS v FROM wallet')!.v

    const cashIn = orderIncome + serviceFee
    const cashOut = withdrawOut + resellPayout
    const fundPoolBalance = cashIn - cashOut
    const riskExposure = commissionPending + commissionAvailable + pendingWithdraw + resellPendingPayout + pendingShipAmount
    const riskGap = Math.max(0, riskExposure - fundPoolBalance)
    const riskRatio = fundPoolBalance > 0 ? riskExposure / fundPoolBalance : riskExposure > 0 ? 999 : 0
    const riskLevel = riskGap > 0 ? 'high' : riskRatio >= 0.8 ? 'medium' : 'low'
    const net = cashIn - commissionOut - withdrawOut - resellPayout
    ok(res, {
      orderIncome, serviceFee, commissionOut, commissionPending, withdrawOut, pendingWithdraw,
      orderCount, memberOrderIncome, memberOrderCount, giftOrderIncome, giftOrderCount,
      pendingShipAmount, pendingShipCount, inTransitAmount, inTransitCount,
      pendingServiceFee, resellPayout, resellPendingPayout, resellActiveCount, resellCompletedCount,
      commissionAvailable, commissionPaid, walletBalance, walletFrozen,
      cashIn, cashOut, fundPoolBalance, riskExposure, riskGap, riskRatio, riskLevel,
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
