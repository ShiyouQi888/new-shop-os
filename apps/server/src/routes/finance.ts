// ===== 财务管理 /api/v1/finance =====
import { Router } from 'express'
import { all, get, paginate } from '../db/index.js'
import { ok } from '../utils/response.js'
import { parsePagination, money } from '../utils/index.js'
import { requireAuth, requirePermission } from '../middlewares/auth.js'

const router = Router()
router.use(requireAuth, requirePermission('finance:view'))

/** GET /finance/overview 资金总览 */
router.get('/overview', async (_req, res, next) => {
  try {
    // 统计累计支付总额时包含已退款单，再单独减去退款；退款中订单仍属于已收款，同时计入待退款风险。
    const paidOrderWhere = 'status IN (1,2,3,5,6)'
    const orderIncome = ((await get<{ v: number }>(`SELECT COALESCE(SUM(pay_amount),0) AS v FROM "order" WHERE ${paidOrderWhere}`)))!.v
    const orderCount = ((await get<{ v: number }>(`SELECT COUNT(*) AS v FROM "order" WHERE ${paidOrderWhere}`)))!.v
    const memberOrderIncome = ((await get<{ v: number }>(`SELECT COALESCE(SUM(pay_amount),0) AS v FROM "order" WHERE ${paidOrderWhere} AND order_type = 1`)))!.v
    const memberOrderCount = ((await get<{ v: number }>(`SELECT COUNT(*) AS v FROM "order" WHERE ${paidOrderWhere} AND order_type = 1`)))!.v
    const giftOrderIncome = ((await get<{ v: number }>(`SELECT COALESCE(SUM(pay_amount),0) AS v FROM "order" WHERE ${paidOrderWhere} AND order_type = 2`)))!.v
    const giftOrderCount = ((await get<{ v: number }>(`SELECT COUNT(*) AS v FROM "order" WHERE ${paidOrderWhere} AND order_type = 2`)))!.v
    const pendingShipAmount = ((await get<{ v: number }>('SELECT COALESCE(SUM(pay_amount),0) AS v FROM "order" WHERE status = 1')))!.v
    const pendingShipCount = ((await get<{ v: number }>('SELECT COUNT(*) AS v FROM "order" WHERE status = 1')))!.v
    const inTransitAmount = ((await get<{ v: number }>('SELECT COALESCE(SUM(pay_amount),0) AS v FROM "order" WHERE status = 2')))!.v
    const inTransitCount = ((await get<{ v: number }>('SELECT COUNT(*) AS v FROM "order" WHERE status = 2')))!.v

    const serviceFee = ((await get<{ v: number }>('SELECT COALESCE(SUM(service_fee),0) AS v FROM resell_order WHERE status = 3')))!.v
    const pendingServiceFee = ((await get<{ v: number }>('SELECT COALESCE(SUM(service_fee),0) AS v FROM resell_order WHERE status IN (0,1,2)')))!.v
    const resellPayout = ((await get<{ v: number }>('SELECT COALESCE(SUM(settle_amount),0) AS v FROM resell_order WHERE status = 3')))!.v
    const resellPendingPayout = ((await get<{ v: number }>('SELECT COALESCE(SUM(settle_amount),0) AS v FROM resell_order WHERE status IN (0,1,2)')))!.v
    const resellActiveCount = ((await get<{ v: number }>('SELECT COUNT(*) AS v FROM resell_order WHERE status IN (0,1,2)')))!.v
    const resellCompletedCount = ((await get<{ v: number }>('SELECT COUNT(*) AS v FROM resell_order WHERE status = 3')))!.v

    const commissionOut = ((await get<{ v: number }>('SELECT COALESCE(SUM(amount),0) AS v FROM commission WHERE status IN (0,1,2)')))!.v
    const commissionPending = ((await get<{ v: number }>('SELECT COALESCE(SUM(amount),0) AS v FROM commission WHERE status = 0')))!.v
    const commissionAvailable = ((await get<{ v: number }>('SELECT COALESCE(SUM(amount),0) AS v FROM commission WHERE status = 1')))!.v
    const commissionPaid = ((await get<{ v: number }>('SELECT COALESCE(SUM(amount),0) AS v FROM commission WHERE status = 2')))!.v
    const withdrawOut = ((await get<{ v: number }>('SELECT COALESCE(SUM(actual_amount),0) AS v FROM withdraw WHERE status = 2')))!.v
    const pendingWithdraw = ((await get<{ v: number }>('SELECT COALESCE(SUM(actual_amount),0) AS v FROM withdraw WHERE status IN (0,1)')))!.v
    const refundOut = ((await get<{ v: number }>('SELECT COALESCE(SUM(pay_amount),0) AS v FROM "order" WHERE status = 6')))!.v
    const refundPending = ((await get<{ v: number }>('SELECT COALESCE(SUM(pay_amount),0) AS v FROM "order" WHERE status = 5')))!.v
    // 会员钱包才是"会员可提现/已冻结"的权威账本；佣金表状态只是钱包变动的成因之一（还有人工调整等），不能互相替代
    const walletBalance = ((await get<{ v: number }>('SELECT COALESCE(SUM(balance),0) AS v FROM wallet')))!.v
    const walletFrozen = ((await get<{ v: number }>('SELECT COALESCE(SUM(frozen),0) AS v FROM wallet')))!.v

    // 月度领货额度负债：未使用部分按是否可转卖拆成两类
    //  - 可转卖部分：会员随时可发起转卖换成现金，按当前转卖服务费率折算为预计兑付现金
    //  - 仅可领取部分：不会变成现金支出，但会消耗库存/商品成本，计入履约风险而非资金风险
    const creditRows = ((await get<{ resellable: number; redeemableOnly: number }>(
      `SELECT COALESCE(SUM(resellable_amount),0) AS resellable,
              COALESCE(SUM(remain_amount - resellable_amount),0) AS redeemableOnly
       FROM credit_record WHERE remain_amount > 0 AND status IN (0,1)`,
    )))!
    const resellFeeRate = Number(((await get<{ v: string }>("SELECT config_value AS v FROM system_config WHERE config_key = 'resell.service_fee_rate'")))?.v ?? 20)
    const shippingFee = Number(((await get<{ v: string }>("SELECT config_value AS v FROM system_config WHERE config_key = 'resell.shipping_fee'")))?.v ?? 10)
    const creditResellableFace = creditRows.resellable
    // 按每笔额度分别估算（每笔转卖各自扣一次快递费），避免只按总额度算比例而低估履约现金支出。
    const resellableCredits = (await all<{ value: number }>(
      'SELECT resellable_amount AS value FROM credit_record WHERE resellable_amount > 0 AND status IN (0,1)',
    ))
    const creditResellableEstimated = money(resellableCredits.reduce((sum, row) => {
      const fee = money(Number(row.value) * resellFeeRate / 100)
      return sum + Math.max(0, money(Number(row.value) - fee - shippingFee))
    }, 0))
    const creditRedeemableLiability = money(creditRows.redeemableOnly)

    // 转卖完成只把额度兑换成站内钱包余额，真实现金流出发生在后续提现；此处不能重复扣减。
    const cashIn = money(orderIncome)
    const cashOut = money(withdrawOut + refundOut)
    const fundPoolBalance = money(cashIn - cashOut)

    // 资金风险：真正可能在近期变成现金流出的负债（钱包余额/冻结 + 待结算佣金 + 转卖相关）
    const walletLiability = money(walletBalance + walletFrozen)
    const cashRiskExposure = money(walletLiability + commissionPending + resellPendingPayout + creditResellableEstimated + refundPending)
    const riskGap = money(Math.max(0, cashRiskExposure - fundPoolBalance))
    const coverageRatio = cashRiskExposure > 0 ? fundPoolBalance / cashRiskExposure : 1
    const riskLevel = riskGap > 0 ? 'high' : coverageRatio < 1.5 ? 'medium' : 'low'

    // 履约风险：不直接消耗现金，但占用库存/商品成本的义务（与资金缺口分开看，避免混淆两类风险）
    const fulfillmentExposure = money(pendingShipAmount + creditRedeemableLiability)

    // 这只是业务模型中的累计净现金流估算；不是银行余额、利润表或已对账资产。
    const net = money(cashIn - cashOut)
    ok(res, {
      orderIncome, serviceFee, commissionOut, commissionPending, withdrawOut, pendingWithdraw, refundOut, refundPending,
      orderCount, memberOrderIncome, memberOrderCount, giftOrderIncome, giftOrderCount,
      pendingShipAmount, pendingShipCount, inTransitAmount, inTransitCount,
      pendingServiceFee, resellPayout, resellPendingPayout, resellActiveCount, resellCompletedCount,
      commissionAvailable, commissionPaid, walletBalance, walletFrozen, walletLiability,
      creditResellableFace, creditResellableEstimated, creditRedeemableLiability, resellFeeRate,
      cashIn, cashOut, fundPoolBalance,
      cashRiskExposure, fulfillmentExposure, riskGap, coverageRatio, riskLevel,
      net,
    })
  } catch (e) { next(e) }
})

/** GET /finance/flows?page=&pageSize= 资金流水 */
router.get('/flows', async (req, res, next) => {
  try {
    const { page, pageSize } = parsePagination(req.query)
    const data = (await paginate(
      'SELECT id, flow_no AS flowNo, type, amount, balance, related_no AS relatedNo, remark, create_time AS createTime FROM finance_flow ORDER BY id DESC',
      'SELECT COUNT(*) AS c FROM finance_flow',
      [], page, pageSize,
    ))
    ok(res, data)
  } catch (e) { next(e) }
})

export default router
