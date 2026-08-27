// ===== 财务管理 /api/v1/finance =====
import { Router } from 'express'
import { get, paginate } from '../db/index.js'
import { ok } from '../utils/response.js'
import { parsePagination, money } from '../utils/index.js'
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
    // 会员钱包才是"会员可提现/已冻结"的权威账本；佣金表状态只是钱包变动的成因之一（还有人工调整等），不能互相替代
    const walletBalance = get<{ v: number }>('SELECT COALESCE(SUM(balance),0) AS v FROM wallet')!.v
    const walletFrozen = get<{ v: number }>('SELECT COALESCE(SUM(frozen),0) AS v FROM wallet')!.v

    // 月度领货额度负债：未使用部分按是否可转卖拆成两类
    //  - 可转卖部分：会员随时可发起转卖换成现金，按当前转卖服务费率折算为预计兑付现金
    //  - 仅可领取部分：不会变成现金支出，但会消耗库存/商品成本，计入履约风险而非资金风险
    const creditOutstanding = get<{ resellable: number; redeemableOnly: number }>(
      `SELECT COALESCE(SUM(resellable_amount),0) AS resellable,
              COALESCE(SUM(remain_amount - resellable_amount),0) AS redeemableOnly
       FROM credit_record WHERE remain_amount > 0`,
    )!
    const resellFeeRate = Number(get<{ v: string }>("SELECT config_value AS v FROM system_config WHERE config_key = 'resell.service_fee_rate'")?.v ?? 20)
    const creditResellableFace = creditOutstanding.resellable
    const creditResellableEstimated = money(creditOutstanding.resellable * (1 - resellFeeRate / 100))
    const creditRedeemableLiability = money(creditOutstanding.redeemableOnly)

    const cashIn = orderIncome + serviceFee
    const cashOut = withdrawOut + resellPayout
    const fundPoolBalance = money(cashIn - cashOut)

    // 资金风险：真正可能在近期变成现金流出的负债（钱包余额/冻结 + 待结算佣金 + 转卖相关）
    const walletLiability = money(walletBalance + walletFrozen)
    const cashRiskExposure = money(walletLiability + commissionPending + resellPendingPayout + creditResellableEstimated)
    const riskGap = money(Math.max(0, cashRiskExposure - fundPoolBalance))
    const coverageRatio = cashRiskExposure > 0 ? fundPoolBalance / cashRiskExposure : 1
    const riskLevel = riskGap > 0 ? 'high' : coverageRatio < 1.5 ? 'medium' : 'low'

    // 履约风险：不直接消耗现金，但占用库存/商品成本的义务（与资金缺口分开看，避免混淆两类风险）
    const fulfillmentExposure = money(pendingShipAmount + creditRedeemableLiability)

    const net = cashIn - commissionOut - withdrawOut - resellPayout
    ok(res, {
      orderIncome, serviceFee, commissionOut, commissionPending, withdrawOut, pendingWithdraw,
      orderCount, memberOrderIncome, memberOrderCount, giftOrderIncome, giftOrderCount,
      pendingShipAmount, pendingShipCount, inTransitAmount, inTransitCount,
      pendingServiceFee, resellPayout, resellPendingPayout, resellActiveCount, resellCompletedCount,
      commissionAvailable, commissionPaid, walletBalance, walletFrozen, walletLiability,
      creditResellableFace, creditResellableEstimated, creditRedeemableLiability, resellFeeRate,
      cashIn, cashOut, fundPoolBalance,
      cashRiskExposure, fulfillmentExposure, riskGap, coverageRatio, riskLevel,
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
